const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { analyzeBankStatement, getKnowledge, addKnowledge, deleteKnowledge, getEvolutionStatus, generateEvolutionQR } = require('../controllers/aiController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Configure multer for PDF uploads
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir)
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname)
  }
});
const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

router.use((req, res, next) => {
  console.log(`[AI ROUTE] ${req.method} ${req.url}`);
  next();
});

router.use(authenticateToken);

// AI Tools Route
router.post('/analyze-bank-statement', authorizeRoles('Super Admin', 'Operations'), upload.single('statement'), analyzeBankStatement);

// Knowledge Base Routes
router.get('/knowledge', authorizeRoles('Super Admin', 'Operations'), getKnowledge);
router.post('/knowledge', authorizeRoles('Super Admin', 'Operations'), addKnowledge);
router.delete('/knowledge/:id', authorizeRoles('Super Admin', 'Operations'), deleteKnowledge);

// Evolution API Routes
router.get('/evolution/status', authorizeRoles('Super Admin', 'Operations'), getEvolutionStatus);
router.post('/evolution/qr', authorizeRoles('Super Admin', 'Operations'), generateEvolutionQR);

module.exports = router;
