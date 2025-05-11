const Election = require("../models/Election");
const { Op } = require("sequelize");

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

exports.createElection = async (req, res) => {
  try {
    console.log("CreateElection endpoint hit", req.body);
    const {
      title,
      startTime,
      endTime,
      isResultsVisible,
      allowedDomains,
      allowedEmails,
      candidates,
    } = req.body;
    const creatorEmail = req.user.email;
    // Validate required fields
    if (
      !title ||
      !startTime ||
      !endTime ||
      !candidates ||
      candidates.length < 2
    ) {
      return res.status(400).json({
        error:
          "title, startTime, endTime, and at least 2 candidates are required",
      });
    }
    // Validate time constraints
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = end - start;
    if (diffMs < 10 * 60 * 1000)
      return res
        .status(400)
        .json({ error: "Election must be at least 10 minutes long" });
    if (diffMs > 7 * 24 * 60 * 60 * 1000)
      return res
        .status(400)
        .json({ error: "Election cannot be longer than 7 days" });
    // Ensure creator is in allowedEmails
    let allowedEmailsFinal = allowedEmails || [];
    if (!allowedEmailsFinal.includes(creatorEmail))
      allowedEmailsFinal.push(creatorEmail);
    const election = await Election.create({
      title,
      startTime,
      endTime,
      isResultsVisible: !!isResultsVisible,
      allowedDomains: allowedDomains || [],
      allowedEmails: allowedEmailsFinal,
      candidates,
      creatorEmail,
    });
    console.log("Election created:", election.id);
    res.json({ message: "Election created", election });
  } catch (err) {
    console.error("CreateElection error:", err);
    res.status(500).json({ error: "Failed to create election" });
  }
};

exports.getElections = async (req, res) => {
  try {
    console.log("GetElections endpoint hit");
    const userEmail = req.user.email;
    const elections = await Election.findAll({
      order: [["startTime", "DESC"]],
    });
    // Filter by eligibility
    const eligible = elections.filter((e) => isUserEligible(e, userEmail));
    res.json({ elections: eligible });
  } catch (err) {
    console.error("GetElections error:", err);
    res.status(500).json({ error: "Failed to fetch elections" });
  }
};

exports.searchElections = async (req, res) => {
  try {
    const userEmail = req.user.email;
    const { q, creator } = req.query;
    let where = {};
    if (q) {
      where.title = { [Op.iLike]: `%${q}%` };
    }
    if (creator) {
      where.creatorEmail = creator;
    }
    const elections = await Election.findAll({
      where,
      order: [["startTime", "DESC"]],
    });
    // Filter by eligibility
    const eligible = elections.filter((e) => isUserEligible(e, userEmail));
    res.json({ elections: eligible });
  } catch (err) {
    console.error("SearchElections error:", err);
    res.status(500).json({ error: "Failed to search elections" });
  }
};
