const Vote = require("../models/Vote");
const Election = require("../models/Election");
const { encrypt } = require("../utils/rsa");

// Helper: check if user is eligible for an election
function isUserEligible(election, userEmail) {
  const domain = userEmail.split("@")[1];
  return (
    election.allowedEmails.includes(userEmail) ||
    election.allowedDomains.includes(domain) ||
    election.creatorEmail === userEmail
  );
}

exports.castVote = async (req, res) => {
  try {
    const userId = req.user.id;
    const userEmail = req.user.email;
    const { electionId, candidate, signature } = req.body;
    if (!electionId || !candidate || !signature) {
      return res
        .status(400)
        .json({ error: "electionId, candidate, and signature are required" });
    }
    const election = await Election.findByPk(electionId);
    if (!election) return res.status(404).json({ error: "Election not found" });
    if (!isUserEligible(election, userEmail)) {
      return res
        .status(403)
        .json({ error: "You are not eligible to vote in this election" });
    }
    // Check if user already voted
    const existing = await Vote.findOne({ where: { userId, electionId } });
    if (existing)
      return res
        .status(409)
        .json({ error: "You have already voted in this election" });
    // Check candidate is valid
    if (!election.candidates.includes(candidate)) {
      return res.status(400).json({ error: "Invalid candidate" });
    }
    // Encrypt the vote (for demo, just encrypt candidate)
    const encryptedPayload = encrypt(candidate);
    // Store the vote (anonymity: do not expose candidate in response)
    const vote = await Vote.create({
      candidate, // for demo, but in real system, only store encryptedPayload
      encryptedPayload,
      signature,
      userId,
      electionId,
    });
    console.log("Vote cast:", { userId, electionId, candidate });
    res.json({ message: "Vote cast successfully" });
  } catch (err) {
    console.error("CastVote error:", err);
    res.status(500).json({ error: "Failed to cast vote" });
  }
};

exports.getVoteResults = async (req, res) => {
  // stub: read tallies from Redis and/or Postgres
};
