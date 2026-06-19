// Vercel Serverless Function Entry Point
// All requests to the backend are handled here.
// DO NOT call app.listen() — Vercel manages the HTTP server.
'use strict';

// Load env vars first (no-op on Vercel since vars come from dashboard)
require('dotenv').config();

let app;
try {
  app = require('../src/app');
} catch (err) {
  console.error('[Vercel] FATAL: Failed to load app:', err.message, err.stack);
  // Return a plain 500 if the app itself fails to load
  app = (req, res) => {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: false, message: 'Server failed to initialize', error: err.message }));
  };
}

module.exports = app;
