const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const {
  generateOtp,
  sendOtpEmail,
  storeOtp,
  verifyOtp,
} = require("../utils/otp");
const { redis } = require("../utils/db");

const OTP_DISABLED = process.env.OTP_DISABLED === "true";

exports.register = async (req, res) => {
  try {
    console.log("Register endpoint hit", req.body);
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: "User already exists" });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ email, passwordHash });
    console.log("User registered:", user.email);
    res.json({ message: "User registered", email: user.email });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Registration failed" });
  }
};

exports.login = async (req, res) => {
  try {
    console.log("Login endpoint hit", req.body);
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });
    if (OTP_DISABLED) {
      console.log("OTP is disabled, issuing JWT immediately");
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );
      // Fallback: always send a response
      if (!token) {
        return res.status(500).json({ error: "Failed to generate JWT" });
      }
      return res.json({ token });
    }
    // Generate OTP and store login session in Redis
    const otp = generateOtp();
    await storeOtp(email, otp);
    await sendOtpEmail(email, otp);
    // Store a temporary login session in Redis (expires in 10 min)
    await redis.set(`login:${email}`, "pending", { EX: 600 });
    res.json({
      message: "OTP sent to email. Please verify OTP to complete login.",
      email,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
};

exports.requestOtp = async (req, res) => {
  if (OTP_DISABLED) {
    console.log("OTP temporarily disabled (requestOtp)");
    return res.json({ message: "OTP is temporarily disabled for testing." });
  }
  try {
    console.log("Request OTP endpoint hit", req.body);
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email required" });
    const otp = generateOtp();
    await storeOtp(email, otp);
    await sendOtpEmail(email, otp);
    console.log("OTP sent to:", email, "OTP:", otp);
    res.json({ message: "OTP sent" });
  } catch (err) {
    console.error("Request OTP error:", err);
    res.status(500).json({ error: "OTP request failed" });
  }
};

exports.verifyOtp = async (req, res) => {
  if (OTP_DISABLED) {
    console.log("OTP temporarily disabled (verifyOtp)");
    // For testing, issue JWT directly
    const { email } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ error: "User not found" });
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    return res.json({ token });
  }
  try {
    console.log("Verify OTP endpoint hit", req.body);
    const { email, otp } = req.body;
    if (!email || !otp)
      return res.status(400).json({ error: "Email and OTP required" });
    const valid = await verifyOtp(email, otp);
    if (!valid) return res.status(401).json({ error: "Invalid OTP" });
    // Mark login as verified in Redis
    await redis.set(`login:${email}`, "verified", { EX: 3600 });
    // Issue JWT
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ error: "User not found" });
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    res.json({ token });
  } catch (err) {
    console.error("Verify OTP error:", err);
    res.status(500).json({ error: "OTP verification failed" });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { oldPassword, newPassword, otp } = req.body;
    if (!oldPassword || !newPassword || !otp) {
      return res
        .status(400)
        .json({ error: "oldPassword, newPassword, and otp required" });
    }
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    // Verify OTP
    const validOtp = await verifyOtp(user.email, otp);
    if (!validOtp) return res.status(401).json({ error: "Invalid OTP" });
    // Verify old password
    const validPw = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!validPw)
      return res.status(401).json({ error: "Old password incorrect" });
    // Update password
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();
    console.log("Password changed for:", user.email);
    res.json({ message: "Password changed successfully" });
  } catch (err) {
    console.error("ChangePassword error:", err);
    res.status(500).json({ error: "Failed to change password" });
  }
};
