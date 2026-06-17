const express = require('express');
const router = express.Router();
const {
  getCalls, getCallById, uploadCall, updateCall, deleteCall,
  getCallTranscript, getCallSummary, getCallNotes, addCallNote,
  reprocessCall, getSignedUrl, uploadCallZip,
} = require('../controllers/callController');
const { authenticate } = require('../middleware/auth');
const { requireAgent, requireManager } = require('../middleware/rbac');
const { upload, uploadZip, handleMulterError } = require('../middleware/upload');

router.use(authenticate);

router.get('/', getCalls);
router.post('/upload', requireAgent, upload.single('audio'), handleMulterError, uploadCall);
router.post('/upload-zip', requireAgent, uploadZip.single('zip'), handleMulterError, uploadCallZip);
router.get('/:id', getCallById);
router.put('/:id', requireAgent, updateCall);
router.delete('/:id', requireManager, deleteCall);

router.get('/:id/transcript', getCallTranscript);
router.get('/:id/summary', getCallSummary);
router.get('/:id/notes', getCallNotes);
router.post('/:id/notes', requireAgent, addCallNote);
router.post('/:id/reprocess', requireManager, reprocessCall);
router.get('/:id/signed-url', getSignedUrl);

module.exports = router;
