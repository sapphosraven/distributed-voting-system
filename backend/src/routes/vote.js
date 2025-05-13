const router = require("express").Router();
const voteController = require("../controllers/voteController");
const jwtAuth = require("../middleware/jwtAuth");
const sigVerifier = require("../middleware/sigVerifier");
const otpEnforced = require("../middleware/otpEnforced");

// Example protected vote route
router.post(
  "/cast",
  jwtAuth,
  otpEnforced,
  sigVerifier,
  voteController.castVote
);
router.get(
  "/results/:electionId",
  jwtAuth,
  otpEnforced,
  voteController.getVoteResults
);

module.exports = router;
