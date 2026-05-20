const sequelize = require('../config/database');
const User = require('./User');
const Project = require('./Project');
const ProjectMember = require('./ProjectMember');
const Task = require('./Task');

// ── User <-> Project (creator) ──
User.hasMany(Project, { foreignKey: 'created_by', as: 'createdProjects' });
Project.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

// ── User <-> Project (membership, through ProjectMember) ──
User.belongsToMany(Project, {
  through: ProjectMember,
  foreignKey: 'user_id',
  otherKey: 'project_id',
  as: 'projects',
});
Project.belongsToMany(User, {
  through: ProjectMember,
  foreignKey: 'project_id',
  otherKey: 'user_id',
  as: 'members',
});

// ── Direct associations on ProjectMember for eager loading ──
ProjectMember.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
ProjectMember.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });
User.hasMany(ProjectMember, { foreignKey: 'user_id', as: 'memberships' });
Project.hasMany(ProjectMember, { foreignKey: 'project_id', as: 'projectMembers' });

// ── Task associations ──
Task.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });
Project.hasMany(Task, { foreignKey: 'project_id', as: 'tasks' });

Task.belongsTo(User, { foreignKey: 'assigned_to', as: 'assignee' });
User.hasMany(Task, { foreignKey: 'assigned_to', as: 'assignedTasks' });

Task.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
User.hasMany(Task, { foreignKey: 'created_by', as: 'createdTasks' });

module.exports = {
  sequelize,
  User,
  Project,
  ProjectMember,
  Task,
};
