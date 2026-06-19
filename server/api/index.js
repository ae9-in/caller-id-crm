// Vercel Serverless Entry Point
// Vercel's @vercel/node runtime expects this file to export an Express app
// or a function(req, res) as the default export.
require('dotenv').config();
const app = require('../src/app');

module.exports = app;
