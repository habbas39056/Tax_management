const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'Bestfather@51',
  database: process.env.DB_NAME || 'cadre_erp',
});

async function migrate() {
  console.log('Starting Sales Agent Module migration...');
  try {
    const [columns] = await pool.query('SHOW COLUMNS FROM clients');
    const columnNames = columns.map(c => c.Field);

    if (!columnNames.includes('sales_user_id')) {
      await pool.query('ALTER TABLE clients ADD COLUMN sales_user_id CHAR(36) REFERENCES users(id)');
      console.log('Added sales_user_id to clients table');
    }

    const [userColumns] = await pool.query('SHOW COLUMNS FROM users');
    const userColumnNames = userColumns.map(c => c.Field);

    if (!userColumnNames.includes('commission_percentage')) {
      await pool.query('ALTER TABLE users ADD COLUMN commission_percentage DECIMAL(5,2) DEFAULT 0');
      console.log('Added commission_percentage to users table');
    }

    if (!userColumnNames.includes('username')) {
      await pool.query('ALTER TABLE users ADD COLUMN username VARCHAR(255) UNIQUE');
      console.log('Added username to users table');
    }

    console.log('Migration completed successfully');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    process.exit();
  }
}

migrate();
