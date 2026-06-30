const mysql = require('mysql2/promise');
require('dotenv').config({path: './.env'});
async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'cadre_erp'
  });
  try {
    await connection.query('ALTER TABLE invoices ADD COLUMN invoice_number VARCHAR(50);');
    console.log('Column invoice_number added successfully.');
  } catch(e) {
    console.log('Error:', e.message);
  }
  
  try {
    await connection.query("UPDATE invoices SET invoice_number = CONCAT('MOC-', UPPER(SUBSTRING(id, 1, 8))) WHERE invoice_number IS NULL;");
    console.log('Updated existing invoices with invoice_number.');
  } catch(e) {
    console.log('Error updating existing:', e.message);
  }
  connection.end();
}
run();
