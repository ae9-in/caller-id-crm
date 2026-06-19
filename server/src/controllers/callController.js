const crypto = require('crypto');
const { query } = require('../config/database');
const { sendSuccess, sendError, sendPaginated } = require('../utils/response');
const { getPagination, getSortParams } = require('../utils/helpers');
const storageService = require('../services/storageService');
const { queueTranscription, transcribeCall } = require('../jobs/transcriptionJob');

const ALLOWED_SORT = ['call_date', 'duration_seconds', 'status', 'created_at', 'title'];

const getCalls = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req.query);
    const { field, dir } = getSortParams(req.query, ALLOWED_SORT);
    const { search, status, business_id, user_id, is_pitched, call_outcome } = req.query;

    const conditions = ['1=1'];
    const params = [];
    let i = 1;

    if (search) { conditions.push(`(c.title ILIKE $${i} OR b.name ILIKE $${i} OR u.first_name ILIKE $${i})`); params.push(`%${search}%`); i++; }
    if (status) { conditions.push(`c.status = $${i++}`); params.push(status); }
    if (business_id) { conditions.push(`c.business_id = $${i++}`); params.push(business_id); }
    if (call_outcome) { conditions.push(`c.call_outcome = $${i++}`); params.push(call_outcome); }
    if (is_pitched !== undefined) { conditions.push(`c.is_pitched = $${i++}`); params.push(is_pitched === 'true'); }

    // Agents see only their calls
    if (req.user.role === 'agent') {
      conditions.push(`c.user_id = $${i++}`);
      params.push(req.user.id);
    } else if (user_id) {
      conditions.push(`c.user_id = $${i++}`);
      params.push(user_id);
    }

    const whereClause = conditions.join(' AND ');

    const [dataResult, countResult] = await Promise.all([
      query(
        `SELECT c.*, 
                b.name as business_name,
                u.first_name || ' ' || u.last_name as user_name
         FROM calls c
         LEFT JOIN businesses b ON c.business_id = b.id
         LEFT JOIN users u ON c.user_id = u.id
         WHERE ${whereClause}
         ORDER BY c.${field} ${dir}
         LIMIT $${i++} OFFSET $${i++}`,
        [...params, limit, offset]
      ),
      query(`SELECT COUNT(*) FROM calls c LEFT JOIN businesses b ON c.business_id = b.id LEFT JOIN users u ON c.user_id = u.id WHERE ${whereClause}`, params),
    ]);

    sendPaginated(res, dataResult.rows, parseInt(countResult.rows[0].count), page, limit);
  } catch (err) {
    next(err);
  }
};

