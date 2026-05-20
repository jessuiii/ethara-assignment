const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ProjectMember = sequelize.define(
  'ProjectMember',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    project_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'projects',
        key: 'id',
      },
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    role: {
      type: DataTypes.ENUM('admin', 'member'),
      allowNull: false,
      defaultValue: 'member',
      validate: {
        isIn: {
          args: [['admin', 'member']],
          msg: 'Role must be either admin or member',
        },
      },
    },
  },
  {
    tableName: 'project_members',
    timestamps: true,
    createdAt: 'joined_at',
    updatedAt: false,
    indexes: [
      {
        unique: true,
        fields: ['project_id', 'user_id'],
        name: 'unique_project_user',
      },
    ],
  }
);

module.exports = ProjectMember;
