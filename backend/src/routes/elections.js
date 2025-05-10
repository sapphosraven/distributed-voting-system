const router = require('express').Router();
const jwtAuth = require('../middleware/jwtAuth');
const {
  createElection,
  getElections
} = require('../controllers/electionController');

router.post('/', jwtAuth, createElection);
router.get('/', jwtAuth, getElections);

module.exports = router;
