const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    const [projects] = await connection.query(`
      SELECT p.id, p.title, 
        (SELECT JSON_ARRAYAGG(JSON_OBJECT('title', title, 'status', status)) 
         FROM project_steps_new 
         WHERE project_id = p.id) as steps 
      FROM projects p
    `);
    console.log('Projects with steps:', JSON.stringify(projects, null, 2));
  } catch (err) {
    console.error('Query failed:', err.message);
  } finally {
    await connection.end();
  }
})();
