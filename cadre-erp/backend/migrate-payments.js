const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'Bestfather@51',
  database: process.env.DB_NAME || 'cadre_erp',
});

async function migrate() {
  console.log('Creating payments table...');
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS invoice_payments (
        id CHAR(36) PRIMARY KEY,
        invoice_id CHAR(36) NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        payment_date DATE NOT NULL,
        payment_mode VARCHAR(100) NOT NULL,
        transaction_id VARCHAR(255),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
      )
    `);
    console.log('Created invoice_payments table');

    console.log('Migration completed successfully');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    process.exit();
  }
}

migrate();
