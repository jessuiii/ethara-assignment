const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { Task, User, Project } = require('../models');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

const router = express.Router({ mergeParams: true });

// All task routes require authentication
router.use(auth);

// ──────────────────────────────────────────────
// GET /api/projects/:projectId/tasks — List tasks with optional filters
// ──────────────────────────────────────────────
router.get(
  '/',
  [
    param('projectId').isUUID().withMessage('Invalid project ID'),
    query('status')
      .optional()
      .isIn(['todo', 'in_progress', 'done'])
      .withMessage('Status must be todo, in_progress, or done'),
    query('priority')
      .optional()
      .isIn(['low', 'medium', 'high'])
      .withMessage('Priority must be low, medium, or high'),
    query('assigned_to')
      .optional()
      .isUUID()
      .withMessage('assigned_to must be a valid UUID'),
  ],
  roleCheck('admin', 'member'),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array().map((e) => e.msg).join('. ') });
      }

      const where = { project_id: req.params.projectId };
      const userRole = req.membership.role;

      // Members should only see tasks assigned to themselves.
      if (userRole === 'member') {
        where.assigned_to = req.user.id;
      }

      // Apply optional filters
      if (req.query.status) where.status = req.query.status;
      if (req.query.priority) where.priority = req.query.priority;
      if (req.query.assigned_to) {
        // Members cannot override the self-assigned visibility filter.
        if (userRole === 'member' && req.query.assigned_to !== req.user.id) {
          return res.status(403).json({
            message: 'Members can only filter tasks assigned to themselves',
          });
        }
        where.assigned_to = req.query.assigned_to;
      }

      const tasks = await Task.findAll({
        where,
        include: [
          { model: User, as: 'assignee', attributes: ['id', 'name', 'email'] },
          { model: User, as: 'creator', attributes: ['id', 'name', 'email'] },
        ],
        order: [
          ['priority', 'ASC'], // high first when ordered by enum: high=0 contextually, but stored as string
          ['created_at', 'DESC'],
        ],
      });

      res.json({ tasks });
    } catch (error) {
      next(error);
    }
  }
);

// ──────────────────────────────────────────────
// GET /api/projects/:projectId/tasks/:taskId — Get single task
// ──────────────────────────────────────────────
router.get(
  '/:taskId',
  [
    param('projectId').isUUID().withMessage('Invalid project ID'),
    param('taskId').isUUID().withMessage('Invalid task ID'),
  ],
  roleCheck('admin', 'member'),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array().map((e) => e.msg).join('. ') });
      }

      const taskWhere = { id: req.params.taskId, project_id: req.params.projectId };
      if (req.membership.role === 'member') {
        taskWhere.assigned_to = req.user.id;
      }

      const task = await Task.findOne({
        where: taskWhere,
        include: [
          { model: User, as: 'assignee', attributes: ['id', 'name', 'email'] },
          { model: User, as: 'creator', attributes: ['id', 'name', 'email'] },
          { model: Project, as: 'project', attributes: ['id', 'name'] },
        ],
      });

      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }

      res.json({ task });
    } catch (error) {
      next(error);
    }
  }
);

// ──────────────────────────────────────────────
// POST /api/projects/:projectId/tasks — Create task (admin only)
// ──────────────────────────────────────────────
router.post(
  '/',
  [
    param('projectId').isUUID().withMessage('Invalid project ID'),
    body('title')
      .trim()
      .notEmpty()
      .withMessage('Task title is required')
      .isLength({ max: 255 })
      .withMessage('Task title must be at most 255 characters'),
    body('description')
      .optional()
      .trim(),
    body('status')
      .optional()
      .isIn(['todo', 'in_progress', 'done'])
      .withMessage('Status must be todo, in_progress, or done'),
    body('priority')
      .optional()
      .isIn(['low', 'medium', 'high'])
      .withMessage('Priority must be low, medium, or high'),
    body('due_date')
      .optional({ values: 'null' })
      .isISO8601()
      .withMessage('Due date must be a valid date (YYYY-MM-DD)'),
    body('assigned_to')
      .optional({ values: 'null' })
      .isUUID()
      .withMessage('assigned_to must be a valid UUID'),
  ],
  roleCheck('admin'),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array().map((e) => e.msg).join('. ') });
      }

      const { title, description, status, priority, due_date, assigned_to } = req.body;

      // If assigned_to is provided, verify the user is a member of the project
      if (assigned_to) {
        const { ProjectMember } = require('../models');
        const isMember = await ProjectMember.findOne({
          where: { project_id: req.params.projectId, user_id: assigned_to },
        });
        if (!isMember) {
          return res.status(400).json({ message: 'Assigned user is not a member of this project' });
        }
      }

      const task = await Task.create({
        project_id: req.params.projectId,
        title,
        description: description || '',
        status: status || 'todo',
        priority: priority || 'medium',
        due_date: due_date || null,
        assigned_to: assigned_to || null,
        created_by: req.user.id,
      });

      const fullTask = await Task.findByPk(task.id, {
        include: [
          { model: User, as: 'assignee', attributes: ['id', 'name', 'email'] },
          { model: User, as: 'creator', attributes: ['id', 'name', 'email'] },
        ],
      });

      res.status(201).json({ task: fullTask });
    } catch (error) {
      next(error);
    }
  }
);

