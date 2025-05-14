// backend/src/utils/tallyConsensus.js
// Distributed consensus for vote tallying using Redis pub/sub
const { createClient } = require("redis");
const { nodeId } = require("./raft");
const Vote = require("../models/Vote");
const Election = require("../models/Election");
const { v4: uuidv4 } = require("uuid");

const redisHost = process.env.REDIS_HOST || "redis";
const redisPort = process.env.REDIS_PORT || 6379;
const tallyRequestChannel = "votes:tally:request";
const tallyResponseChannel = "votes:tally:response";

const pub = createClient({ url: `redis://${redisHost}:${redisPort}` });
const sub = createClient({ url: `redis://${redisHost}:${redisPort}` });

async function initTallyConsensus(onTallyRequest) {
  await pub.connect();
  await sub.connect();
  await sub.subscribe(tallyRequestChannel, async (message) => {
    try {
      const { requestId, electionId } = JSON.parse(message);
      console.log(
        `[CONSENSUS] Node ${nodeId} received tally request for election ${electionId} (requestId: ${requestId})`
      );
      // Compute local tally
      const election = await Election.findByPk(electionId);
      if (!election) return;
      const votes = await Vote.findAll({ where: { electionId } });
      const tally = {};
      for (const candidate of election.candidates) tally[candidate.id] = 0;
      for (const v of votes)
        if (tally[v.candidate] !== undefined) tally[v.candidate]++;
      // Respond with tally
      await pub.publish(
        tallyResponseChannel,
        JSON.stringify({ requestId, nodeId, tally })
      );
      console.log(
        `[CONSENSUS] Node ${nodeId} published tally response for election ${electionId} (requestId: ${requestId})`
      );
    } catch (err) {
      console.error("[CONSENSUS] Error handling tally request:", err);
    }
  });
  if (onTallyRequest) onTallyRequest();
  console.log(`[CONSENSUS] Subscribed to tally requests`);
}

async function requestConsensusTally(electionId, nodeCount, timeoutMs = 2000) {
  const requestId = uuidv4();
  const responses = [];
  let resolveFn;
  const promise = new Promise((resolve) => (resolveFn = resolve));
  const tempSub = createClient({ url: `redis://${redisHost}:${redisPort}` });
  await tempSub.connect();
  await tempSub.subscribe(tallyResponseChannel, (message) => {
    try {
      const resp = JSON.parse(message);
      if (resp.requestId === requestId) {
        responses.push(resp);
        console.log(
          `[CONSENSUS] Leader received tally response from node ${resp.nodeId} for election ${electionId} (requestId: ${requestId})`
        );
        if (responses.length >= nodeCount) {
          resolveFn(responses);
        }
      }
    } catch (err) {
      console.error("[CONSENSUS] Error parsing tally response:", err);
    }
  });
  // Publish tally request
  await pub.publish(
    tallyRequestChannel,
    JSON.stringify({ requestId, electionId })
  );
  console.log(
    `[CONSENSUS] Leader published tally request for election ${electionId} (requestId: ${requestId})`
  );
  // Wait for responses or timeout
  setTimeout(() => resolveFn(responses), timeoutMs);
  const result = await promise;
  await tempSub.unsubscribe(tallyResponseChannel);
  await tempSub.quit();
  return result;
}

module.exports = { initTallyConsensus, requestConsensusTally };
