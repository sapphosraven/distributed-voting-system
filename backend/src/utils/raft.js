// backend/src/utils/raft.js
// Simplified Raft: leader election, leader state, and pub/sub for consensus
const { redis } = require("./db");

let isLeader = false;
let leaderId = null;
let nodeId = process.env.NODE_ID || Math.random().toString(36).substring(2, 10);
let lastPrintedLeader = null;
let lastRefreshedLogTime = 0;
const REFRESHED_LOG_INTERVAL = 30000; // 30 seconds

// Try to become leader by setting a Redis key with TTL
async function tryBecomeLeader() {
  try {
    // Always check current leader
    const currentLeader = await redis.get("voting-leader");
    if (currentLeader === nodeId) {
      // Refresh leadership (extend TTL)
      await redis.set("voting-leader", nodeId, { XX: true, EX: 10 });
      isLeader = true;
      leaderId = nodeId;
      const now = Date.now();
      if (lastPrintedLeader !== nodeId) {
        console.log(`[RAFT] This node (${nodeId}) is now the leader.`);
        lastPrintedLeader = nodeId;
        lastRefreshedLogTime = now;
      } else if (now - lastRefreshedLogTime > REFRESHED_LOG_INTERVAL) {
        console.log(`[RAFT] Refreshed leadership for node (${nodeId})`);
        lastRefreshedLogTime = now;
      }
    } else if (!currentLeader) {
      // No leader, try to become leader
      const result = await redis.set("voting-leader", nodeId, {
        NX: true,
        EX: 10,
      });
      if (result) {
        isLeader = true;
        leaderId = nodeId;
        if (lastPrintedLeader !== nodeId) {
          console.log(`[RAFT] This node (${nodeId}) is now the leader.`);
          lastPrintedLeader = nodeId;
          lastRefreshedLogTime = Date.now();
        }
      } else {
        isLeader = false;
        leaderId = await redis.get("voting-leader");
        if (lastPrintedLeader !== leaderId) {
          console.log(`[RAFT] Current leader is ${leaderId}`);
          lastPrintedLeader = leaderId;
        }
      }
    } else {
      // Another node is leader
      isLeader = false;
      leaderId = currentLeader;
      if (lastPrintedLeader !== currentLeader) {
        console.log(`[RAFT] Current leader is ${currentLeader}`);
        lastPrintedLeader = currentLeader;
      }
    }
  } catch (err) {
    console.error(`[RAFT] Error in leader election:`, err);
    isLeader = false;
    leaderId = null;
  }
}

// Call this periodically to maintain leadership
setInterval(tryBecomeLeader, 5000); // 5s interval for faster convergence

function getLeader() {
  return leaderId;
}

function amILeader() {
  return isLeader;
}

module.exports = { tryBecomeLeader, getLeader, amILeader, nodeId };
