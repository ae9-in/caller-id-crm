const { Pool } = require('pg');

// Strip channel_binding param — not supported by node-postgres, causes connection errors on Vercel
const sanitizeDbUrl = (url) => {
  if (!url) return url;
  try {
    const u = new URL(url);
    u.searchParams.delete('channel_binding');
    return u.toString();
  } catch (e) {
    // fallback: simple string replace
    return url.replace(/[&?]channel_binding=[^&]*/g, '').replace(/\?&/, '?');
  }
};

const rawDbUrl = process.env.DATABASE_URL;
const cleanDbUrl = sanitizeDbUrl(rawDbUrl);

const poolConfig = cleanDbUrl
  ? { connectionString: cleanDbUrl }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || 'callcrm_db',
      user: process.env.DB_USER || 'callcrm',
      password: process.env.DB_PASSWORD || 'callcrm_secret',
    };

// Auto-enable SSL for Neon DB or when explicitly requested
if (
  (cleanDbUrl && (cleanDbUrl.includes('neon.tech') || cleanDbUrl.includes('sslmode=require'))) ||
  process.env.DB_SSL === 'true'
) {
  poolConfig.ssl = {
    rejectUnauthorized: false,
  };
}

// Safe timezone detection — never crashes
let tz = 'UTC';
try {
  tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
} catch (e) {
  tz = 'UTC';
}

const pool = new Pool({
  ...poolConfig,
  max: process.env.NODE_ENV === 'production' ? 3 : 20, // Serverless: minimal connections
  min: 0,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 15000, // 15s for Neon cold starts
  options: `-c timezone=UTC`, // Always use UTC in DB — handle timezone in app layer
});

pool.on('error', (err) => {
  // DO NOT call process.exit() — it crashes serverless functions
  console.error('[DB] Idle client error:', err.message);
});

const query = (text, params) => pool.query(text, params);

const getClient = () => pool.connect();

module.exports = { pool, query, getClient };
