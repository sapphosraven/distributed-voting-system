// backend/src/utils/lock.js
// Redis-based distributed lock for voting atomicity
const { redis } = require("./db");

async function acquireLock(key, ttl = 5000) {
  const lockKey = `lock:${key}`;
  const result = await redis.set(lockKey, "locked", { NX: true, PX: ttl });
  return !!result;
}

async function releaseLock(key) {
  const lockKey = `lock:${key}`;
  await redis.del(lockKey);
}

module.exports = { acquireLock, releaseLock };
