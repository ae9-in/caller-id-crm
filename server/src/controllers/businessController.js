const { query } = require('../config/database');
const { sendSuccess, sendError, sendPaginated } = require('../utils/response');
const { getPagination, getSortParams } = require('../utils/helpers');
const { getOpenAIClient } = require('../config/openai');
// pdf-parse v1 exports a single async function: pdfParse(buffer) => { text, numpages, ... }
const pdfParse = require('pdf-parse');

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
    
    if (assigned_user_id) {
      conditions.push(`(b.assigned_user_id = $${i} OR EXISTS (SELECT 1 FROM business_assignees ba WHERE ba.business_id = b.id AND ba.user_id = $${i}))`);
      params.push(assigned_user_id);
      i++;
    }

    // Agents see only assigned businesses
    if (req.user.role === 'agent') {
      conditions.push(`(b.assigned_user_id = $${i} OR EXISTS (SELECT 1 FROM business_assignees ba WHERE ba.business_id = b.id AND ba.user_id = $${i}))`);
      params.push(req.user.id);
      i++;
    }

    const whereClause = conditions.join(' AND ');

    const [dataResult, countResult] = await Promise.all([
      query(
        `SELECT b.*, 
                u.first_name || ' ' || u.last_name as assigned_user_name,
                COALESCE(json_agg(DISTINCT jsonb_build_object('id', t.id, 'name', t.name, 'color', t.color)) FILTER (WHERE t.id IS NOT NULL), '[]') as tags,
                COALESCE(json_agg(DISTINCT jsonb_build_object('id', ua.id, 'first_name', ua.first_name, 'last_name', ua.last_name, 'email', ua.email)) FILTER (WHERE ua.id IS NOT NULL), '[]') as assignees
         FROM businesses b
         LEFT JOIN users u ON b.assigned_user_id = u.id
         LEFT JOIN business_assignees bas ON b.id = bas.business_id
         LEFT JOIN users ua ON bas.user_id = ua.id
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
              COALESCE(json_agg(DISTINCT jsonb_build_object('id', t.id, 'name', t.name, 'color', t.color)) FILTER (WHERE t.id IS NOT NULL), '[]') as tags,
              COALESCE(json_agg(DISTINCT jsonb_build_object('id', ua.id, 'first_name', ua.first_name, 'last_name', ua.last_name, 'email', ua.email)) FILTER (WHERE ua.id IS NOT NULL), '[]') as assignees
       FROM businesses b
       LEFT JOIN users u ON b.assigned_user_id = u.id
       LEFT JOIN users cb ON b.created_by = cb.id
       LEFT JOIN business_assignees bas ON b.id = bas.business_id
       LEFT JOIN users ua ON bas.user_id = ua.id
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
      website, address, city, state, status, priority, assigned_user_id, assigned_user_ids, notes, tags,
    } = req.body;

    if (!name) return sendError(res, 400, 'Business name is required');

    let userIds = [];
    if (assigned_user_ids && Array.isArray(assigned_user_ids)) {
      userIds = assigned_user_ids;
    } else if (assigned_user_id) {
      userIds = [assigned_user_id];
    } else {
      userIds = [req.user.id];
    }

    const primaryAssignedUserId = userIds[0] || null;

    const result = await query(
      `INSERT INTO businesses (name, category, industry, contact_person, phone, email, website, address, city, state, status, priority, assigned_user_id, created_by, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       RETURNING *`,
      [name, category, industry, contact_person, phone, email, website, address, city, state,
       status || 'new_lead', priority || 'medium', primaryAssignedUserId, req.user.id, notes]
    );

    const business = result.rows[0];

    if (userIds.length > 0) {
      const assigneeInserts = userIds.map((userId) => `('${business.id}', '${userId}')`).join(',');
      await query(`INSERT INTO business_assignees (business_id, user_id) VALUES ${assigneeInserts} ON CONFLICT DO NOTHING`);
    }

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
    const { tags, assigned_user_ids, ...fields } = req.body;
    
    if (assigned_user_ids !== undefined && Array.isArray(assigned_user_ids)) {
      await query(`DELETE FROM business_assignees WHERE business_id = $1`, [req.params.id]);
      if (assigned_user_ids.length > 0) {
        const assigneeInserts = assigned_user_ids.map((userId) => `('${req.params.id}', '${userId}')`).join(',');
        await query(`INSERT INTO business_assignees (business_id, user_id) VALUES ${assigneeInserts} ON CONFLICT DO NOTHING`);
        fields.assigned_user_id = assigned_user_ids[0];
      } else {
        fields.assigned_user_id = null;
      }
    } else if (fields.assigned_user_id !== undefined) {
      await query(`DELETE FROM business_assignees WHERE business_id = $1`, [req.params.id]);
      if (fields.assigned_user_id) {
        await query(`INSERT INTO business_assignees (business_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [req.params.id, fields.assigned_user_id]);
      }
    }

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

const uploadBusinessPitchPdf = async (req, res, next) => {
  try {
    const businessId = req.params.id;
    if (!req.file) {
      return sendError(res, 400, 'No PDF file uploaded');
    }

    // Check if business exists
    const bizCheck = await query('SELECT id, name FROM businesses WHERE id = $1', [businessId]);
    if (bizCheck.rows.length === 0) {
      return sendError(res, 404, 'Business not found');
    }

    const pdfBuffer = req.file.buffer;
    const filename = req.file.originalname;

    // 1. Parse text from PDF
    const parsedPdf = await pdfParse(pdfBuffer);
    const rawText = parsedPdf.text || '';

    if (!rawText.trim()) {
      return sendError(res, 400, 'The uploaded PDF appears to be empty or unreadable');
    }

    // 2. Call OpenAI to extract keywords
    let keywords = [];
    try {
      const client = getOpenAIClient();
      if (client) {
        const prompt = `You are an expert sales and AI coaching analyst.
Analyze the following raw text extracted from an official sales pitch script PDF for the business "${bizCheck.rows[0].name}":

---
${rawText}
---

Your task is to:
1. Extract 15 to 20 key words or short phrases that are essential to this pitch (e.g. product name, core benefit, technical features, call-to-actions, pricing, or target client mentions).
2. The keywords should be normalized to lowercase.
3. Keep the keywords simple so they can be easily searched for in call transcripts.

Respond with ONLY valid JSON in this exact format:
{
  "keywords": ["keyword1", "keyword2", "keyword3", ...]
}`;

        const response = await client.chat.completions.create({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
          temperature: 0.3,
        });

        const parsedContent = JSON.parse(response.choices[0].message.content);
        keywords = parsedContent.keywords || [];
      }
    } catch (openaiErr) {
      console.error('[BusinessController] OpenAI keyword extraction failed:', openaiErr);
      // Fallback keyword extraction using simple JS regex
      const words = rawText.toLowerCase().match(/\b[a-z]{4,15}\b/g) || [];
      const freq = {};
      words.forEach(w => { freq[w] = (freq[w] || 0) + 1; });
      keywords = Object.keys(freq)
        .sort((a, b) => freq[b] - freq[a])
        .slice(0, 15);
    }

    // 3. Update business row
    await query(
      `UPDATE businesses 
       SET pitch_pdf_filename = $1, 
           pitch_pdf_text = $2, 
           pitch_pdf_keywords = $3, 
           updated_at = NOW() 
       WHERE id = $4`,
      [filename, rawText, JSON.stringify(keywords), businessId]
    );

    // 4. Log activity
    await query(
      `INSERT INTO activities (business_id, user_id, type, title, description)
       VALUES ($1, $2, 'business_updated', $3, $4)`,
      [businessId, req.user.id, 'Pitch script uploaded', `Pitch PDF "${filename}" uploaded and parsed by ${req.user.first_name}`]
    );

    sendSuccess(res, { filename, keywords }, 'Pitch PDF parsed and attached to business successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getBusinesses, getBusinessById, createBusiness, updateBusiness,
  deleteBusiness, getBusinessTimeline, getBusinessCalls,
  getBusinessNotes, addBusinessNote, getTags, createTag,
  getBusinessesForAssignment, assignBusinessesToUser, uploadBusinessPitchPdf,
};
