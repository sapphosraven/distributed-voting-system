const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const {
  generateOtp,
  sendOtpEmail,
  storeOtp,
  verifyOtp,
} = require("../utils/otp");

exports.register = async (req, res) => {
  try {
    console.log("Register endpoint hit", req.body);
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "Email and password required" });
    const existing = await User.findOne({ where: { email } });
    if (existing) return res.status(409).json({ error: "User already exists" });
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
    // Issue JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    console.log("Login success:", user.email);
    res.json({ token });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
};

exports.requestOtp = async (req, res) => {
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
  try {
    console.log("Verify OTP endpoint hit", req.body);
    const { email, otp } = req.body;
    if (!email || !otp)
      return res.status(400).json({ error: "Email and OTP required" });
    const valid = await verifyOtp(email, otp);
    if (!valid) return res.status(401).json({ error: "Invalid OTP" });
    console.log("OTP verified for:", email);
    res.json({ message: "OTP verified" });
  } catch (err) {
    console.error("Verify OTP error:", err);
    res.status(500).json({ error: "OTP verification failed" });
  }
};