const getCallById = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT c.*,
              b.name as business_name, b.contact_person,
              u.first_name || ' ' || u.last_name as user_name
       FROM calls c
       LEFT JOIN businesses b ON c.business_id = b.id
       LEFT JOIN users u ON c.user_id = u.id
       WHERE c.id = $1`,
      [req.params.id]
    );
    if (!result.rows[0]) return sendError(res, 404, 'Call not found');
    sendSuccess(res, result.rows[0]);
  } catch (err) {
    next(err);
  }
};

const uploadCall = async (req, res, next) => {
  try {
    if (!req.file) return sendError(res, 400, 'Audio file is required');

    const { business_id, title, call_date, audio_language, transcription_lang } = req.body;
    const file = req.file;

    // Compute MD5 hash for duplicate detection
    const fileHash = crypto.createHash('md5').update(file.buffer).digest('hex');

    // Check for exact duplicate
    const dupCheck = await query(`SELECT c.id, c.title FROM calls c WHERE c.file_hash = $1`, [fileHash]);
    let isDuplicate = false;
    let duplicateOfId = null;
    if (dupCheck.rows.length > 0) {
      isDuplicate = true;
      duplicateOfId = dupCheck.rows[0].id;
    }

    // Get pitch threshold from AI settings
    const settingResult = await query(`SELECT value FROM ai_settings WHERE key = 'pitch_threshold_seconds'`);
    const pitchThreshold = parseInt(settingResult.rows[0]?.value || '10');

    // Parse duration using music-metadata from buffer (ESM-only package, must use dynamic import)
    let durationSeconds = 0;
    try {
      const mm = await import('music-metadata');
      const metadata = await mm.parseBuffer(file.buffer, { mimeType: file.mimetype });
      durationSeconds = Math.round(metadata.format.duration || 0);
      console.log(`[Upload] Parsed audio duration locally: ${durationSeconds} seconds`);
    } catch (err) {
      console.warn(`[Upload] Could not parse audio duration from file buffer: ${err.message}`);
    }

    // Upload to storage
    const fileKey = storageService.buildKey(req.user.id, business_id, file.originalname);
    const fileUrl = await storageService.uploadFile(fileKey, file.buffer, file.mimetype);

    // Insert call record
    const result = await query(
      `INSERT INTO calls (title, business_id, user_id, file_name, file_url, file_key, file_size, file_hash, mime_type, status, is_duplicate, duplicate_of, call_date, duration_seconds, audio_language, transcription_lang)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'uploaded', $10, $11, $12, $13, $14, $15)
       RETURNING *`,
      [
        title || file.originalname,
        business_id || null,
        req.user.id,
        file.originalname,
        fileUrl,
        fileKey,
        file.size,
        fileHash,
        file.mimetype,
        isDuplicate,
        duplicateOfId,
        call_date || new Date(),
        durationSeconds,
        audio_language || 'auto',
        transcription_lang || 'en',
      ]
    );

    const call = result.rows[0];

    // Log activity
    if (business_id) {
      await query(
        `INSERT INTO activities (business_id, call_id, user_id, type, title)
         VALUES ($1, $2, $3, 'call_uploaded', 'Call recording uploaded')`,
        [business_id, call.id, req.user.id]
      );
    }

    // Queue AI transcription
    const isProd = process.env.NODE_ENV === 'production';
    if (isProd) {
      console.log(`[Upload] Serverless environment detected. Awaiting transcription for call ${call.id}...`);
      await transcribeCall(call.id, fileKey, pitchThreshold).catch(console.error);
    } else {
      queueTranscription(call.id, fileKey, pitchThreshold).catch(console.error);
    }

    sendSuccess(res, {
      ...call,
      is_duplicate: isDuplicate,
      duplicate_of: duplicateOfId,
      duplicate_title: dupCheck.rows[0]?.title || null,
    }, 'Recording uploaded. Transcription queued.', 201);
  } catch (err) {
    next(err);
  }
};

const updateCall = async (req, res, next) => {
  try {
    const { title, business_id, call_outcome, call_date } = req.body;
    const result = await query(
      `UPDATE calls SET 
        title = COALESCE($1, title),
        business_id = COALESCE($2, business_id),
        call_outcome = COALESCE($3, call_outcome),
        call_date = COALESCE($4, call_date),
        updated_at = NOW()
       WHERE id = $5 RETURNING *`,
      [title, business_id, call_outcome, call_date, req.params.id]
    );
    if (!result.rows[0]) return sendError(res, 404, 'Call not found');
    sendSuccess(res, result.rows[0], 'Call updated');
  } catch (err) {
    next(err);
  }
};

const deleteCall = async (req, res, next) => {
  try {
    const result = await query(`SELECT file_key FROM calls WHERE id = $1`, [req.params.id]);
    if (!result.rows[0]) return sendError(res, 404, 'Call not found');

    if (result.rows[0].file_key) {
      await storageService.deleteFile(result.rows[0].file_key).catch(console.error);
    }

    await query(`DELETE FROM calls WHERE id = $1`, [req.params.id]);
    sendSuccess(res, null, 'Call deleted');
  } catch (err) {
    next(err);
  }
};

const getCallTranscript = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT ct.*, c.title as call_title FROM call_transcripts ct
       JOIN calls c ON ct.call_id = c.id WHERE ct.call_id = $1`,
      [req.params.id]
    );
    if (!result.rows[0]) return sendError(res, 404, 'Transcript not found');
    sendSuccess(res, result.rows[0]);
  } catch (err) {
    next(err);
  }
};

const getCallSummary = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT cs.*, c.title as call_title FROM call_summaries cs
       JOIN calls c ON cs.call_id = c.id WHERE cs.call_id = $1`,
      [req.params.id]
    );
    if (!result.rows[0]) return sendError(res, 404, 'Summary not found');
    sendSuccess(res, result.rows[0]);
  } catch (err) {
    next(err);
  }
};

const getCallNotes = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT cn.*, u.first_name || ' ' || u.last_name as user_name
       FROM call_notes cn LEFT JOIN users u ON cn.user_id = u.id
       WHERE cn.call_id = $1 ORDER BY cn.created_at DESC`,
      [req.params.id]
    );
    sendSuccess(res, result.rows);
  } catch (err) {
    next(err);
  }
};

