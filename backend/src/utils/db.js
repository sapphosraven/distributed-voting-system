const Sequelize = require('sequelize');
const Redis = require('ioredis');

const sequelize = new Sequelize(process.env.POSTGRES_URI);
const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT
});

exports.initDb = async () => {
  // stub: await sequelize.sync();
};

exports.sequelize = sequelize;
exports.redis = redis;
