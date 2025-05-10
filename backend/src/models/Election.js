const { DataTypes } = require("sequelize");
const { sequelize } = require("../utils/db");
const Vote = require("./Vote");

const Election = sequelize.define("Election", {
  title: { type: DataTypes.STRING, allowNull: false },
  startTime: { type: DataTypes.DATE, allowNull: false },
  endTime: { type: DataTypes.DATE, allowNull: false },
  isResultsVisible: { type: DataTypes.BOOLEAN, defaultValue: false },
});

Election.hasMany(Vote, { foreignKey: "electionId", onDelete: "CASCADE" });

module.exports = Election;
