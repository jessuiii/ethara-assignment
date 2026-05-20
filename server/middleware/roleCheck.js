const { ProjectMember } = require('../models');

/**
 * Middleware factory that checks the authenticated user's role on a project.
 *
 * @param  {...string} allowedRoles - One or more roles that are permitted (e.g. 'admin', 'member').
 * @returns {Function} Express middleware
 *
 * Extracts project_id from req.params.projectId or req.params.project_id.
 * If the user is not a member of the project, returns 403.
 * If the user's role is not in allowedRoles, returns 403.
 * Attaches the membership record to req.membership for downstream use.
 */
const roleCheck = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      const projectId = req.params.projectId || req.params.project_id;

      if (!projectId) {
        return res.status(400).json({ message: 'Project ID is required.' });
      }

      const membership = await ProjectMember.findOne({
        where: {
          project_id: projectId,
          user_id: req.user.id,
        },
      });

      if (!membership) {
        return res.status(403).json({ message: 'You are not a member of this project.' });
      }

      if (!allowedRoles.includes(membership.role)) {
        return res.status(403).json({
          message: `Access denied. Required role: ${allowedRoles.join(' or ')}. Your role: ${membership.role}.`,
        });
      }

      req.membership = membership;
      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = roleCheck;
