const { query } = require('../config/database');
const { sendSuccess, sendError } = require('../utils/response');

// In-memory search cache with user isolation and 30s TTL
const searchCache = new Map();
const CACHE_TTL = 30000; // 30 seconds

// Periodic cache cleaner
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of searchCache.entries()) {
    if (now - val.timestamp > CACHE_TTL) {
      searchCache.delete(key);
    }
  }
}, 60000);

const globalSearch = async (req, res, next) => {
  try {
    const { q, type } = req.query;
    if (!q || q.length < 2) return sendError(res, 400, 'Search query must be at least 2 characters');

    const cacheKey = `${req.user.id}:${type || 'all'}:${q.toLowerCase().trim()}`;
    const cached = searchCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
      return sendSuccess(res, cached.data);
    }

    const term = `%${q}%`;
    const searches = {};

    if (!type || type === 'businesses') {
      const r = await query(
        `SELECT id, name, contact_person, email, status, 'business' as type
         FROM businesses WHERE name ILIKE $1 OR contact_person ILIKE $1 OR email ILIKE $1
         LIMIT 10`,
        [term]
      );
      searches.businesses = r.rows;
    }

    if (!type || type === 'calls') {
      const r = await query(
        `SELECT c.id, c.title, c.call_date, c.status, b.name as business_name, 'call' as type
         FROM calls c LEFT JOIN businesses b ON c.business_id = b.id
         WHERE c.title ILIKE $1 LIMIT 10`,
        [term]
      );
      searches.calls = r.rows;
    }

    if (!type || type === 'transcripts') {
      // Use native plainto_tsquery to safely handle stopwords and spaces in SQL full-text search
      const r = await query(
        `SELECT ct.call_id as id, c.title as call_title, b.name as business_name,
                ts_headline('english', ct.full_text, plainto_tsquery('english', $2), 'MaxFragments=1,MaxWords=20,MinWords=10') as snippet,
                'transcript' as type
         FROM call_transcripts ct
         JOIN calls c ON ct.call_id = c.id
         LEFT JOIN businesses b ON c.business_id = b.id
         WHERE to_tsvector('english', COALESCE(ct.full_text, '')) @@ plainto_tsquery('english', $2)
         LIMIT 10`,
        [term, q]
      );
      searches.transcripts = r.rows;
    }

    if (!type || type === 'followups') {
      const r = await query(
        `SELECT f.id, f.title, f.due_date, f.status, b.name as business_name, 'followup' as type
         FROM followups f LEFT JOIN businesses b ON f.business_id = b.id
         WHERE f.title ILIKE $1 OR f.notes ILIKE $1 LIMIT 10`,
        [term]
      );
      searches.followups = r.rows;
    }

    if (!type || type === 'notes') {
      const r = await query(
        `SELECT bn.id, bn.content, bn.created_at, b.name as business_name, 'note' as type
         FROM business_notes bn JOIN businesses b ON bn.business_id = b.id
         WHERE bn.content ILIKE $1 LIMIT 10`,
        [term]
      );
      searches.notes = r.rows;
    }

    // Cache the searches response
    searchCache.set(cacheKey, {
      timestamp: Date.now(),
      data: searches
    });

    sendSuccess(res, searches);
  } catch (err) {
    next(err);
  }
};

module.exports = { globalSearch };
