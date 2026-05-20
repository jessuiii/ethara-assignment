const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { Project, ProjectMember, User, Task } = require('../models');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

const router = express.Router();

// All project routes require authentication
router.use(auth);

// ──────────────────────────────────────────────
// POST /api/projects — Create a new project
// ──────────────────────────────────────────────
router.post(
  '/',
  [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Project name is required')
      .isLength({ max: 255 })
      .withMessage('Project name must be at most 255 characters'),
    body('description')
      .optional()
      .trim(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array().map((e) => e.msg).join('. ') });
      }

      const { name, description } = req.body;

      const project = await Project.create({
        name,
        description: description || '',
        created_by: req.user.id,
      });

      // Creator automatically becomes an admin member
      await ProjectMember.create({
        project_id: project.id,
        user_id: req.user.id,
        role: 'admin',
      });

      // Reload with associations
      const fullProject = await Project.findByPk(project.id, {
        include: [
          { model: User, as: 'creator', attributes: ['id', 'name', 'email'] },
          {
            model: ProjectMember,
            as: 'projectMembers',
            include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }],
          },
        ],
      });

      res.status(201).json({ project: fullProject });
    } catch (error) {
      next(error);
    }
  }
);

// ──────────────────────────────────────────────
// GET /api/projects — List projects the user belongs to
// ──────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const memberships = await ProjectMember.findAll({
      where: { user_id: req.user.id },
      attributes: ['project_id', 'role'],
    });

    const projectIds = memberships.map((m) => m.project_id);

    const projects = await Project.findAll({
      where: { id: projectIds },
      include: [
        { model: User, as: 'creator', attributes: ['id', 'name', 'email'] },
        {
          model: ProjectMember,
          as: 'projectMembers',
          include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }],
        },
      ],
      order: [['created_at', 'DESC']],
    });

    // Attach the current user's role to each project
    const projectsWithRole = projects.map((p) => {
      const membership = memberships.find((m) => m.project_id === p.id);
      return {
        ...p.toJSON(),
        currentUserRole: membership ? membership.role : null,
      };
    });

    res.json({ projects: projectsWithRole });
  } catch (error) {
    next(error);
  }
});

// ──────────────────────────────────────────────
// GET /api/projects/:projectId — Get single project
// ──────────────────────────────────────────────
router.get(
  '/:projectId',
  [param('projectId').isUUID().withMessage('Invalid project ID')],
  roleCheck('admin', 'member'),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array().map((e) => e.msg).join('. ') });
      }

      const project = await Project.findByPk(req.params.projectId, {
        include: [
          { model: User, as: 'creator', attributes: ['id', 'name', 'email'] },
          {
            model: ProjectMember,
            as: 'projectMembers',
            include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }],
          },
        ],
      });

      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }

      res.json({
        project: {
          ...project.toJSON(),
          currentUserRole: req.membership.role,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ──────────────────────────────────────────────
// PUT /api/projects/:projectId — Update project (admin only)
// ──────────────────────────────────────────────
router.put(
  '/:projectId',
  [
    param('projectId').isUUID().withMessage('Invalid project ID'),
    body('name')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Project name cannot be empty')
      .isLength({ max: 255 })
      .withMessage('Project name must be at most 255 characters'),
    body('description')
      .optional()
      .trim(),
  ],
  roleCheck('admin'),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array().map((e) => e.msg).join('. ') });
      }

      const project = await Project.findByPk(req.params.projectId);
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }

      const { name, description } = req.body;
      if (name !== undefined) project.name = name;
      if (description !== undefined) project.description = description;

      await project.save();

      const updatedProject = await Project.findByPk(project.id, {
        include: [
          { model: User, as: 'creator', attributes: ['id', 'name', 'email'] },
          {
            model: ProjectMember,
            as: 'projectMembers',
            include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }],
          },
        ],
      });

      res.json({ project: updatedProject });
    } catch (error) {
      next(error);
    }
  }
);

