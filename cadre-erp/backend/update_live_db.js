const mysql = require('mysql2/promise');
require('dotenv').config({path: './.env'});

async function run() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'cadre_erp'
    });
    console.log('Connected to DB');

    // 1. Add 'bank' column to invoice_payments if it doesn't exist
    try {
      await connection.execute("ALTER TABLE invoice_payments ADD COLUMN bank VARCHAR(255) NULL");
      console.log('Added bank column to invoice_payments');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('Column bank already exists in invoice_payments');
      } else {
        console.error('Error adding bank column to invoice_payments:', e.message);
      }
    }

    // You can also add other necessary schema updates here.
    
    console.log('Live DB update script finished.');
    connection.end();
  } catch (err) {
    console.error('Database connection failed:', err);
  }
}
run();
