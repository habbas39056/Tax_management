const express = require('express');
const router = express.Router();
const { getLeads, createLeadN8n } = require('../controllers/leadController');
const { authenticateToken } = require('../middleware/auth');

// Webhook for n8n (no auth required, or you can add custom api key middleware)
router.post('/n8n-webhook', createLeadN8n);

// Protected routes for the frontend
router.use(authenticateToken);
router.get('/', getLeads);

module.exports = router;
