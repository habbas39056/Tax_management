const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const pool = require('../src/config/db');

const setupAdmin = async () => {
  try {
    console.log('Fetching Super Admin role...');
    const [roles] = await pool.query('SELECT id FROM roles WHERE name = ?', ['Super Admin']);
    
    if (roles.length === 0) {
      console.error('Super Admin role not found. Please ensure schema.sql was run completely.');
      process.exit(1);
    }
    
    const roleId = roles[0].id;
    const email = 'admin@cadre.app';
    const password = 'Password123!';
    
    // Check if exists
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      console.log('Admin user already exists:', email);
      process.exit(0);
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    
    // Use MySQL UUID() equivalent since we can just let DB handle it or use uuid package.
    // We didn't install uuid, so we'll use a simple fallback or execute a query that uses UUID().
    await pool.query(
      'INSERT INTO users (id, name, email, password_hash, role_id, is_active) VALUES (UUID(), ?, ?, ?, ?, ?)',
      ['Super Administrator', email, hash, roleId, true]
    );

    console.log('Successfully created Super Admin user!');
    console.log('Email:', email);
    console.log('Password:', password);
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin:', error);
    process.exit(1);
  }
};

setupAdmin();
