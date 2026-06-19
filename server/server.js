require('dotenv').config();
const app = require('./src/app');
const { pool } = require('./src/config/database');
const logger = require('./src/utils/logger');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Ensure target_quota column exists (migration)
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS target_quota INTEGER DEFAULT 0');
    // Ensure business pitch script columns exist (migration)
    await pool.query('ALTER TABLE businesses ADD COLUMN IF NOT EXISTS pitch_pdf_filename VARCHAR(255)');
    await pool.query('ALTER TABLE businesses ADD COLUMN IF NOT EXISTS pitch_pdf_text TEXT');
    await pool.query('ALTER TABLE businesses ADD COLUMN IF NOT EXISTS pitch_pdf_keywords JSONB DEFAULT \'[]\'');
    logger.info('✅ Database connected and migrated successfully');

    app.listen(PORT, () => {
      logger.info(`🚀 Call Intelligence CRM API running on port ${PORT}`);
      logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🏥 Health check: http://localhost:${PORT}/health`);
    });
  } catch (err) {
    logger.error('❌ Failed to start server:', err.message);
    process.exit(1);
  }
};

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Shutting down...');
  await pool.end();
  process.exit(0);
});

startServer();
