const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid'); // Will need to install uuid if using Node v14-, but we can just use crypto or MySQL UUID()

// User Login (Staff / Admin)
const login = async (req, res) => {
  const { email, password } = req.body; // email field might contain username

  try {
    const [users] = await pool.query(
      `SELECT u.*, u.profile_image, r.name as role_name 
       FROM users u 
       JOIN roles r ON u.role_id = r.id 
       WHERE (u.email = ? OR u.username = ?) AND u.is_active = 1`, 
      [email, email]
    );

    if (users.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials or inactive account.' });
    }

    const user = users[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role_name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role_name,
        profile_image: user.profile_image
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: error.message, stack: error.stack });
  }
};

// Client Portal Login
const clientLogin = async (req, res) => {
  const { username, password } = req.body;

  try {
    const [clients] = await pool.query(
      `SELECT id, full_name, portal_username, portal_password_hash, profile_image 
       FROM clients 
       WHERE portal_username = ?`, 
      [username]
    );

    if (clients.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const client = clients[0];
    const validPassword = await bcrypt.compare(password, client.portal_password_hash);

    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const token = jwt.sign(
      { id: client.id, username: client.portal_username, role: 'Client' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({
      message: 'Client login successful',
      token,
      client: {
        id: client.id,
        name: client.full_name,
        username: client.portal_username,
        role: 'Client',
        profile_image: client.profile_image
      }
    });

  } catch (error) {
    console.error('Client login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = { login, clientLogin };
