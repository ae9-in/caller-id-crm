const multer = require('multer');
const { ALLOWED_AUDIO_TYPES, MAX_FILE_SIZE_BYTES } = require('../config/constants');
const { sendError } = require('../utils/response');

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (ALLOWED_AUDIO_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed: ${ALLOWED_AUDIO_TYPES.join(', ')}`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
});

const zipFileFilter = (req, file, cb) => {
  const allowedTypes = ['application/zip', 'application/x-zip-compressed', 'application/octet-stream'];
  if (allowedTypes.includes(file.mimetype) || file.originalname.endsWith('.zip')) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only .zip files are allowed for batch upload.'), false);
  }
};

const uploadZip = multer({
  storage,
  fileFilter: zipFileFilter,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
});

const pdfFileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf' || file.originalname.endsWith('.pdf')) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF files (.pdf) are allowed.'), false);
  }
};

const uploadPdf = multer({
  storage,
  fileFilter: pdfFileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // Max 10MB for PDFs
});

const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return sendError(res, 400, `File too large. Max size: ${process.env.MAX_FILE_SIZE_MB || 100}MB`);
    }
    return sendError(res, 400, err.message);
  }
  if (err) {
    return sendError(res, 400, err.message);
  }
  next();
};

module.exports = { upload, uploadZip, uploadPdf, handleMulterError };
