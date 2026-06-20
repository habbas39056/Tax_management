const pool = require('./config/db');

async function createBanksTable() {
  const connection = await pool.getConnection();
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS banks (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        account_number VARCHAR(255),
        branch VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `;
    
    await connection.query(createTableQuery);
    console.log('Banks table created successfully or already exists.');
  } catch (error) {
    console.error('Error creating banks table:', error);
  } finally {
    connection.release();
    process.exit(0);
  }
}

createBanksTable();
