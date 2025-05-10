const express = require('express');
const { castVote, getVoteResults } = require('../controllers/voteController');
const jwtAuth = require('../middleware/jwtAuth');

const router = express.Router();

router.post('/', jwtAuth, castVote);
router.get('/results', jwtAuth, getVoteResults);

module.exports = router;
