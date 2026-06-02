const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'Bestfather@51',
  database: process.env.DB_NAME || 'cadre_erp',
});

async function migrate() {
  console.log('Adding bill_from fields to invoices table...');
  try {
    const [columns] = await pool.query('SHOW COLUMNS FROM invoices');
    const columnNames = columns.map(c => c.Field);

    if (!columnNames.includes('bill_from_name')) {
      await pool.query('ALTER TABLE invoices ADD COLUMN bill_from_name VARCHAR(255)');
      console.log('Added bill_from_name to invoices table');
    }

    if (!columnNames.includes('bill_from_address')) {
      await pool.query('ALTER TABLE invoices ADD COLUMN bill_from_address TEXT');
      console.log('Added bill_from_address to invoices table');
    }

    console.log('Migration completed successfully');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    process.exit();
  }
}

migrate();
