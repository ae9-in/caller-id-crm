const express = require('express');
const router = express.Router();
const { getUsers, getUserById, createUser, updateUser, deleteUser } = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');
const { requireAdmin, requireManager } = require('../middleware/rbac');
const { auditLogger } = require('../middleware/auditLogger');

router.use(authenticate);
router.use((req, res, next) => { console.log('Authenticated user role:', req.user.role); next(); });
// Admin‑only routes
router.get('/', requireAdmin, (req, res, next) => { console.log('GET /users called'); next(); }, getUsers);
router.get('/:id', requireAdmin, (req, res, next) => { console.log('GET /users/:id called'); next(); }, getUserById);
router.post('/', requireAdmin, auditLogger('create', 'user'), (req, res, next) => { console.log('POST /users called'); next(); }, createUser);
router.put('/:id', requireAdmin, auditLogger('update', 'user'), (req, res, next) => { console.log('PUT /users/:id called'); next(); }, updateUser);
router.delete('/:id', requireAdmin, auditLogger('delete', 'user'), (req, res, next) => { console.log('DELETE /users/:id called'); next(); }, deleteUser);

module.exports = router;
