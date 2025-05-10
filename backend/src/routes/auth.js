const express = require('express');
const { register, login, requestOtp, verifyOtp } = require('../controllers/authController');
const jwtAuth = require('../middleware/jwtAuth');
const otpLimiter = require('../middleware/otpLimiter');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/request-otp', otpLimiter, requestOtp); // ← RATE-LIMITED
router.post('/verify-otp', verifyOtp);

module.exports = router;