// ──────────────────────────────────────────────
// DELETE /api/projects/:projectId — Delete project (admin only)
// ──────────────────────────────────────────────
router.delete(
  '/:projectId',
  [param('projectId').isUUID().withMessage('Invalid project ID')],
  roleCheck('admin'),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array().map((e) => e.msg).join('. ') });
      }

      const project = await Project.findByPk(req.params.projectId);
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }

      // Delete related records first
      await Task.destroy({ where: { project_id: project.id } });
      await ProjectMember.destroy({ where: { project_id: project.id } });
      await project.destroy();

      res.json({ message: 'Project deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
);

// ──────────────────────────────────────────────
// GET /api/projects/:projectId/member-suggestions?q=...
// Search users by name/email who are not already members (admin only)
// ──────────────────────────────────────────────
router.get(
  '/:projectId/member-suggestions',
  [
    param('projectId').isUUID().withMessage('Invalid project ID'),
    query('q')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Search query is required'),
  ],
  roleCheck('admin'),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array().map((e) => e.msg).join('. ') });
      }

      const searchTerm = req.query.q.trim();

      const existingMembers = await ProjectMember.findAll({
        where: { project_id: req.params.projectId },
        attributes: ['user_id'],
      });
      const existingMemberIds = existingMembers.map((m) => m.user_id);

      const users = await User.findAll({
        where: {
          id: { [Op.notIn]: existingMemberIds },
          [Op.or]: [
            { name: { [Op.iLike]: `%${searchTerm}%` } },
            { email: { [Op.iLike]: `%${searchTerm}%` } },
          ],
        },
        attributes: ['id', 'name', 'email'],
        order: [['name', 'ASC']],
        limit: 8,
      });

      res.json({ users });
    } catch (error) {
      next(error);
    }
  }
);

// ──────────────────────────────────────────────
// POST /api/projects/:projectId/members — Add member (admin only)
// ──────────────────────────────────────────────
router.post(
  '/:projectId/members',
  [
    param('projectId').isUUID().withMessage('Invalid project ID'),
    body('email')
      .trim()
      .isEmail()
      .withMessage('A valid email is required')
      .normalizeEmail(),
    body('role')
      .optional()
      .isIn(['admin', 'member'])
      .withMessage('Role must be admin or member'),
  ],
  roleCheck('admin'),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array().map((e) => e.msg).join('. ') });
      }

      const { email, role } = req.body;

      const userToAdd = await User.findOne({ where: { email } });
      if (!userToAdd) {
        return res.status(404).json({ message: 'User not found with that email' });
      }

      // Check if already a member
      const existing = await ProjectMember.findOne({
        where: { project_id: req.params.projectId, user_id: userToAdd.id },
      });
      if (existing) {
        return res.status(409).json({ message: 'User is already a member of this project' });
      }

      const membership = await ProjectMember.create({
        project_id: req.params.projectId,
        user_id: userToAdd.id,
        role: role || 'member',
      });

      const fullMembership = await ProjectMember.findByPk(membership.id, {
        include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }],
      });

      res.status(201).json({ member: fullMembership });
    } catch (error) {
      next(error);
    }
  }
);

// ──────────────────────────────────────────────
// DELETE /api/projects/:projectId/members/:userId — Remove member (admin only)
// ──────────────────────────────────────────────
router.delete(
  '/:projectId/members/:userId',
  [
    param('projectId').isUUID().withMessage('Invalid project ID'),
    param('userId').isUUID().withMessage('Invalid user ID'),
  ],
  roleCheck('admin'),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array().map((e) => e.msg).join('. ') });
      }

      const { projectId, userId } = req.params;

      // Prevent admin from removing themselves if they are the project creator
      const project = await Project.findByPk(projectId);
      if (project && project.created_by === userId) {
        return res.status(400).json({ message: 'Cannot remove the project creator' });
      }

      const membership = await ProjectMember.findOne({
        where: { project_id: projectId, user_id: userId },
      });

      if (!membership) {
        return res.status(404).json({ message: 'Member not found in this project' });
      }

      // Unassign tasks that were assigned to this user in this project
      await Task.update(
        { assigned_to: null },
        { where: { project_id: projectId, assigned_to: userId } }
      );

      await membership.destroy();

      res.json({ message: 'Member removed successfully' });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
