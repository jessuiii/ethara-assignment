const { ValidationError, UniqueConstraintError, ForeignKeyConstraintError } = require('sequelize');

/**
 * Global error-handling middleware.
 * Must be registered after all routes.
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, _next) => {
  // Log the full error in development
  if (process.env.NODE_ENV !== 'production') {
    console.error('Error:', err);
  }

  // Sequelize validation errors (model-level)
  if (err instanceof ValidationError) {
    const messages = err.errors.map((e) => e.message);
    return res.status(400).json({ message: messages.join('. ') });
  }

  // Sequelize unique constraint violation
  if (err instanceof UniqueConstraintError) {
    const fields = Object.keys(err.fields || {}).join(', ');
    return res.status(409).json({ message: `Duplicate value for: ${fields}` });
  }

  // Sequelize foreign key constraint violation
  if (err instanceof ForeignKeyConstraintError) {
    return res.status(400).json({ message: 'Referenced record does not exist.' });
  }

  // JWT errors (fallback, most handled in auth middleware)
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ message: 'Invalid token.' });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ message: 'Token has expired.' });
  }

  // Default to 500
  const statusCode = err.statusCode || 500;
  const message =
    process.env.NODE_ENV === 'production' && statusCode === 500
      ? 'Internal server error'
      : err.message || 'Internal server error';

  res.status(statusCode).json({ message });
};

module.exports = errorHandler;
