const mysql = require('mysql2/promise');
require('dotenv').config({ path: './.env' });

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Bestfather@51',
    database: process.env.DB_NAME || 'cadre_erp'
  });

  try {
    console.log('Migrating invoices table...');
    await connection.query('ALTER TABLE invoices ADD COLUMN items JSON, ADD COLUMN discount DECIMAL(10,2) DEFAULT 0, ADD COLUMN gst_rate DECIMAL(10,2) DEFAULT 18;');
    console.log('Migration successful!');
  } catch (error) {
    if (error.code === 'ER_DUP_COLUMN_NAME') {
      console.log('Columns already exist.');
    } else {
      console.error('Migration failed:', error);
    }
  } finally {
    await connection.end();
  }
}

migrate();
