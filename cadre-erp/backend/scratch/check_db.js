require('dotenv').config({ path: '../.env' });
const pool = require('../src/config/db');
const jwt = require('jsonwebtoken');

async function testSuccess() {
  try {
    const email = 'admin@cadre.app';
    const [users] = await pool.query(
      `SELECT u.*, u.profile_image, r.name as role_name 
       FROM users u 
       JOIN roles r ON u.role_id = r.id 
       WHERE (u.email = ? OR u.username = ?) AND u.is_active = 1`, 
      [email, email]
    );

    const user = users[0];
    
    // Simulate correct password
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role_name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );
    
    console.log('Token created successfully:', token);
  } catch (error) {
    console.error('Error during successful login simulation:', error);
  }
  process.exit(0);
}

testSuccess();
