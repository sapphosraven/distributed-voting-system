const router = require("express").Router();
const { amILeader, getLeader, nodeId } = require("../utils/raft");

router.get("/", (req, res) => {
  res.json({
    nodeId,
    isLeader: amILeader(),
    leaderId: getLeader(),
  });
});

module.exports = router;
