require('dotenv').config();
const { pool } = require('../src/config/database');

async function clearDemoData() {
  console.log('Connecting to Neon DB to clear demo/dummy data...');
  const client = await pool.connect();
  try {
    // Start transaction
    await client.query('BEGIN');

    console.log('Truncating CRM activity, meetings, notifications, and recording tables...');
    await client.query(`
      TRUNCATE TABLE 
        activities, 
        audit_logs, 
        business_notes, 
        business_tags, 
        call_notes, 
        call_summaries, 
        call_transcripts, 
        calls, 
        duplicate_checks, 
        followups, 
        meetings, 
        notifications 
      CASCADE
    `);

    console.log('Clearing business records...');
    await client.query('DELETE FROM businesses');

    console.log('Clearing demo agent/manager accounts (preserving admin@callcrm.com)...');
    await client.query("DELETE FROM users WHERE email != 'admin@callcrm.com'");

    await client.query('COMMIT');
    console.log('Demo data successfully cleared! The database is now fresh and ready for real-time CRM usage.');
    // Note: admin credentials remain unchanged (email: admin@callcrm.com)
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Failed to clear demo data:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

clearDemoData();
