// backend/src/models/User.js
const { DataTypes } = require("sequelize");
const { sequelize } = require("../utils/db");

const User = sequelize.define("User", {
  email: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
  },
  passwordHash: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

User.hasMany(require("./Vote"), { foreignKey: "userId", onDelete: "CASCADE" });

module.exports = User;
