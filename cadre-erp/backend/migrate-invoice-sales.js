const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'Bestfather@51',
  database: process.env.DB_NAME || 'cadre_erp',
});

async function migrate() {
  console.log('Adding sales_user_id to invoices table...');
  try {
    const [columns] = await pool.query('SHOW COLUMNS FROM invoices');
    const columnNames = columns.map(c => c.Field);

    if (!columnNames.includes('sales_user_id')) {
      await pool.query('ALTER TABLE invoices ADD COLUMN sales_user_id CHAR(36) REFERENCES users(id)');
      console.log('Added sales_user_id to invoices table');
    }

    console.log('Migration completed successfully');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    process.exit();
  }
}

migrate();
