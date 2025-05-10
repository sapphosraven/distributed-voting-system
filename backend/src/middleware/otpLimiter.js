const rateLimit = require('express-rate-limit');
module.exports = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: 'Too many OTP requests—try again later',
  standardHeaders: true,
  legacyHeaders: false
});
