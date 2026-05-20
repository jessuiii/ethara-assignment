require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

const { sequelize } = require('./models');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const taskRoutes = require('./routes/tasks');
const dashboardRoutes = require('./routes/dashboard');

const app = express();
const PORT = process.env.PORT || 5000;

// ── Global Middleware ──
app.use(
  cors({
    origin: process.env.NODE_ENV === 'production'
      ? true // allow same-origin in production (SPA served from same server)
      : process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ── API Routes ──
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/projects/:projectId/tasks', taskRoutes);
app.use('/api/dashboard', dashboardRoutes);

// ── Health Check ──
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Serve client in production ──
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientDist));

  // SPA catch-all: send index.html for any non-API route
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// ── Global Error Handler (must be last) ──
app.use(errorHandler);

// ── Database Sync & Start Server ──
async function startServer() {
  try {
    await sequelize.authenticate();
    console.log('✓ Database connection established');

    const syncOptions = process.env.NODE_ENV === 'development' ? { alter: true } : {};
    await sequelize.sync(syncOptions);
    console.log('✓ Database models synchronized');

    app.listen(PORT, () => {
      console.log(`✓ Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
    });
  } catch (error) {
    console.error('✗ Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();

module.exports = app;
