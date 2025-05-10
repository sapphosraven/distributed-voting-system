const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/db');

const Election = sequelize.define('Election', {
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  startTime: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  endTime: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  isLive: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  isResultsVisible: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
});

module.exports = Election;
