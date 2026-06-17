const { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } = require('../config/constants');

const getPagination = (query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(MAX_PAGE_SIZE, parseInt(query.limit) || DEFAULT_PAGE_SIZE);
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

const getSortParams = (query, allowedFields, defaultField = 'created_at', defaultDir = 'DESC') => {
  const field = allowedFields.includes(query.sort) ? query.sort : defaultField;
  const dir = ['ASC', 'DESC'].includes(query.order?.toUpperCase()) ? query.order.toUpperCase() : defaultDir;
  return { field, dir };
};

const sanitizeString = (str) => {
  if (!str) return '';
  return str.toString().trim().slice(0, 500);
};

const formatDuration = (seconds) => {
  if (!seconds) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const buildSearchCondition = (searchTerm, fields) => {
  if (!searchTerm) return { condition: '', params: [] };
  const escapedTerm = `%${searchTerm.replace(/[%_]/g, '\\$&')}%`;
  const conditions = fields.map((f) => `${f} ILIKE $1`).join(' OR ');
  return { condition: `(${conditions})`, params: [escapedTerm] };
};

module.exports = { getPagination, getSortParams, sanitizeString, formatDuration, buildSearchCondition };
