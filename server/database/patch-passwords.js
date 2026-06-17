require('dotenv').config();
const { pool } = require('../src/config/database');

async function patchPasswords() {
  console.log('Connecting to database to patch password hashes...');
  const client = await pool.connect();
  try {
    const hash = '$2a$10$JYfAiU1FSBHFWc9or9JFbuQAwyUfMJ7gnde4ebSyketeFXO7evjp6';
    
    // Update all seed users to the correct bcrypt hash for "password"
    const result = await client.query('UPDATE users SET password_hash = $1', [hash]);
    console.log(`Successfully updated ${result.rowCount} users with the correct password hash.`);
  } catch (error) {
    console.error('Failed to update passwords:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

patchPasswords();
