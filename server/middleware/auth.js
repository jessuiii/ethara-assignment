const jwt = require('jsonwebtoken');
const { User } = require('../models');

/**
 * JWT authentication middleware.
 * Expects header: Authorization: Bearer <token>
 * Attaches the authenticated user object (without password) to req.user.
 */
const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication required. No token provided.' });
    }

    const token = authHeader.split(' ')[1];

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token has expired. Please log in again.' });
      }
      return res.status(401).json({ message: 'Invalid token.' });
    }

    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'User associated with this token no longer exists.' });
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = auth;
