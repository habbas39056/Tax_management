const express = require('express');
const router = express.Router();
const {
  getEntries,
  createEntry,
  updateEntry,
  deleteEntry
} = require('../controllers/cashbookController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

router.use(authenticateToken);

// Cashbook entries
router.get('/', authorizeRoles('Super Admin', 'Accounts', 'Operations', 'Sales'), getEntries);
router.post('/', authorizeRoles('Super Admin', 'Accounts'), createEntry);
router.put('/:id', authorizeRoles('Super Admin', 'Accounts'), updateEntry);
router.delete('/:id', authorizeRoles('Super Admin', 'Accounts'), deleteEntry);

module.exports = router;
