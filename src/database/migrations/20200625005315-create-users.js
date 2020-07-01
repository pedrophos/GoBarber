'use strict';

const sequelize = require("sequelize");

module.exports = {
  up: async (queryInterface, Sequelize) => {
      return await queryInterface.createTable('users', {
        id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          autoIncrement: true,
          primaryKey: true
        },
        name: {
          type: Sequelize.STRING,
          allowNull: false
        },
        email: {
          type: Sequelize.STRING,
          allowNull: false,
          unique: true
        },
        password_hash: {
          type: Sequelize.STRING,
          allowNull: false
        },
        provider: {
          type: sequelize.BOOLEAN,
          defaltValue: false,
          allowNull: false
        },
        created_at:{
          type: Sequelize.DATE,
          allowNull: false,
        },
        updated_at:{
          type: Sequelize.DATE,
          allowNull: false,
        }

      });
  },

  down: async (queryInterface) => {
     return await queryInterface.dropTable('users');
  }
};
