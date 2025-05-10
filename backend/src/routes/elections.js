const express = require('express');
const { createElection, getElections } = require('../controllers/electionController');
const jwtAuth = require('../middleware/jwtAuth');

const router = express.Router();

router.post('/', jwtAuth, createElection);
router.get('/', jwtAuth, getElections);

module.exports = router;
