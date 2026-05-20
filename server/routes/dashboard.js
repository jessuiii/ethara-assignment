const express = require('express');
const { Op, fn, col, literal } = require('sequelize');
const { Task, ProjectMember, User, Project } = require('../models');
const auth = require('../middleware/auth');

const router = express.Router();

// All dashboard routes require authentication
router.use(auth);

// ──────────────────────────────────────────────
// GET /api/dashboard — Aggregated stats for the current user's projects
// ──────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    // Get all project IDs the user belongs to
    const memberships = await ProjectMember.findAll({
      where: { user_id: req.user.id },
      attributes: ['project_id'],
    });

    const projectIds = memberships.map((m) => m.project_id);

    if (projectIds.length === 0) {
      return res.json({
        totalTasks: 0,
        tasksByStatus: { todo: 0, in_progress: 0, done: 0 },
        tasksPerUser: [],
        overdueTasks: 0,
      });
    }

    const taskFilter = { project_id: { [Op.in]: projectIds } };

    // Total tasks
    const totalTasks = await Task.count({ where: taskFilter });

    // Tasks by status
    const statusCounts = await Task.findAll({
      where: taskFilter,
      attributes: ['status', [fn('COUNT', col('id')), 'count']],
      group: ['status'],
      raw: true,
    });

    const tasksByStatus = { todo: 0, in_progress: 0, done: 0 };
    statusCounts.forEach((row) => {
      tasksByStatus[row.status] = parseInt(row.count, 10);
    });

    // Tasks per user (only assigned tasks)
    const tasksPerUser = await Task.findAll({
      where: {
        ...taskFilter,
        assigned_to: { [Op.ne]: null },
      },
      attributes: ['assigned_to', [fn('COUNT', col('Task.id')), 'count']],
      include: [
        {
          model: User,
          as: 'assignee',
          attributes: ['id', 'name', 'email'],
        },
      ],
      group: ['assigned_to', 'assignee.id', 'assignee.name', 'assignee.email'],
      raw: true,
      nest: true,
    });

    const tasksPerUserFormatted = tasksPerUser.map((row) => ({
      id: row.assignee.id,
      name: row.assignee.name,
      email: row.assignee.email,
      count: parseInt(row.count, 10),
    }));

    // Overdue tasks (due_date < today AND status != 'done')
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdueTasks = await Task.count({
      where: {
        ...taskFilter,
        due_date: { [Op.lt]: today },
        status: { [Op.ne]: 'done' },
      },
    });

    res.json({
      totalTasks,
      tasksByStatus,
      tasksPerUser: tasksPerUserFormatted,
      overdueTasks,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
