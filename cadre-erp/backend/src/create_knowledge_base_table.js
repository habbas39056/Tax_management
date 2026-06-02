require('dotenv').config();
const mysql = require('mysql2/promise');

async function createKnowledgeBaseTable() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'cadre_erp'
    });

    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS knowledge_base (
        id INT AUTO_INCREMENT PRIMARY KEY,
        topic VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await connection.execute(createTableQuery);
    console.log('Successfully created knowledge_base table');
  } catch (error) {
    console.error('Error creating knowledge_base table:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

createKnowledgeBaseTable();
