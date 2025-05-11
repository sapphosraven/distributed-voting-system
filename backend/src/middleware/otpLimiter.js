// backend/src/middleware/otpLimiter.js
const rateLimit = require("express-rate-limit");

const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // max 3 requests per hour per email
  keyGenerator: (req) => req.body.email || req.ip,
  message: {
    status: 429,
    error:
      "Too many OTP requests for this account. Please try again after an hour.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = otpLimiter;
