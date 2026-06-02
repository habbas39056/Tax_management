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
    const [tables] = await pool.query('SHOW TABLES');
    console.log('Tables:', tables);
    for (let tableObj of tables) {
      const tableName = Object.values(tableObj)[0];
      const [columns] = await pool.query(`DESCRIBE \`${tableName}\``);
      console.log(`\nTable: ${tableName}`);
      columns.forEach(col => console.log(`  - ${col.Field} (${col.Type})`));
    }
  } catch (error) {
    console.error('Failed to list tables:', error);
  } finally {
    await pool.end();
  }
}

run();
