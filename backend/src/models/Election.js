const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/db');

module.exports = sequelize.define('Election', {
  title: { type: DataTypes.STRING, allowNull: false },
  startTime: { type: DataTypes.DATE, allowNull: false },
  endTime: { type: DataTypes.DATE, allowNull: false },
  isResultsVisible: { type: DataTypes.BOOLEAN, defaultValue: false }
});
