const { DataTypes } = require("sequelize");
const { sequelize } = require("../utils/db");

module.exports = sequelize.define("Election", {
  title: { type: DataTypes.STRING, allowNull: false },
  startTime: { type: DataTypes.DATE, allowNull: false },
  endTime: { type: DataTypes.DATE, allowNull: false },
  isResultsVisible: { type: DataTypes.BOOLEAN, defaultValue: false },
  allowedDomains: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: false,
    defaultValue: [],
  },
  allowedEmails: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: false,
    defaultValue: [],
  },
  candidates: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: false,
    defaultValue: [],
  },
  creatorEmail: { type: DataTypes.STRING, allowNull: false },
});
