'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { errorHandler, notFound } = require('./middleware/errorHandler');
const logger = require('./utils/logger');

// Routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const businessRoutes = require('./routes/businesses');
const callRoutes = require('./routes/calls');
const followupRoutes = require('./routes/followups');
const analyticsRoutes = require('./routes/analytics');
const searchRoutes = require('./routes/search');
const notificationRoutes = require('./routes/notifications');
const adminRoutes = require('./routes/admin');

const app = express();

const isProd = process.env.NODE_ENV === 'production';

// Trust Vercel's proxy (needed for correct IP in rate limiting)
if (isProd) {
  app.set('trust proxy', 1);
}

// Security
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: (origin, callback) => {
    // Allow all origins for now — lock down after confirming your Vercel frontend URL
    return callback(null, true);
  },
  credentials: true,
}));

// Rate limiting — use memory store (default), acceptable for serverless
// Note: each serverless instance has its own memory, so this is per-instance
app.use('/api/auth', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 50 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
}));
app.use('/api', rateLimit({
  windowMs: 1 * 60 * 1000,
  max: isProd ? 500 : 5000,
  standardHeaders: true,
  legacyHeaders: false,
}));

// Local uploads only in development — Vercel filesystem is read-only
if (!isProd) {
  try {
    const path = require('path');
    app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
  } catch (e) {
    logger.warn('[App] Could not serve local uploads:', e.message);
  }
}

// Parsing & compression
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));
}

// Health check — always responds immediately (no DB query)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0', env: process.env.NODE_ENV });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/businesses', businessRoutes);
app.use('/api/calls', callRoutes);
app.use('/api/followups', followupRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);

// Root route — shows API is running
app.get('/', (req, res) => {
  res.json({
    status: 'running',
    message: 'CallCRM API Server is running. All endpoints are under /api/*',
    version: '1.0.3-render-optimized',
    health: '/health',
    docs: 'Contact admin for API documentation',
  });
});

// Ignore favicon requests silently
app.get('/favicon.ico', (req, res) => res.status(204).end());

// 404 + Error handling
app.use(notFound);
app.use(errorHandler);

module.exports = app;
