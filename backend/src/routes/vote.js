const router = require('express').Router();
const voteController = require('../controllers/voteController');
const jwtAuth = require('../middleware/jwtAuth');
const sigVerifier = require('../middleware/sigVerifier');

// Example protected vote route
router.post('/cast', jwtAuth, sigVerifier, voteController.castVote);
router.get('/results/:electionId', jwtAuth, voteController.getVoteResults);

module.exports = router;
