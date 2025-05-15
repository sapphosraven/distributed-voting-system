const Vote = require("../models/Vote");
const Election = require("../models/Election");
const { encrypt } = require("../utils/rsa");
const { publishVoteReplication } = require("../utils/replication");
const { amILeader, getLeader } = require("../utils/raft");
const { getRedisTime } = require("../utils/time");
const { acquireLock, releaseLock } = require("../utils/lock");
const { requestConsensusTally } = require("../utils/tallyConsensus");
const { sign } = require("../utils/signer");
const os = require("os");

// Helper: check if user is eligible for an election
function isUserEligible(election, userEmail) {
  // If both allowedDomains and allowedEmails are empty, election is open to all
  if (
    (!election.allowedDomains || election.allowedDomains.length === 0) &&
    (!election.allowedEmails || election.allowedEmails.length === 0)
  ) {
    return true;
  }
  const domain = userEmail.split("@")[1];
  return (
    election.allowedEmails.includes(userEmail) ||
    election.allowedDomains.includes(domain) ||
    election.creatorEmail === userEmail
  );
}

exports.castVote = async (req, res) => {
  let lockKey;
  try {
    // Only leader can accept votes
    if (!amILeader()) {
      return res.status(503).json({
        error:
          "This node is not the leader. Please send your vote to the leader node.",
        leaderId: getLeader(),
      });
    }
    const userId = req.user.id;
    const userEmail = req.user.email;
    const { electionId, candidate, signature } = req.body;
    if (!electionId || !candidate || !signature) {
      return res
        .status(400)
        .json({ error: "electionId, candidate, and signature are required" });
    }
    // Acquire distributed lock for this user/election
    lockKey = `vote:${electionId}:${userId}`;
    const gotLock = await acquireLock(lockKey, 5000);
    if (!gotLock) {
      return res
        .status(429)
        .json({ error: "Voting in progress, please retry." });
    }
    const election = await Election.findByPk(electionId);
    if (!election) {
      await releaseLock(lockKey);
      return res.status(404).json({ error: "Election not found" });
    }
    if (!isUserEligible(election, userEmail)) {
      await releaseLock(lockKey);
      return res
        .status(403)
        .json({ error: "You are not eligible to vote in this election" });
    }
    // Check if user already voted
    const existing = await Vote.findOne({ where: { userId, electionId } });
    if (existing) {
      await releaseLock(lockKey);
      return res
        .status(409)
        .json({ error: "You have already voted in this election" });
    }
    // Check candidate is valid
    // Now candidates is an array of objects, so check by id
    const validCandidate = (election.candidates || []).find(
      (c) => c.id === candidate
    );
    if (!validCandidate) {
      await releaseLock(lockKey);
      return res.status(400).json({ error: "Invalid candidate" });
    }
    // Encrypt the vote (for demo, just encrypt candidate id)
    const encryptedPayload = encrypt(candidate);
    // Use Redis time for timestamp
    const redisTimestamp = await getRedisTime();
    // Prevent voting before election start
    const electionStart = new Date(election.startTime).getTime();
    const electionEnd = new Date(election.endTime).getTime();
    if (redisTimestamp < electionStart) {
      await releaseLock(lockKey);
      return res.status(403).json({
        error: `Voting has not started yet. Voting opens at ${new Date(
          election.startTime
        ).toLocaleString()}`,
      });
    }
    // Prevent voting after election end
    if (redisTimestamp >= electionEnd) {
      await releaseLock(lockKey);
      return res.status(403).json({
        error: `Election has ended. Voting is closed.`,
      });
    }
    // Store the vote (anonymity: do not expose candidate in response)
    // Sign the vote payload (candidate + electionId + userId for uniqueness)
    const votePayload = `${candidate}:${electionId}:${userId}`;
    const voteSignature = sign(votePayload);
    const vote = await Vote.create({
      candidate, // for demo, but in real system, only store encryptedPayload
      encryptedPayload,
      signature: voteSignature,
      userId,
      electionId,
      createdAt: new Date(redisTimestamp),
    });
    // Publish vote event for replication (leader only)
    await publishVoteReplication({
      userId,
      electionId,
      candidate,
      encryptedPayload,
      signature: voteSignature,
      timestamp: redisTimestamp,
      nodeId: process.env.NODE_ID,
    });
    console.log("Vote cast:", {
      userId,
      electionId,
      candidate,
      redisTimestamp,
    });
    await releaseLock(lockKey);
    res.json({ message: "Vote cast successfully", signature: voteSignature });
  } catch (err) {
    if (lockKey) await releaseLock(lockKey);
    console.error("CastVote error:", err);
    // Detailed debugging
    if (err && err.stack) {
      console.error("CastVote stack:", err.stack);
    }
    if (err && err.message) {
      console.error("CastVote message:", err.message);
    }
    if (err && err.cause) {
      console.error("CastVote cause:", err.cause);
    }
    // Log only defined variables to avoid ReferenceError
    const debugContext = {};
    if (typeof userId !== "undefined") debugContext.userId = userId;
    if (typeof userEmail !== "undefined") debugContext.userEmail = userEmail;
    if (typeof electionId !== "undefined") debugContext.electionId = electionId;
    if (typeof candidate !== "undefined") debugContext.candidate = candidate;
    if (typeof encryptedPayload !== "undefined")
      debugContext.encryptedPayload = encryptedPayload;
    if (typeof signature !== "undefined") debugContext.signature = signature;
    if (typeof votePayload !== "undefined")
      debugContext.votePayload = votePayload;
    if (typeof voteSignature !== "undefined")
      debugContext.voteSignature = voteSignature;
    if (typeof redisTimestamp !== "undefined")
      debugContext.redisTimestamp = redisTimestamp;
    if (typeof election !== "undefined") debugContext.election = election;
    console.error("CastVote debug context:", debugContext);
    res.status(500).json({ error: "Failed to cast vote" });
  }
};

