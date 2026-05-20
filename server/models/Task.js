const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Task = sequelize.define(
  'Task',
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
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Task title cannot be empty' },
        len: { args: [1, 255], msg: 'Task title must be between 1 and 255 characters' },
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: '',
    },
    status: {
      type: DataTypes.ENUM('todo', 'in_progress', 'done'),
      allowNull: false,
      defaultValue: 'todo',
      validate: {
        isIn: {
          args: [['todo', 'in_progress', 'done']],
          msg: 'Status must be todo, in_progress, or done',
        },
      },
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high'),
      allowNull: false,
      defaultValue: 'medium',
      validate: {
        isIn: {
          args: [['low', 'medium', 'high']],
          msg: 'Priority must be low, medium, or high',
        },
      },
    },
    due_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    assigned_to: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
  },
  {
    tableName: 'tasks',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

module.exports = Task;
