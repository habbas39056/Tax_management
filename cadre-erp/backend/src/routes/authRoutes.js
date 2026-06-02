const express = require('express');
const router = express.Router();
const { login, clientLogin } = require('../controllers/authController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Public routes
router.post('/login', login);
router.post('/client/login', clientLogin);

// Example protected route for testing
router.get('/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// Example RBAC route for testing
router.get('/admin-only', authenticateToken, authorizeRoles('Super Admin'), (req, res) => {
  res.json({ message: 'Welcome to the super admin area.' });
});

module.exports = router;
