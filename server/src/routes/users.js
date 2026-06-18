const express = require('express');
const router = express.Router();
const { getUsers, getUserById, createUser, updateUser, deleteUser } = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');
const { requireManager } = require('../middleware/rbac');
const { auditLogger } = require('../middleware/auditLogger');

router.use(authenticate);
router.get('/', requireManager, getUsers);
router.get('/:id', requireManager, getUserById);
router.post('/', requireManager, auditLogger('create', 'user'), createUser);
router.put('/:id', requireManager, auditLogger('update', 'user'), updateUser);
router.delete('/:id', requireManager, auditLogger('delete', 'user'), deleteUser);

module.exports = router;
