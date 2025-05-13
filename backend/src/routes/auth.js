const router = require("express").Router();
const jwtAuth = require("../middleware/jwtAuth");
const otpLimiter = require("../middleware/otpLimiter");
const {
  register,
  login,
  requestOtp,
  verifyOtp,
  changePassword,
} = require("../controllers/authController");

router.post("/register", register);
router.post("/login", login);
router.post("/request-otp", otpLimiter, requestOtp);
router.post("/verify-otp", verifyOtp);
router.post("/change-password", jwtAuth, changePassword);

module.exports = router;
