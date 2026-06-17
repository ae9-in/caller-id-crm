const { sendError } = require('../utils/response');
const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  logger.error({
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    user: req.user?.id,
  });

  if (err.code === '23505') {
    return sendError(res, 409, 'A record with this value already exists');
  }
  if (err.code === '23503') {
    return sendError(res, 400, 'Referenced record does not exist');
  }
  if (err.code === '23502') {
    return sendError(res, 400, 'Required field missing');
  }

  const statusCode = err.statusCode || err.status || 500;
  const message = statusCode < 500 ? err.message : 'Internal server error';
  sendError(res, statusCode, message);
};

const notFound = (req, res) => {
  sendError(res, 404, `Route not found: ${req.method} ${req.url}`);
};

module.exports = { errorHandler, notFound };
