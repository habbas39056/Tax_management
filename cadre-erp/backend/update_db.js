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
    await connection.execute("UPDATE invoices SET bill_from_name = 'CADRE MANAGEMENT CONSULTANTS'");
    await connection.execute("UPDATE invoices SET bill_from_address = 'Office No. R -57, Block 6, Gulshan-e-Iqbal, Karachi'");
    console.log('Updated db');
    connection.end();
  } catch (err) {
    console.error(err);
  }
}
run();
