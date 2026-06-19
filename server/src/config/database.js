const { Pool } = require('pg');

const poolConfig = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || 'callcrm_db',
      user: process.env.DB_USER || 'callcrm',
      password: process.env.DB_PASSWORD || 'callcrm_secret',
    };

// Auto-enable SSL for Neon DB or when explicitly requested
if (
  (process.env.DATABASE_URL && (process.env.DATABASE_URL.includes('neon.tech') || process.env.DATABASE_URL.includes('sslmode=require'))) ||
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
  max: process.env.NODE_ENV === 'production' ? 5 : 20, // Serverless: use fewer connections
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 10000, // 10s timeout for Neon cold starts
  options: `-c timezone=${tz}`,
});

pool.on('error', (err) => {
  // Do NOT call process.exit() — it crashes serverless functions
  console.error('Unexpected error on idle pg client', err.message);
});

const query = (text, params) => pool.query(text, params);

const getClient = () => pool.connect();

module.exports = { pool, query, getClient };
