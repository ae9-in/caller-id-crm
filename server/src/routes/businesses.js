const express = require('express');
const router = express.Router();
const {
  getBusinesses, getBusinessById, createBusiness, updateBusiness,
  deleteBusiness, getBusinessTimeline, getBusinessCalls,
  getBusinessNotes, addBusinessNote, getTags, createTag,
} = require('../controllers/businessController');
const { authenticate } = require('../middleware/auth');
const { requireManager, requireAgent } = require('../middleware/rbac');

router.use(authenticate);

// Tags
router.get('/tags', getTags);
router.post('/tags', requireManager, createTag);

// Business CRUD
router.get('/', getBusinesses);
router.post('/', requireAgent, createBusiness);
router.get('/:id', getBusinessById);
router.put('/:id', requireAgent, updateBusiness);
router.delete('/:id', requireManager, deleteBusiness);

// Business sub-resources
router.get('/:id/timeline', getBusinessTimeline);
router.get('/:id/calls', getBusinessCalls);
router.get('/:id/notes', getBusinessNotes);
router.post('/:id/notes', requireAgent, addBusinessNote);

module.exports = router;
