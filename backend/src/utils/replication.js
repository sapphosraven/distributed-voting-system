// backend/src/utils/replication.js
// Simple replication: leader publishes vote events, all nodes subscribe and log/replicate
const { createClient } = require("redis");
const { amILeader, nodeId } = require("./raft");

// Use a separate Redis client for pub/sub
defaultChannel = "votes:replicate";
const pub = createClient({
  url: `redis://${process.env.REDIS_HOST || "redis"}:${
    process.env.REDIS_PORT || 6379
  }`,
});
const sub = createClient({
  url: `redis://${process.env.REDIS_HOST || "redis"}:${
    process.env.REDIS_PORT || 6379
  }`,
});

let onVoteReplicated = (vote) => {
  // Default: log only
  console.log(`[REPLICATION] Vote replicated:`, vote);
};

async function initReplication(channel = defaultChannel, handler) {
  await pub.connect();
  await sub.connect();
  if (handler) onVoteReplicated = handler;
  await sub.subscribe(channel, (message) => {
    try {
      const vote = JSON.parse(message);
      onVoteReplicated(vote);
    } catch (err) {
      console.error("[REPLICATION] Failed to parse vote event:", err);
    }
  });
  console.log(`[REPLICATION] Subscribed to channel: ${channel}`);
}

async function publishVoteReplication(vote, channel = defaultChannel) {
  if (!amILeader()) return;
  try {
    await pub.publish(channel, JSON.stringify(vote));
    console.log(`[REPLICATION] Published vote event to channel: ${channel}`);
  } catch (err) {
    console.error("[REPLICATION] Failed to publish vote event:", err);
  }
}

module.exports = { initReplication, publishVoteReplication };
