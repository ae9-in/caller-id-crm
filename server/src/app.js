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

// Security
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    const allowedOrigins = [
      process.env.APP_URL,
      process.env.FRONTEND_URL,
      'http://localhost:3000',
      'http://localhost:5173',
    ].filter(Boolean);
    if (allowedOrigins.some(o => origin.startsWith(o))) {
      return callback(null, true);
    }
    // Also allow any vercel.app subdomain for preview deployments
    if (origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    return callback(null, true); // permissive for now — lock down after confirming URL
  },
  credentials: true,
}));

// Rate limiting
const isProd = process.env.NODE_ENV === 'production';
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: isProd ? 20 : 1000, message: { success: false, message: 'Too many requests' } }));
app.use('/api', rateLimit({ windowMs: 1 * 60 * 1000, max: isProd ? 300 : 5000 }));

// NOTE: Local /uploads folder is NOT available on Vercel (read-only FS).
// Uploaded files should be served from S3 using signed URLs.
// Keeping this only for local development fallback.
if (process.env.NODE_ENV !== 'production') {
  app.use('/uploads', require('express').static(require('path').join(__dirname, '../uploads')));
}

// Parsing & compression
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
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

// 404 + Error handling
app.use(notFound);
app.use(errorHandler);

module.exports = app;
