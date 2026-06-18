const express = require('express');
const router = express.Router();
const { login, getMe, changePassword, forgotPassword, resetPassword, register } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { auditLogger } = require('../middleware/auditLogger');

router.post('/login', auditLogger('login', 'user'), login);
router.post('/register', auditLogger('register', 'user'), register);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', auditLogger('reset-password', 'user'), resetPassword);
router.get('/me', authenticate, getMe);
router.post('/change-password', authenticate, auditLogger('change-password', 'user'), changePassword);

module.exports = router;
