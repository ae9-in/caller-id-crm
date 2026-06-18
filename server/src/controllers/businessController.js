const { query } = require('../config/database');
const { sendSuccess, sendError, sendPaginated } = require('../utils/response');
const { getPagination, getSortParams } = require('../utils/helpers');

const ALLOWED_SORT = ['name', 'status', 'priority', 'created_at', 'updated_at'];

const getBusinesses = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req.query);
    const { field, dir } = getSortParams(req.query, ALLOWED_SORT);
    const { search, status, priority, assigned_user_id } = req.query;

    const conditions = ['1=1'];
    const params = [];
    let i = 1;

    if (search) { conditions.push(`(b.name ILIKE $${i} OR b.contact_person ILIKE $${i} OR b.email ILIKE $${i})`); params.push(`%${search}%`); i++; }
    if (status) { conditions.push(`b.status = $${i++}`); params.push(status); }
    if (priority) { conditions.push(`b.priority = $${i++}`); params.push(priority); }
    if (assigned_user_id) { conditions.push(`b.assigned_user_id = $${i++}`); params.push(assigned_user_id); }

    // Agents see only assigned businesses
    if (req.user.role === 'agent') {
      conditions.push(`b.assigned_user_id = $${i++}`);
      params.push(req.user.id);
    }

    const whereClause = conditions.join(' AND ');

    const [dataResult, countResult] = await Promise.all([
      query(
        `SELECT b.*, 
                u.first_name || ' ' || u.last_name as assigned_user_name,
                COALESCE(json_agg(DISTINCT jsonb_build_object('id', t.id, 'name', t.name, 'color', t.color)) FILTER (WHERE t.id IS NOT NULL), '[]') as tags
         FROM businesses b
         LEFT JOIN users u ON b.assigned_user_id = u.id
         LEFT JOIN business_tags bt ON b.id = bt.business_id
         LEFT JOIN tags t ON bt.tag_id = t.id
         WHERE ${whereClause}
         GROUP BY b.id, u.first_name, u.last_name
         ORDER BY b.${field} ${dir}
         LIMIT $${i++} OFFSET $${i++}`,
        [...params, limit, offset]
      ),
      query(`SELECT COUNT(DISTINCT b.id) FROM businesses b WHERE ${whereClause}`, params),
    ]);

    sendPaginated(res, dataResult.rows, parseInt(countResult.rows[0].count), page, limit);
  } catch (err) {
    next(err);
  }
};

const getBusinessById = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT b.*,
              u.first_name || ' ' || u.last_name as assigned_user_name,
              cb.first_name || ' ' || cb.last_name as created_by_name,
              COALESCE(json_agg(DISTINCT jsonb_build_object('id', t.id, 'name', t.name, 'color', t.color)) FILTER (WHERE t.id IS NOT NULL), '[]') as tags
       FROM businesses b
       LEFT JOIN users u ON b.assigned_user_id = u.id
       LEFT JOIN users cb ON b.created_by = cb.id
       LEFT JOIN business_tags bt ON b.id = bt.business_id
       LEFT JOIN tags t ON bt.tag_id = t.id
       WHERE b.id = $1
       GROUP BY b.id, u.first_name, u.last_name, cb.first_name, cb.last_name`,
      [req.params.id]
    );
    if (!result.rows[0]) return sendError(res, 404, 'Business not found');
    sendSuccess(res, result.rows[0]);
  } catch (err) {
    next(err);
  }
};

const createBusiness = async (req, res, next) => {
  try {
    const {
      name, category, industry, contact_person, phone, email,
      website, address, city, state, status, priority, assigned_user_id, notes, tags,
    } = req.body;

    if (!name) return sendError(res, 400, 'Business name is required');

    const result = await query(
      `INSERT INTO businesses (name, category, industry, contact_person, phone, email, website, address, city, state, status, priority, assigned_user_id, created_by, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       RETURNING *`,
      [name, category, industry, contact_person, phone, email, website, address, city, state,
       status || 'new_lead', priority || 'medium', assigned_user_id || req.user.id, req.user.id, notes]
    );

    const business = result.rows[0];

    if (tags && Array.isArray(tags) && tags.length > 0) {
      const tagInserts = tags.map((tagId) => `('${business.id}', '${tagId}')`).join(',');
      await query(`INSERT INTO business_tags (business_id, tag_id) VALUES ${tagInserts} ON CONFLICT DO NOTHING`);
    }

    await query(
      `INSERT INTO activities (business_id, user_id, type, title, description)
       VALUES ($1, $2, 'business_created', $3, $4)`,
      [business.id, req.user.id, `Business created: ${name}`, `New business added by ${req.user.first_name}`]
    );

    sendSuccess(res, business, 'Business created', 201);
  } catch (err) {
    next(err);
  }
};

const updateBusiness = async (req, res, next) => {
  try {
    const { tags, ...fields } = req.body;
    const allowed = ['name','category','industry','contact_person','phone','email','website','address','city','state','status','priority','assigned_user_id','notes'];
    const updates = [];
    const params = [];
    let i = 1;

    for (const key of allowed) {
      if (fields[key] !== undefined) {
        updates.push(`${key} = $${i++}`);
        params.push(fields[key]);
      }
    }

    if (updates.length > 0) {
      params.push(req.params.id);
      const result = await query(
        `UPDATE businesses SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${i} RETURNING *`,
        params
      );
      if (!result.rows[0]) return sendError(res, 404, 'Business not found');
    }

    if (tags !== undefined && Array.isArray(tags)) {
      await query(`DELETE FROM business_tags WHERE business_id = $1`, [req.params.id]);
      if (tags.length > 0) {
        const tagInserts = tags.map((tagId) => `('${req.params.id}', '${tagId}')`).join(',');
        await query(`INSERT INTO business_tags (business_id, tag_id) VALUES ${tagInserts} ON CONFLICT DO NOTHING`);
      }
    }

    await query(
      `INSERT INTO activities (business_id, user_id, type, title)
       VALUES ($1, $2, 'business_updated', 'Business details updated')`,
      [req.params.id, req.user.id]
    );

    const updated = await query(`SELECT * FROM businesses WHERE id = $1`, [req.params.id]);
    sendSuccess(res, updated.rows[0], 'Business updated');
  } catch (err) {
    next(err);
  }
};

const deleteBusiness = async (req, res, next) => {
  try {
    const result = await query(`DELETE FROM businesses WHERE id = $1 RETURNING id, name`, [req.params.id]);
    if (!result.rows[0]) return sendError(res, 404, 'Business not found');
    sendSuccess(res, null, `Business "${result.rows[0].name}" deleted`);
  } catch (err) {
    next(err);
  }
};

const getBusinessTimeline = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT a.*, u.first_name || ' ' || u.last_name as user_name
       FROM activities a
       LEFT JOIN users u ON a.user_id = u.id
       WHERE a.business_id = $1
       ORDER BY a.created_at DESC LIMIT 50`,
      [req.params.id]
    );
    sendSuccess(res, result.rows);
  } catch (err) {
    next(err);
  }
};

