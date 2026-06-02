const express = require('express');
const router = express.Router();
const { getRoles, getUsers, getStaffUsers, createUser, getUserById, updateUser, getUserActivity, getUserAssignments, updateProfile, getProfile } = require('../controllers/userController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

router.use(authenticateToken);
router.get('/staff', getStaffUsers); // All staff can see staff list for assignments

const multer = require('multer');
const path = require('path');
const fs = require('fs');

const profilesDir = path.join(__dirname, '../../uploads/profiles');
if (!fs.existsSync(profilesDir)) fs.mkdirSync(profilesDir, { recursive: true });

const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, profilesDir),
  filename: (req, file, cb) => {
    const unique = `profile_user_${req.user.id}_${Date.now()}${path.extname(file.originalname)}`;
    cb(null, unique);
  }
});
const profileUpload = multer({ storage: profileStorage, limits: { fileSize: 5 * 1024 * 1024 } });

// Profile for any logged in user
router.get('/profile', getProfile);
router.put('/profile', profileUpload.single('profile_image'), updateProfile);

// Only Super Admin can manage staff/roles
router.use(authorizeRoles('Super Admin'));
router.get('/roles', getRoles);
router.get('/', getUsers);
router.post('/', createUser);
router.get('/:id', getUserById);
router.put('/:id', updateUser);
router.get('/:id/activity', getUserActivity);
router.get('/:id/assignments', getUserAssignments);

module.exports = router;
