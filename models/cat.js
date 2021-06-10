'use strict';
const {
  Model
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Cat extends Model {
    static associate(models) {
        this.belongsTo(models.User);
    }
  };
  Cat.init({
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'Cat',
  });
  return Cat;
};