const getBusinessCalls = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT c.*, u.first_name || ' ' || u.last_name as user_name
       FROM calls c
       LEFT JOIN users u ON c.user_id = u.id
       WHERE c.business_id = $1
       ORDER BY c.call_date DESC`,
      [req.params.id]
    );
    sendSuccess(res, result.rows);
  } catch (err) {
    next(err);
  }
};

const getBusinessNotes = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT bn.*, u.first_name || ' ' || u.last_name as user_name
       FROM business_notes bn
       LEFT JOIN users u ON bn.user_id = u.id
       WHERE bn.business_id = $1 ORDER BY bn.created_at DESC`,
      [req.params.id]
    );
    sendSuccess(res, result.rows);
  } catch (err) {
    next(err);
  }
};

const addBusinessNote = async (req, res, next) => {
  try {
    const { content } = req.body;
    if (!content) return sendError(res, 400, 'Note content is required');

    const result = await query(
      `INSERT INTO business_notes (business_id, user_id, content)
       VALUES ($1, $2, $3) RETURNING *`,
      [req.params.id, req.user.id, content]
    );

    await query(
      `INSERT INTO activities (business_id, user_id, type, title)
       VALUES ($1, $2, 'note_added', 'Note added')`,
      [req.params.id, req.user.id]
    );

    sendSuccess(res, result.rows[0], 'Note added', 201);
  } catch (err) {
    next(err);
  }
};

const getTags = async (req, res, next) => {
  try {
    const result = await query(`SELECT * FROM tags ORDER BY name`);
    sendSuccess(res, result.rows);
  } catch (err) {
    next(err);
  }
};

const createTag = async (req, res, next) => {
  try {
    const { name, color } = req.body;
    if (!name) return sendError(res, 400, 'Tag name is required');
    const result = await query(
      `INSERT INTO tags (name, color) VALUES ($1, $2) RETURNING *`,
      [name, color || '#6366f1']
    );
    sendSuccess(res, result.rows[0], 'Tag created', 201);
  } catch (err) {
    next(err);
  }
};

const getBusinessesForAssignment = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, name, assigned_user_id FROM businesses ORDER BY name ASC`
    );
    sendSuccess(res, result.rows);
  } catch (err) {
    next(err);
  }
};

const assignBusinessesToUser = async (req, res, next) => {
  try {
    const userId = req.params.userId;
    const { businessIds } = req.body; // Array of business IDs

    if (!Array.isArray(businessIds)) {
      return sendError(res, 400, 'businessIds must be an array');
    }

    // 1. Unassign all businesses currently assigned to this user
    await query(
      `UPDATE businesses SET assigned_user_id = NULL, updated_at = NOW() WHERE assigned_user_id = $1`,
      [userId]
    );

    // 2. Assign the new ones if the array is not empty
    if (businessIds.length > 0) {
      const placeholders = businessIds.map((_, index) => `$${index + 2}`).join(', ');
      await query(
        `UPDATE businesses SET assigned_user_id = $1, updated_at = NOW() WHERE id IN (${placeholders})`,
        [userId, ...businessIds]
      );
    }

    sendSuccess(res, null, 'Businesses assigned successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getBusinesses, getBusinessById, createBusiness, updateBusiness,
  deleteBusiness, getBusinessTimeline, getBusinessCalls,
  getBusinessNotes, addBusinessNote, getTags, createTag,
  getBusinessesForAssignment, assignBusinessesToUser,
};
