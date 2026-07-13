require('dotenv').config({ path: '../.env' });
const pool = require('./config/db');

async function migrate() {
  try {
    const [columns] = await pool.query('SHOW COLUMNS FROM clients');
    const columnNames = columns.map(c => c.Field);

    if (!columnNames.includes('email')) {
      console.log('Adding email to clients...');
      await pool.query('ALTER TABLE clients ADD COLUMN email VARCHAR(255) NULL;');
      console.log('Added email column successfully.');
    } else {
      console.log('email column already exists.');
    }

    if (!columnNames.includes('pin')) {
      console.log('Adding pin to clients...');
      await pool.query('ALTER TABLE clients ADD COLUMN pin VARCHAR(50) NULL;');
      console.log('Added pin column successfully.');
    } else {
      console.log('pin column already exists.');
    }

    console.log('Migration completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
