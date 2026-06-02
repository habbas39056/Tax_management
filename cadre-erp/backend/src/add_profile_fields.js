require('dotenv').config({ path: '../.env' });
const pool = require('./config/db');

async function migrate() {
  try {
    console.log('Adding address and profile_image to clients...');
    await pool.query('ALTER TABLE clients ADD COLUMN address TEXT NULL, ADD COLUMN profile_image VARCHAR(255) NULL;');
  } catch (e) {
    console.log('Clients table might already have these columns or error:', e.message);
  }

  try {
    console.log('Adding address and profile_image to users...');
    await pool.query('ALTER TABLE users ADD COLUMN address TEXT NULL, ADD COLUMN profile_image VARCHAR(255) NULL;');
  } catch (e) {
    console.log('Users table might already have these columns or error:', e.message);
  }

  console.log('Migration done.');
  process.exit();
}

migrate();
