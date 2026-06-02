const express = require('express');
const router = express.Router();
const { getClients, createClient, getClientById, updateClient, getClientNotes, createClientNote, updateClientNote, deleteClientNote, getClientPayments } = require('../controllers/clientController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Protect all client routes
router.use(authenticateToken);

// Only Admin, Sales, CSR, Operations, and Accounts can view clients
router.get('/', authorizeRoles('Super Admin', 'Sales', 'CSR', 'Operations', 'Accounts'), getClients);
router.get('/:id', authorizeRoles('Super Admin', 'Sales', 'CSR', 'Operations', 'Accounts'), getClientById);
router.get('/:id/notes', authorizeRoles('Super Admin', 'Sales', 'CSR', 'Operations', 'Accounts'), getClientNotes);
router.get('/:id/payments', authorizeRoles('Super Admin', 'Sales', 'CSR', 'Operations', 'Accounts'), getClientPayments);

// Only Admin and Sales can create or update clients and notes
router.post('/', authorizeRoles('Super Admin', 'Sales'), createClient);
router.put('/:id', authorizeRoles('Super Admin', 'Sales'), updateClient);
router.post('/:id/notes', authorizeRoles('Super Admin', 'Sales', 'CSR', 'Operations', 'Accounts'), createClientNote);
router.put('/:id/notes/:noteId', authorizeRoles('Super Admin', 'Sales', 'CSR', 'Operations', 'Accounts'), updateClientNote);
router.delete('/:id/notes/:noteId', authorizeRoles('Super Admin', 'Sales'), deleteClientNote);

module.exports = router;
