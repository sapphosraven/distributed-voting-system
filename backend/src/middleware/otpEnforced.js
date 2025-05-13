// backend/src/middleware/otpEnforced.js
// Middleware to enforce OTP verification after login
const { redis } = require("../utils/db");

module.exports = async (req, res, next) => {
  const user = req.user;
  if (!user || !user.email) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  // If OTP is disabled, skip check
  if (process.env.OTP_DISABLED === "true") return next();
  try {
    const status = await redis.get(`login:${user.email}`);
    if (status !== "verified") {
      return res
        .status(401)
        .json({
          error: "OTP verification required. Please verify OTP after login.",
        });
    }
    return next();
  } catch (err) {
    return res.status(500).json({ error: "OTP verification check failed" });
  }
};
