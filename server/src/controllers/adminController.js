const { query } = require('../config/database');
const { sendSuccess, sendError, sendPaginated } = require('../utils/response');
const { getPagination } = require('../utils/helpers');
const { getOpenAIClient } = require('../config/openai');
const { PDFParse } = require('pdf-parse');
const pdfParse = async (buffer) => {
  const parser = new PDFParse(new Uint8Array(buffer));
  const result = await parser.getText();
  return { text: result.text || '' };
};

const getAuditLogs = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req.query);
    const { user_id, action, resource_type, date, search } = req.query;
    const conditions = ['1=1'];
    const params = [];
    let i = 1;

    if (user_id) { conditions.push(`al.user_id = $${i++}`); params.push(user_id); }
    if (action) { conditions.push(`al.action ILIKE $${i++}`); params.push(`%${action}%`); }
    if (resource_type) { conditions.push(`al.resource_type = $${i++}`); params.push(resource_type); }
    if (date) { conditions.push(`al.created_at::date = $${i++}`); params.push(date); }
    if (search) {
      conditions.push(`(u.first_name ILIKE $${i} OR u.last_name ILIKE $${i} OR u.email ILIKE $${i})`);
      params.push(`%${search}%`);
      i++;
    }

    const whereClause = conditions.join(' AND ');
    const [dataResult, countResult] = await Promise.all([
      query(
        `SELECT al.*, 
                COALESCE(NULLIF(TRIM(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')), ''), 'Unknown User') as user_name,
                COALESCE(u.email, 'N/A') as email
         FROM audit_logs al LEFT JOIN users u ON al.user_id = u.id
         WHERE ${whereClause} ORDER BY al.created_at DESC LIMIT $${i++} OFFSET $${i++}`,
        [...params, limit, offset]
      ),
      query(`SELECT COUNT(*) FROM audit_logs al LEFT JOIN users u ON al.user_id = u.id WHERE ${whereClause}`, params),
    ]);

    sendPaginated(res, dataResult.rows, parseInt(countResult.rows[0].count), page, limit);
  } catch (err) {
    next(err);
  }
};

const getSystemStats = async (req, res, next) => {
  try {
    const [userStats, callStats, businessStats, storageStats] = await Promise.all([
      query(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE is_active) as active FROM users`),
      query(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = 'transcribed') as transcribed, SUM(duration_seconds) as total_duration FROM calls`),
      query(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = 'converted') as converted FROM businesses`),
      query(`SELECT COALESCE(SUM(file_size), 0) as total_bytes FROM calls`),
    ]);

    sendSuccess(res, {
      users: userStats.rows[0],
      calls: callStats.rows[0],
      businesses: businessStats.rows[0],
      storage: storageStats.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

const getAISettings = async (req, res, next) => {
  try {
    const result = await query(`SELECT * FROM ai_settings ORDER BY key`);
    sendSuccess(res, result.rows);
  } catch (err) {
    next(err);
  }
};

const updateAISettings = async (req, res, next) => {
  try {
    const { settings } = req.body; // [{ key, value }]
    if (!Array.isArray(settings)) return sendError(res, 400, 'Settings must be an array');

    for (const { key, value } of settings) {
      await query(
        `UPDATE ai_settings SET value = $1, updated_by = $2, updated_at = NOW() WHERE key = $3`,
        [value, req.user.id, key]
      );
    }
    sendSuccess(res, null, 'AI settings updated');
  } catch (err) {
    next(err);
  }
};

const uploadPitchPdf = async (req, res, next) => {
  try {
    if (!req.file) {
      return sendError(res, 400, 'No PDF file uploaded');
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
Analyze the following raw text extracted from an official sales pitch script PDF:

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
      console.error('[AdminController] OpenAI keyword extraction failed:', openaiErr);
      // Fallback keyword extraction using simple JS regex
      const words = rawText.toLowerCase().match(/\b[a-z]{4,15}\b/g) || [];
      const freq = {};
      words.forEach(w => { freq[w] = (freq[w] || 0) + 1; });
      keywords = Object.keys(freq)
        .sort((a, b) => freq[b] - freq[a])
        .slice(0, 15);
    }

    // 3. Save to ai_settings
    const saveSetting = async (key, val, desc) => {
      await query(`
        INSERT INTO ai_settings (key, value, description, updated_by)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (key) DO UPDATE SET 
          value = EXCLUDED.value, 
          updated_by = EXCLUDED.updated_by, 
          updated_at = NOW()`,
        [key, val, desc, req.user.id]
      );
    };

    await saveSetting('pitch_pdf_filename', filename, 'Filename of active pitch script PDF');
    await saveSetting('pitch_pdf_text', rawText, 'Extracted raw text of pitch script');
    await saveSetting('pitch_pdf_keywords', JSON.stringify(keywords), 'JSON array of pitch keywords');

    sendSuccess(res, { filename, keywords }, 'Pitch PDF parsed and active template updated successfully');
  } catch (err) {
    next(err);
  }
};

const getPitchPdfDetails = async (req, res, next) => {
  try {
    const result = await query(`
      SELECT key, value FROM ai_settings 
      WHERE key IN ('pitch_pdf_filename', 'pitch_pdf_keywords', 'pitch_pdf_text')
    `);
    
    const details = {
      filename: '',
      keywords: [],
      text: ''
    };

    result.rows.forEach(row => {
      if (row.key === 'pitch_pdf_filename') details.filename = row.value;
      if (row.key === 'pitch_pdf_text') details.text = row.value;
      if (row.key === 'pitch_pdf_keywords') {
        try {
          details.keywords = JSON.parse(row.value);
        } catch (e) {
          details.keywords = [];
        }
      }
    });

    sendSuccess(res, details);
  } catch (err) {
    next(err);
  }
};

module.exports = { getAuditLogs, getSystemStats, getAISettings, updateAISettings, uploadPitchPdf, getPitchPdfDetails };
