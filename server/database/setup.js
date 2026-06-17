require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('../src/config/database');

async function setupDatabase() {
  console.log('Connecting to PostgreSQL database...');
  const client = await pool.connect();
  try {
    // Read schema.sql
    console.log('Reading schema.sql...');
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`schema.sql not found at: ${schemaPath}`);
    }
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('Applying database schema (creating tables, triggers, indexes)...');
    await client.query(schemaSql);
    console.log('Schema applied successfully.');

    // Read seed.sql
    console.log('Reading seed.sql...');
    const seedPath = path.join(__dirname, 'seed.sql');
    if (!fs.existsSync(seedPath)) {
      throw new Error(`seed.sql not found at: ${seedPath}`);
    }
    const seedSql = fs.readFileSync(seedPath, 'utf8');
    
    console.log('Applying seed data (roles, users, businesses, calls, follow-ups)...');
    await client.query(seedSql);
    console.log('Seed data applied successfully.');
    
    console.log('Database setup complete!');
  } catch (error) {
    console.error('Database setup failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

setupDatabase();