const addCallNote = async (req, res, next) => {
  try {
    const { content, timestamp_seconds } = req.body;
    if (!content) return sendError(res, 400, 'Note content is required');

    const result = await query(
      `INSERT INTO call_notes (call_id, user_id, content, timestamp_seconds)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.params.id, req.user.id, content, timestamp_seconds || null]
    );
    sendSuccess(res, result.rows[0], 'Note added', 201);
  } catch (err) {
    next(err);
  }
};

const reprocessCall = async (req, res, next) => {
  try {
    const result = await query(`SELECT file_key FROM calls WHERE id = $1`, [req.params.id]);
    if (!result.rows[0]) return sendError(res, 404, 'Call not found');

    await query(`UPDATE calls SET status = 'uploaded' WHERE id = $1`, [req.params.id]);

    const isProd = process.env.NODE_ENV === 'production';
    if (isProd) {
      console.log(`[Reprocess] Serverless environment detected. Awaiting transcription for call ${req.params.id}...`);
      await transcribeCall(req.params.id, result.rows[0].file_key, 10).catch(console.error);
      sendSuccess(res, null, 'Reprocessing completed');
    } else {
      queueTranscription(req.params.id, result.rows[0].file_key, 10).catch(console.error);
      sendSuccess(res, null, 'Reprocessing queued');
    }
  } catch (err) {
    next(err);
  }
};

const getSignedUrl = async (req, res, next) => {
  try {
    const result = await query(`SELECT file_key FROM calls WHERE id = $1`, [req.params.id]);
    if (!result.rows[0]) return sendError(res, 404, 'Call not found');

    const url = await storageService.getSignedUrl(result.rows[0].file_key);
    sendSuccess(res, { url });
  } catch (err) {
    next(err);
  }
};

const uploadCallZip = async (req, res, next) => {
  try {
    if (!req.file) return sendError(res, 400, 'Zip file is required');

    const { business_id, audio_language, transcription_lang } = req.body;
    const path = require('path');
const pLimit = require('p-limit'); // v2.x CJS - exports function directly
const AdmZip = require('adm-zip');

    
    let zip;
    try {
      zip = new AdmZip(req.file.buffer);
    } catch (zipErr) {
      return sendError(res, 400, `Invalid or corrupted ZIP archive: ${zipErr.message}`);
    }
    
    const zipEntries = zip.getEntries();

    // Filter valid audio files
    const allowedExtensions = ['.mp3', '.wav', '.m4a', '.ogg'];
    const audioEntries = zipEntries.filter(entry => {
      if (entry.isDirectory) return false;
      const ext = path.extname(entry.entryName).toLowerCase();
      return allowedExtensions.includes(ext);
    });

    if (audioEntries.length === 0) {
      return sendError(res, 400, 'No supported audio files (.mp3, .wav, .m4a, .ogg) found in the ZIP archive');
    }

    // Sort alphabetically by filename
    audioEntries.sort((a, b) => a.entryName.localeCompare(b.entryName));

    // Get pitch threshold
    const settingResult = await query(`SELECT value FROM ai_settings WHERE key = 'pitch_threshold_seconds'`);
    const pitchThreshold = parseInt(settingResult.rows[0]?.value || '10');

    // music-metadata v11+ is ESM-only — must use dynamic import
    const mm = await import('music-metadata');
    const uploadLimit = pLimit(8); // Cap S3/db upload concurrency to 8

    const uploadPromises = audioEntries.map(entry => uploadLimit(async () => {
      try {
        const buffer = entry.getData();
        const filename = path.basename(entry.entryName);
        
        // Determine mimetype from extension
        const ext = path.extname(entry.entryName).toLowerCase();
        let mimetype = 'audio/mpeg';
        if (ext === '.wav') mimetype = 'audio/wav';
        else if (ext === '.m4a') mimetype = 'audio/x-m4a';
        else if (ext === '.ogg') mimetype = 'audio/ogg';

        // Compute MD5 hash for duplicate detection
        const fileHash = crypto.createHash('md5').update(buffer).digest('hex');

        // Check for duplicate
        const dupCheck = await query(`SELECT c.id FROM calls c WHERE c.file_hash = $1`, [fileHash]);
        let isDuplicate = false;
        let duplicateOfId = null;
        if (dupCheck.rows.length > 0) {
          isDuplicate = true;
          duplicateOfId = dupCheck.rows[0].id;
        }

        // Parse duration locally using music-metadata
        let durationSeconds = 0;
        try {
          const metadata = await mm.parseBuffer(buffer, { mimeType: mimetype });
          durationSeconds = Math.round(metadata.format.duration || 0);
        } catch (err) {
          console.warn(`[Zip Upload] Could not parse duration for ${filename}: ${err.message}`);
        }

        // Upload to storage
        const fileKey = storageService.buildKey(req.user.id, business_id, filename);
        const fileUrl = await storageService.uploadFile(fileKey, buffer, mimetype);

        // Insert call record
        const result = await query(
          `INSERT INTO calls (title, business_id, user_id, file_name, file_url, file_key, file_size, file_hash, mime_type, status, is_duplicate, duplicate_of, call_date, duration_seconds, audio_language, transcription_lang)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'uploaded', $10, $11, NOW(), $12, $13, $14)
           RETURNING *`,
          [
            filename.replace(/\.[^.]+$/, ''),
            business_id || null,
            req.user.id,
            filename,
            fileUrl,
            fileKey,
            buffer.length,
            fileHash,
            mimetype,
            isDuplicate,
            duplicateOfId,
            durationSeconds,
            audio_language || 'auto',
            transcription_lang || 'en',
          ]
        );

        const call = result.rows[0];

        // Log activity
        if (business_id) {
          await query(
            `INSERT INTO activities (business_id, call_id, user_id, type, title)
             VALUES ($1, $2, $3, 'call_uploaded', 'Call recording uploaded')`,
            [business_id, call.id, req.user.id]
          );
        }

        return call;
      } catch (fileErr) {
        console.error(`[Zip Upload] Error processing file entry ${entry.entryName}:`, fileErr);
        return null;
      }
    }));

    const results = await Promise.all(uploadPromises);
    const createdCalls = results.filter(Boolean);

    // Process transcription queue
    const isProd = process.env.NODE_ENV === 'production';
    if (isProd) {
      console.log(`[Batch Job] Serverless environment detected. Awaiting batch transcriptions...`);
      for (const call of createdCalls) {
        await transcribeCall(call.id, call.file_key, pitchThreshold).catch(console.error);
      }
    } else {
      (async () => {
        await Promise.all(createdCalls.map(call => {
          console.log(`[Batch Job] Enqueuing call ID: ${call.id} into global transcription queue`);
          return queueTranscription(call.id, call.file_key, pitchThreshold);
        }));
        console.log(`[Batch Job] Enqueued all ${createdCalls.length} calls successfully`);
      })().catch(console.error);
    }

    sendSuccess(res, {
      count: createdCalls.length,
      calls: createdCalls.map(c => ({ id: c.id, title: c.title, is_duplicate: c.is_duplicate })),
    }, `${createdCalls.length} calls successfully extracted and batch queued.`, 201);

  } catch (err) {
    next(err);
  }
};

const getCallFolders = async (req, res, next) => {
  try {
    const { date, user_id, search } = req.query;

    const conditions = ['1=1'];
    const params = [];
    let i = 1;

    // Scoping check (agents see only their own folders)
    if (req.user.role === 'agent') {
      conditions.push(`c.user_id = $${i++}`);
      params.push(req.user.id);
    } else if (user_id) {
      conditions.push(`c.user_id = $${i++}`);
      params.push(user_id);
    }

    if (date) {
      conditions.push(`c.call_date::date = $${i++}`);
      params.push(date);
    }

    if (search) {
      conditions.push(`(u.first_name ILIKE $${i} OR u.last_name ILIKE $${i} OR c.title ILIKE $${i} OR c.file_name ILIKE $${i})`);
      params.push(`%${search}%`);
      i++;
    }

    const whereClause = conditions.join(' AND ');

    const queryStr = `
      SELECT 
        TO_CHAR(c.call_date, 'YYYY-MM-DD') as folder_date,
        c.user_id,
        u.first_name || ' ' || u.last_name as user_name,
        u.avatar_url,
        COUNT(c.id)::int as total_calls,
        SUM(c.duration_seconds)::int as total_duration,
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'id', c.id,
            'title', c.title,
            'file_name', c.file_name,
            'file_size', c.file_size,
            'duration_seconds', c.duration_seconds,
            'status', c.status,
            'call_outcome', c.call_outcome,
            'call_date', c.call_date,
            'is_duplicate', c.is_duplicate
          ) ORDER BY c.call_date DESC
        ) as calls
      FROM calls c
      JOIN users u ON c.user_id = u.id
      WHERE ${whereClause}
      GROUP BY TO_CHAR(c.call_date, 'YYYY-MM-DD'), c.user_id, u.first_name, u.last_name, u.avatar_url
      ORDER BY folder_date DESC, user_name ASC
    `;

    const result = await query(queryStr, params);
    sendSuccess(res, result.rows);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getCalls, getCallById, uploadCall, updateCall, deleteCall,
  getCallTranscript, getCallSummary, getCallNotes, addCallNote,
  reprocessCall, getSignedUrl, uploadCallZip, getCallFolders,
};
