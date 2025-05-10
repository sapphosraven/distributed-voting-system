const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/db');

module.exports = sequelize.define('User', {
  email: { type: DataTypes.STRING, unique: true, allowNull: false },
  passwordHash: { type: DataTypes.STRING, allowNull: false }
});
