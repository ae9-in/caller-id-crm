const { query } = require('../config/database');
const { sendSuccess, sendError } = require('../utils/response');

const globalSearch = async (req, res, next) => {
  try {
    const { q, type } = req.query;
    if (!q || q.length < 2) return sendError(res, 400, 'Search query must be at least 2 characters');

    const term = `%${q}%`;
    const tsQuery = q.split(' ').join(' & ');

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
      const r = await query(
        `SELECT ct.call_id as id, c.title as call_title, b.name as business_name,
                ts_headline('english', ct.full_text, to_tsquery('english', $2), 'MaxFragments=1,MaxWords=20,MinWords=10') as snippet,
                'transcript' as type
         FROM call_transcripts ct
         JOIN calls c ON ct.call_id = c.id
         LEFT JOIN businesses b ON c.business_id = b.id
         WHERE to_tsvector('english', COALESCE(ct.full_text, '')) @@ to_tsquery('english', $2)
         LIMIT 10`,
        [term, tsQuery]
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

    sendSuccess(res, searches);
  } catch (err) {
    next(err);
  }
};

module.exports = { globalSearch };
