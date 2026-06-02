const mysql = require('mysql2/promise');
require('dotenv').config({ path: 'c:/Users/MM COMPUTERS/OneDrive/Desktop/TAX SOFTWARE/cadre-erp/backend/.env' });

const checkDb = async () => {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    console.log('--- Invoices Columns ---');
    const [columns] = await connection.query('SHOW COLUMNS FROM invoices');
    console.log(columns);

    console.log('\n--- Invoices Rows ---');
    const [rows] = await connection.query('SELECT * FROM invoices LIMIT 5');
    console.log(rows);

  } catch (error) {
    console.error('Database connection/query error:', error.message);
  } finally {
    if (connection) await connection.end();
  }
};

checkDb();
