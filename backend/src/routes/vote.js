const router = require("express").Router();
const jwtAuth = require("../middleware/jwtAuth");
const sigVerifier = require("../middleware/sigVerifier");
const { castVote, getVoteResults } = require("../controllers/voteController");

router.post("/", jwtAuth, sigVerifier, castVote);
router.get("/results", jwtAuth, getVoteResults);

module.exports = router;
