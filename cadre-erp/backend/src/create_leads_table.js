const mysql = require('mysql2/promise');
require('dotenv').config({ path: 'c:/Users/MM COMPUTERS/OneDrive/Desktop/TAX SOFTWARE/cadre-erp/backend/.env' });

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function run() {
  try {
    await pool.query('DROP TABLE IF EXISTS leads');
    await pool.query(`
      CREATE TABLE leads (
        Id VARCHAR(36) PRIMARY KEY,
        CustomerId VARCHAR(36),
        PhoneNumber VARCHAR(50),
        Summary TEXT,
        Score FLOAT,
        IsPaused BOOLEAN DEFAULT FALSE,
        LastMessageAt DATETIME,
        Name VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('Successfully created leads table.');
  } catch (error) {
    console.error('Failed to create leads table:', error);
  } finally {
    await pool.end();
  }
}

run();
