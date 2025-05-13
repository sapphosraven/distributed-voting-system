const router = require("express").Router();
const jwtAuth = require("../middleware/jwtAuth");
const otpEnforced = require("../middleware/otpEnforced");
const {
  createElection,
  getElections,
  searchElections,
} = require("../controllers/electionController");

router.post("/", jwtAuth, otpEnforced, createElection);
router.get("/", jwtAuth, otpEnforced, getElections);
router.get("/search", jwtAuth, otpEnforced, searchElections);

module.exports = router;
