const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const { createNotification } = require('./notificationController');

const getRoles = async (req, res) => {
  try {
    const [roles] = await pool.query('SELECT * FROM roles ORDER BY name ASC');
    res.json(roles);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching roles' });
  }
};

const getUsers = async (req, res) => {
  try {
    const [users] = await pool.query(`
      SELECT u.id, u.name, u.email, u.username, u.is_active, u.commission_percentage, u.module_access, r.name as role_name 
      FROM users u
      JOIN roles r ON u.role_id = r.id
      ORDER BY u.name ASC
    `);
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users' });
  }
};

const getStaffUsers = async (req, res) => {
  try {
    const [users] = await pool.query(`
      SELECT u.id, u.name, u.email, u.username, u.commission_percentage, r.name as role_name 
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE r.name != 'Client'
      ORDER BY u.name ASC
    `);
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching staff users' });
  }
};

const createUser = async (req, res) => {
  const { name, email, username, password, role_id, commission_percentage, module_access } = req.body;

  try {
    if (!name || (!email && !username) || !password || !role_id) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Check if email or username exists
    if (email) {
      const [existingEmail] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
      if (existingEmail.length > 0) return res.status(400).json({ message: 'Email already exists' });
    }
    if (username) {
      const [existingUser] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
      if (existingUser.length > 0) return res.status(400).json({ message: 'Username already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    await pool.query(
      'INSERT INTO users (id, name, email, username, password_hash, role_id, commission_percentage, is_active, module_access) VALUES (UUID(), ?, ?, ?, ?, ?, ?, 1, ?)',
      [name, email || null, username || null, password_hash, role_id, commission_percentage || 0, module_access ? JSON.stringify(module_access) : null]
    );

    // Fetch the newly created user's ID to send them a welcome notification
    const [newUser] = await pool.query('SELECT id FROM users WHERE email = ? OR username = ? LIMIT 1', [email || null, username || null]);
    if (newUser.length > 0) {
      const [roleRow] = await pool.query('SELECT name FROM roles WHERE id = ?', [role_id]);
      const roleName = roleRow.length > 0 ? roleRow[0].name : 'Staff';
      await createNotification(
        newUser[0].id,
        `Welcome to Cadre Management, ${name}! 🎉`,
        `Your account has been created successfully. You have been assigned the role of ${roleName}. Log in to get started and explore your dashboard.`
      );
    }

    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Error creating user' });
  }
};

const getUserById = async (req, res) => {
  const { id } = req.params;
  try {
    const [users] = await pool.query(`
      SELECT u.id, u.name, u.email, u.username, u.is_active, u.commission_percentage, u.role_id, r.name as role_name 
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = ?
    `, [id]);
    
    if (users.length === 0) return res.status(404).json({ message: 'User not found' });
    res.json(users[0]);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user' });
  }
};

const updateUser = async (req, res) => {
  const { id } = req.params;
  const { name, email, username, password, role_id, commission_percentage, is_active } = req.body;

  try {
    if (password && password.trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(password, salt);
      await pool.query(
        'UPDATE users SET name = ?, email = ?, username = ?, password_hash = ?, role_id = ?, commission_percentage = ?, is_active = ? WHERE id = ?',
        [name, email || null, username || null, password_hash, role_id, commission_percentage || 0, is_active, id]
      );
    } else {
      await pool.query(
        'UPDATE users SET name = ?, email = ?, username = ?, role_id = ?, commission_percentage = ?, is_active = ? WHERE id = ?',
        [name, email || null, username || null, role_id, commission_percentage || 0, is_active, id]
      );
    }
    res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Error updating user:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Email or username already exists' });
    }
    res.status(500).json({ message: 'Error updating user' });
  }
};

const getUserActivity = async (req, res) => {
  const { id } = req.params;
  try {
    const [activities] = await pool.query(`
      SELECT a.id, a.action, a.details, a.created_at, s.title as step_title, p.title as project_title
      FROM step_activity_logs a
      LEFT JOIN project_steps_new s ON a.step_id = s.id
      LEFT JOIN projects p ON s.project_id = p.id
      WHERE a.user_id = ?
      ORDER BY a.created_at DESC
      LIMIT 50
    `, [id]);
    res.json(activities);
  } catch (error) {
    console.error('Error fetching activity:', error);
    res.status(500).json({ message: 'Error fetching user activity' });
  }
};

const getUserAssignments = async (req, res) => {
  const { id } = req.params;
  try {
    // Assigned Clients (for Sales)
    const [clients] = await pool.query('SELECT id, full_name, cnic, whatsapp_number FROM clients WHERE sales_user_id = ?', [id]);
    
    // Assigned Projects/Steps
    const [steps] = await pool.query(`
      SELECT s.id as step_id, s.title as step_title, s.status, p.id as project_id, p.title as project_title, c.full_name as client_name
      FROM project_steps_new s
      JOIN projects p ON s.project_id = p.id
      JOIN clients c ON p.client_id = c.id
      WHERE s.assigned_user_id = ?
      ORDER BY s.created_at DESC
    `, [id]);
    
    res.json({ clients, assignedSteps: steps });
  } catch (error) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({ message: 'Error fetching user assignments' });
  }
};

const updateProfile = async (req, res) => {
  const { name, email, username, password, address } = req.body;
  const id = req.user.id;
  const profile_image = req.file ? req.file.filename : undefined;

  try {
    const fields = ['name = ?', 'email = ?', 'username = ?', 'address = ?'];
    const values = [name, email || null, username || null, address || null];

    if (profile_image) {
      fields.push('profile_image = ?');
      values.push(profile_image);
    }

    if (password && password.trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(password, salt);
      fields.push('password_hash = ?');
      values.push(password_hash);
    }

    values.push(id);
    
    await pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    res.json({ message: 'Profile updated successfully', profile_image });
  } catch (error) {
    console.error('Error updating profile:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Email or username already exists' });
    }
    res.status(500).json({ message: 'Error updating profile' });
  }
};

const getProfile = async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT id, name, email, username, address, profile_image FROM users WHERE id = ?',
      [req.user.id]
    );
    if (users.length === 0) return res.status(404).json({ message: 'Profile not found' });
    res.json(users[0]);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching profile' });
  }
};

module.exports = { getRoles, getUsers, getStaffUsers, createUser, getUserById, updateUser, getUserActivity, getUserAssignments, updateProfile, getProfile };
