const router = require('express').Router();
const jwtAuth = require('../middleware/jwtAuth');
const otpLimiter = require('../middleware/otpLimiter');
const {
  register,
  login,
  requestOtp,
  verifyOtp
} = require('../controllers/authController');

router.post('/register', register);
router.post('/login', login);
router.post('/request-otp', otpLimiter, requestOtp);
router.post('/verify-otp', verifyOtp);

module.exports = router;
