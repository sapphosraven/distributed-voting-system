const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/db');
const Election = require('./Election');
const User = require('./User');

const Vote = sequelize.define('Vote', {
  candidate: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

Vote.belongsTo(Election);
Vote.belongsTo(User);

module.exports = Vote;
