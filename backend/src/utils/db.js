// This file is responsible for connecting to the database and syncing the models.
// It uses Sequelize as the ORM to interact with the PostgreSQL database.
// It also exports the sequelize instance and a function to initialize the database.
const { Sequelize } = require("sequelize");
const { createClient } = require("redis");

const sequelize = new Sequelize(
  process.env.POSTGRES_DB || "voting",
  process.env.POSTGRES_USER || "user",
  process.env.POSTGRES_PASSWORD || "pass",
  {
    host: process.env.POSTGRES_HOST || "voting_postgres",
    dialect: "postgres",
    logging: false,
  }
);

// Redis client setup
const redis = createClient({
  url: `redis://${process.env.REDIS_HOST || "redis"}:${
    process.env.REDIS_PORT || 6379
  }`,
});

redis.on("connect", () => console.log("Redis connected"));
redis.on("error", (err) => console.error("Redis error:", err));

(async () => {
  try {
    await redis.connect();
  } catch (err) {
    console.error("Failed to connect to Redis:", err);
  }
})();

// Helper to sync DB (called from index.js)
async function initDb() {
  await sequelize.sync({ alter: true }); // Use { force: true } only for dev
  console.log("Database synced");
}

module.exports = { sequelize, initDb, redis };
