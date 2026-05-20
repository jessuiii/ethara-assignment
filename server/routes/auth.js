const express = require('express');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const auth = require('../middleware/auth');

const router = express.Router();

/**
 * Generate a signed JWT for a user.
 */
function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// ──────────────────────────────────────────────
// POST /api/auth/signup
// ──────────────────────────────────────────────
router.post(
  '/signup',
  [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Name is required')
      .isLength({ max: 255 })
      .withMessage('Name must be at most 255 characters'),
    body('email')
      .trim()
      .isEmail()
      .withMessage('A valid email is required')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array().map((e) => e.msg).join('. ') });
      }

      const { name, email, password } = req.body;

      // Check if email already exists
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(409).json({ message: 'Email already in use' });
      }

      // Create user — password hashing handled by beforeCreate hook
      const user = await User.create({
        name,
        email,
        password_hash: password,
      });

      const token = generateToken(user);

      res.status(201).json({
        token,
        user: user.toJSON(),
      });
    } catch (error) {
      next(error);
    }
  }
);

// ──────────────────────────────────────────────
// POST /api/auth/login
// ──────────────────────────────────────────────
router.post(
  '/login',
  [
    body('email')
      .trim()
      .isEmail()
      .withMessage('A valid email is required')
      .normalizeEmail(),
    body('password')
      .notEmpty()
      .withMessage('Password is required'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array().map((e) => e.msg).join('. ') });
      }

      const { email, password } = req.body;

      const user = await User.findOne({ where: { email } });
      if (!user) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      const token = generateToken(user);

      res.json({
        token,
        user: user.toJSON(),
      });
    } catch (error) {
      next(error);
    }
  }
);

// ──────────────────────────────────────────────
// GET /api/auth/me  (protected)
// ──────────────────────────────────────────────
router.get('/me', auth, async (req, res, next) => {
  try {
    res.json({ user: req.user.toJSON() });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
