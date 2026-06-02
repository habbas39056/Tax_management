const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'Bestfather@51',
  database: process.env.DB_NAME || 'cadre_erp',
});

async function migrate() {
  console.log('Adding tax_amount to invoices table...');
  try {
    const [columns] = await pool.query('SHOW COLUMNS FROM invoices');
    const columnNames = columns.map(c => c.Field);

    if (!columnNames.includes('tax_amount')) {
      await pool.query('ALTER TABLE invoices ADD COLUMN tax_amount DECIMAL(15,2) DEFAULT 0');
      console.log('Added tax_amount to invoices table');
    }

    console.log('Migration completed successfully');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    process.exit();
  }
}

migrate();
