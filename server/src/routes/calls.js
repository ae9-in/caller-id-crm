const express = require('express');
const router = express.Router();
const {
  getCalls, getCallById, uploadCall, updateCall, deleteCall,
  getCallTranscript, getCallSummary, getCallNotes, addCallNote,
  reprocessCall, getSignedUrl, uploadCallZip, getCallFolders,
  handleAssemblyAIWebhook,
} = require('../controllers/callController');
const { authenticate } = require('../middleware/auth');
const { requireAgent, requireManager } = require('../middleware/rbac');
const { upload, uploadZip, handleMulterError } = require('../middleware/upload');
const { auditLogger } = require('../middleware/auditLogger');

// Public endpoint for AssemblyAI webhooks
router.post('/webhook/assemblyai', handleAssemblyAIWebhook);

router.use(authenticate);

router.get('/', getCalls);
router.get('/folders', getCallFolders);
router.post('/upload', requireAgent, upload.single('audio'), handleMulterError, auditLogger('create', 'call'), uploadCall);
router.post('/upload-zip', requireAgent, uploadZip.single('zip'), handleMulterError, auditLogger('create', 'call'), uploadCallZip);
router.get('/:id', getCallById);
router.put('/:id', requireManager, auditLogger('update', 'call'), updateCall);
router.delete('/:id', requireManager, auditLogger('delete', 'call'), deleteCall);

router.get('/:id/transcript', requireManager, getCallTranscript);
router.get('/:id/summary', getCallSummary);
router.get('/:id/notes', getCallNotes);
router.post('/:id/notes', requireAgent, auditLogger('create', 'call_note'), addCallNote);
router.post('/:id/reprocess', requireManager, auditLogger('reprocess', 'call'), reprocessCall);
router.get('/:id/signed-url', getSignedUrl);

module.exports = router;
