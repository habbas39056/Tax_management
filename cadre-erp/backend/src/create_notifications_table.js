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
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36),
        title VARCHAR(255) NOT NULL,
        message TEXT,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('Successfully created notifications table.');
  } catch (error) {
    console.error('Failed to create notifications table:', error);
  } finally {
    await pool.end();
  }
}

run();
