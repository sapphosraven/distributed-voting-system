// backend/src/utils/time.js
// Use Redis server time for distributed time sync
const { redis } = require("./db");

async function getRedisTime() {
  const timeArr = await redis.time();
  // Returns [seconds, microseconds]
  return (
    parseInt(timeArr[0], 10) * 1000 +
    Math.floor(parseInt(timeArr[1], 10) / 1000)
  );
}

module.exports = { getRedisTime };
