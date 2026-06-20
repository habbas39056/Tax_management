const pool = require('./config/db');

async function createCashbookTable() {
  const connection = await pool.getConnection();
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS cashbook_entries (
        id VARCHAR(36) PRIMARY KEY,
        entry_date DATE NOT NULL,
        party_client VARCHAR(255) NOT NULL,
        description TEXT,
        payment_mode VARCHAR(50) NOT NULL,
        bank VARCHAR(255),
        reference_number VARCHAR(255),
        receipt DECIMAL(12,2) DEFAULT 0.00,
        payment DECIMAL(12,2) DEFAULT 0.00,
        balance DECIMAL(12,2) DEFAULT 0.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `;
    
    await connection.query(createTableQuery);
    console.log('Cashbook table created successfully or already exists.');
  } catch (error) {
    console.error('Error creating cashbook table:', error);
  } finally {
    connection.release();
    process.exit(0);
  }
}

createCashbookTable();
