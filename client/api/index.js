let app;
let initError = null;

try {
  app = require('../../server/src/app');
} catch (err) {
  initError = err;
  console.error('[Vercel Client API Init Error]:', err);
}

module.exports = (req, res) => {
  if (initError) {
    return res.status(500).json({
      success: false,
      message: 'Serverless initialization error',
      error: initError.message,
      stack: initError.stack,
    });
  }
  return app(req, res);
};