exports.getVoteResults = async (req, res) => {
  try {
    const userId = req.user.id;
    const userEmail = req.user.email;
    const electionId = req.params.electionId;
    const election = await Election.findByPk(electionId);
    if (!election) return res.status(404).json({ error: "Election not found" });
    if (!isUserEligible(election, userEmail)) {
      return res.status(403).json({ error: "Not eligible for this election" });
    }
    // Use Redis time for now/end checks
    const now = await getRedisTime();
    const electionEnd = new Date(election.endTime).getTime();
    if (now >= electionEnd) {
      // Election ended: any eligible user can view results
      // Consensus tallying
      if (!amILeader()) {
        // Only leader coordinates consensus
        return res.status(503).json({
          error:
            "Only leader can provide results. Please query the leader node.",
        });
      }
      // Number of backend nodes (hardcoded for demo, or count from env)
      const nodeCount = 4;
      const responses = await requestConsensusTally(
        electionId,
        nodeCount,
        2000
      );
      // Tally responses by JSON string
      const tallyMap = {};
      for (const resp of responses) {
        const key = JSON.stringify(resp.tally);
        if (!tallyMap[key]) tallyMap[key] = [];
        tallyMap[key].push(resp.nodeId);
      }
      // Find majority tally
      let majorityTally = null;
      let maxCount = 0;
      for (const [tallyStr, nodes] of Object.entries(tallyMap)) {
        if (nodes.length > maxCount) {
          maxCount = nodes.length;
          majorityTally = JSON.parse(tallyStr);
        }
      }
      // Log mismatches if any
      if (Object.keys(tallyMap).length > 1) {
        console.warn("[CONSENSUS] Tally mismatch detected:", tallyMap);
      }
      if (!majorityTally) {
        return res.status(500).json({ error: "Consensus tally failed" });
      }
      // Return majority tally
      res.json({
        electionId,
        title: election.title,
        candidates: election.candidates.map((c) => ({
          id: c.id,
          name: c.name,
          party: c.party,
          description: c.description,
        })),
        tally: majorityTally,
        totalVotes: Object.values(majorityTally).reduce((a, b) => a + b, 0),
        endTime: election.endTime,
        consensusNodes: responses.map((r) => r.nodeId),
      });
      return;
    } else {
      // If results are hidden but user hasn't voted, show the vote-required message instead of results-hidden
      const vote = await Vote.findOne({ where: { userId, electionId } });
      if (!vote) {
        return res
          .status(403)
          .json({ error: "You must vote before viewing results" });
      }
      if (election.isResultsVisible) {
        // Election live, results visible: only users who have voted can view
        const votes = await Vote.findAll({ where: { electionId } });
        // Tally votes by candidate id
        const tally = {};
        for (const candidate of election.candidates) {
          tally[candidate.id] = 0;
        }
        for (const v of votes) {
          if (tally[v.candidate] !== undefined) tally[v.candidate]++;
        }
        res.json({
          electionId,
          title: election.title,
          candidates: election.candidates.map((c) => ({
            id: c.id,
            name: c.name,
            party: c.party,
            description: c.description,
          })),
          tally,
          totalVotes: votes.length,
          endTime: election.endTime,
          consensusNodes: [process.env.NODE_ID],
        });
        return;
      } else {
        // Election live, results not visible
        return res
          .status(403)
          .json({ error: "Results not visible until election ends" });
      }
    }
  } catch (err) {
    console.error("GetVoteResults error:", err);
    res.status(500).json({ error: "Failed to fetch results" });
  }
};
