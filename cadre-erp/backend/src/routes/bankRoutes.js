const express = require('express');
const router = express.Router();
const {
  getBanks,
  createBank,
  updateBank,
  deleteBank
} = require('../controllers/bankController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

router.use(authenticateToken);

// Banks
router.get('/', authorizeRoles('Super Admin', 'Accounts', 'Operations', 'Sales'), getBanks);
router.post('/', authorizeRoles('Super Admin', 'Accounts'), createBank);
router.put('/:id', authorizeRoles('Super Admin', 'Accounts'), updateBank);
router.delete('/:id', authorizeRoles('Super Admin', 'Accounts'), deleteBank);

module.exports = router;