// ──────────────────────────────────────────────
// PUT /api/projects/:projectId/tasks/:taskId — Update task
// Admin: can update everything
// Member: can only update status of tasks assigned to them
// ──────────────────────────────────────────────
router.put(
  '/:taskId',
  [
    param('projectId').isUUID().withMessage('Invalid project ID'),
    param('taskId').isUUID().withMessage('Invalid task ID'),
    body('title')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Task title cannot be empty')
      .isLength({ max: 255 })
      .withMessage('Task title must be at most 255 characters'),
    body('description')
      .optional()
      .trim(),
    body('status')
      .optional()
      .isIn(['todo', 'in_progress', 'done'])
      .withMessage('Status must be todo, in_progress, or done'),
    body('priority')
      .optional()
      .isIn(['low', 'medium', 'high'])
      .withMessage('Priority must be low, medium, or high'),
    body('due_date')
      .optional({ values: 'null' })
      .isISO8601()
      .withMessage('Due date must be a valid date (YYYY-MM-DD)'),
    body('assigned_to')
      .optional({ values: 'null' })
      .isUUID()
      .withMessage('assigned_to must be a valid UUID'),
  ],
  roleCheck('admin', 'member'),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array().map((e) => e.msg).join('. ') });
      }

      const task = await Task.findOne({
        where: { id: req.params.taskId, project_id: req.params.projectId },
      });

      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }

      const userRole = req.membership.role;

      // Member can only update status of tasks assigned to them
      if (userRole === 'member') {
        if (task.assigned_to !== req.user.id) {
          return res.status(403).json({ message: 'You can only update tasks assigned to you' });
        }

        const allowedFields = ['status'];
        const attemptedFields = Object.keys(req.body);
        const disallowedFields = attemptedFields.filter((f) => !allowedFields.includes(f));
        if (disallowedFields.length > 0) {
          return res.status(403).json({
            message: `Members can only update task status. Cannot modify: ${disallowedFields.join(', ')}`,
          });
        }

        if (req.body.status) {
          task.status = req.body.status;
        }
      } else {
        // Admin: can update everything
        const { title, description, status, priority, due_date, assigned_to } = req.body;

        if (title !== undefined) task.title = title;
        if (description !== undefined) task.description = description;
        if (status !== undefined) task.status = status;
        if (priority !== undefined) task.priority = priority;
        if (due_date !== undefined) task.due_date = due_date || null;

        if (assigned_to !== undefined) {
          if (assigned_to) {
            const { ProjectMember } = require('../models');
            const isMember = await ProjectMember.findOne({
              where: { project_id: req.params.projectId, user_id: assigned_to },
            });
            if (!isMember) {
              return res.status(400).json({ message: 'Assigned user is not a member of this project' });
            }
          }
          task.assigned_to = assigned_to || null;
        }
      }

      await task.save();

      const updatedTask = await Task.findByPk(task.id, {
        include: [
          { model: User, as: 'assignee', attributes: ['id', 'name', 'email'] },
          { model: User, as: 'creator', attributes: ['id', 'name', 'email'] },
        ],
      });

      res.json({ task: updatedTask });
    } catch (error) {
      next(error);
    }
  }
);

// ──────────────────────────────────────────────
// DELETE /api/projects/:projectId/tasks/:taskId — Delete task (admin only)
// ──────────────────────────────────────────────
router.delete(
  '/:taskId',
  [
    param('projectId').isUUID().withMessage('Invalid project ID'),
    param('taskId').isUUID().withMessage('Invalid task ID'),
  ],
  roleCheck('admin'),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array().map((e) => e.msg).join('. ') });
      }

      const task = await Task.findOne({
        where: { id: req.params.taskId, project_id: req.params.projectId },
      });

      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }

      await task.destroy();

      res.json({ message: 'Task deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
