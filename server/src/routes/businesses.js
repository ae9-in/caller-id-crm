const express = require('express');
const router = express.Router();
const {
  getBusinesses, getBusinessById, createBusiness, updateBusiness,
  deleteBusiness, getBusinessTimeline, getBusinessCalls,
  getBusinessNotes, addBusinessNote, getTags, createTag,
  getBusinessesForAssignment, assignBusinessesToUser,
} = require('../controllers/businessController');
const { authenticate } = require('../middleware/auth');
const { requireManager, requireAgent, requireAdmin } = require('../middleware/rbac');
const { auditLogger } = require('../middleware/auditLogger');

router.use(authenticate);

// Tags
router.get('/tags', getTags);
router.post('/tags', requireManager, auditLogger('create', 'tag'), createTag);

// Business CRUD
router.get('/all-assignment', requireAdmin, getBusinessesForAssignment);
router.put('/assign-multiple/:userId', requireAdmin, assignBusinessesToUser);
router.get('/', getBusinesses);
router.post('/', requireAgent, auditLogger('create', 'business'), createBusiness);
router.get('/:id', getBusinessById);
router.put('/:id', requireAgent, auditLogger('update', 'business'), updateBusiness);
router.delete('/:id', requireManager, auditLogger('delete', 'business'), deleteBusiness);

// Business sub-resources
router.get('/:id/timeline', getBusinessTimeline);
router.get('/:id/calls', getBusinessCalls);
router.get('/:id/notes', getBusinessNotes);
router.post('/:id/notes', requireAgent, auditLogger('create', 'business_note'), addBusinessNote);

module.exports = router;
