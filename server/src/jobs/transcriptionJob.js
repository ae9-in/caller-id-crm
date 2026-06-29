const { query } = require('../config/database');
const { transcribeAudio, generateSummary, analyzeSpeakers } = require('../services/aiService');
const storageService = require('../services/storageService');
const logger = require('../utils/logger');
const pLimit = require('p-limit'); // v2.x CJS - exports function directly

const concurrency = process.env.TRANSCRIBE_CONCURRENCY ? parseInt(process.env.TRANSCRIBE_CONCURRENCY) : 4;
const queueLimit = pLimit(concurrency);

/**
 * Background job: Transcribe a call and generate AI analysis
 * This runs asynchronously after upload without blocking the upload response
 */
const transcribeCall = async (callId, fileKey, pitchThreshold = 10, webhookUrl = null) => {
  try {
    logger.info(`[Job] Starting transcription for call ${callId}`);

    // Check if the call is a duplicate
    const callDataQuery = await query(`SELECT is_duplicate, duplicate_of, business_id FROM calls WHERE id = $1`, [callId]);
    if (callDataQuery.rows.length > 0 && callDataQuery.rows[0].is_duplicate && callDataQuery.rows[0].duplicate_of) {
      const originalCallId = callDataQuery.rows[0].duplicate_of;
      const businessId = callDataQuery.rows[0].business_id;
      
      // Copy transcript
      const transcriptResult = await query(`SELECT * FROM call_transcripts WHERE call_id = $1`, [originalCallId]);
      if (transcriptResult.rows.length > 0) {
        logger.info(`[Job] Call ${callId} is a duplicate of ${originalCallId}. Copying original transcript and summary...`);
        const tx = transcriptResult.rows[0];
        const stringifyField = (field) => typeof field === 'object' && field !== null ? JSON.stringify(field) : field;
        
        await query(
          `INSERT INTO call_transcripts (call_id, full_text, speaker_segments, word_count, language, confidence_score)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (call_id) DO UPDATE SET
             full_text = EXCLUDED.full_text,
             speaker_segments = EXCLUDED.speaker_segments,
             word_count = EXCLUDED.word_count,
             language = EXCLUDED.language,
             updated_at = NOW()`,
          [callId, tx.full_text, stringifyField(tx.speaker_segments), tx.word_count, tx.language, tx.confidence_score]
        );

        // Copy summary
        const summaryResult = await query(`SELECT * FROM call_summaries WHERE call_id = $1`, [originalCallId]);
        if (summaryResult.rows.length > 0) {
          const sm = summaryResult.rows[0];
          await query(
            `INSERT INTO call_summaries (call_id, summary, key_points, action_items, follow_up_suggestions, detected_outcome, sentiment, objections)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (call_id) DO UPDATE SET
               summary = EXCLUDED.summary,
               key_points = EXCLUDED.key_points,
               action_items = EXCLUDED.action_items,
               follow_up_suggestions = EXCLUDED.follow_up_suggestions,
               detected_outcome = EXCLUDED.detected_outcome,
               sentiment = EXCLUDED.sentiment,
               updated_at = NOW()`,
            [
              callId,
              sm.summary,
              stringifyField(sm.key_points),
              stringifyField(sm.action_items),
              stringifyField(sm.follow_up_suggestions),
              sm.detected_outcome,
              sm.sentiment,
              stringifyField(sm.objections)
            ]
          );
        }

        // Copy notes
        const notesResult = await query(`SELECT * FROM call_notes WHERE call_id = $1`, [originalCallId]);
        for (const note of notesResult.rows) {
          await query(
            `INSERT INTO call_notes (call_id, content, is_ai_generated)
             VALUES ($1, $2, $3)
             ON CONFLICT DO NOTHING`,
            [callId, note.content, note.is_ai_generated]
          );
        }

        // Fetch duration, agent talk time, customer talk time from original call to update the new call
        const originalCallDetails = await query(
          `SELECT duration_seconds, agent_talk_time, customer_talk_time, call_outcome, is_pitched 
           FROM calls WHERE id = $1`,
          [originalCallId]
        );
        if (originalCallDetails.rows.length > 0) {
          const o = originalCallDetails.rows[0];
          await query(
            `UPDATE calls SET 
               duration_seconds = $1,
               agent_talk_time = $2,
               customer_talk_time = $3,
               call_outcome = $4,
               is_pitched = $5,
               status = 'transcribed'
             WHERE id = $6`,
            [o.duration_seconds, o.agent_talk_time, o.customer_talk_time, o.call_outcome, o.is_pitched, callId]
          );
        } else {
          await query(`UPDATE calls SET status = 'transcribed' WHERE id = $1`, [callId]);
        }

        logger.info(`[Job] Duplicate call ${callId} successfully populated with original data.`);
        return { queued: false };
      } else {
        logger.warn(`[Job] Call ${callId} is a duplicate of ${originalCallId}, but the original call has not been transcribed yet. Falling back to standard transcription.`);
      }
    }

    // Mark as processing
    await query(`UPDATE calls SET status = 'processing' WHERE id = $1`, [callId]);

    // Fetch audio from cloud storage (no local disk on Vercel) or local filesystem (development)
    let fileUrlOrBuffer = null;
    if (fileKey) {
      try {
        const signedUrl = await storageService.getSignedUrl(fileKey);
        if (signedUrl) {
          if (signedUrl.startsWith('http')) {
            // Pass cloud URL directly to transcription service
            fileUrlOrBuffer = signedUrl;
          } else {
            // Local file fallback (development)
            const fs = require('fs');
            const path = require('path');
            
            let localPath;
            if (path.isAbsolute(signedUrl)) {
              localPath = signedUrl;
            } else {
              // signedUrl is a relative url like /uploads/recordings/...
              const cleanKey = signedUrl.startsWith('/uploads/') 
                ? signedUrl.substring(9) 
                : fileKey;
              localPath = path.join(__dirname, '../../uploads', cleanKey);
            }
            
            if (fs.existsSync(localPath)) {
              logger.info(`[Job] Reading local file: ${localPath}`);
              fileUrlOrBuffer = fs.readFileSync(localPath);
            } else {
              // try direct key in uploads dir
              const directPath = path.join(__dirname, '../../uploads', fileKey);
              if (fs.existsSync(directPath)) {
                logger.info(`[Job] Reading local file (direct key): ${directPath}`);
                fileUrlOrBuffer = fs.readFileSync(directPath);
              } else {
                throw new Error(`Local file not found at ${localPath} or ${directPath}`);
              }
            }
          }
        }
      } catch (e) {
        logger.warn(`[Job] Could not fetch file from storage: ${e.message}`);
      }
    }


    // Get call details (duration, file size, languages)
    const callResult = await query(`SELECT duration_seconds, file_size, audio_language, transcription_lang, business_id FROM calls WHERE id = $1`, [callId]);
    if (callResult.rows.length === 0) {
      logger.error(`[Job] Call ${callId} not found in database.`);
      await query(`UPDATE calls SET status = 'failed' WHERE id = $1`, [callId]);
      return;
    }
    const fileSize = callResult.rows[0]?.file_size || 0;
    const audioLanguage = callResult.rows[0]?.audio_language || 'auto';
    const transcriptionLang = 'en'; // Force English words transcription
    const businessId = callResult.rows[0]?.business_id;

    // Transcribe
    let transcriptData = null;
    if (fileUrlOrBuffer) {
      transcriptData = await transcribeAudio(fileKey, fileUrlOrBuffer, audioLanguage, transcriptionLang, webhookUrl);
    } else {
      logger.error(`[Job] No audio file available for call ${callId}. Cannot transcribe.`);
      await query(`UPDATE calls SET status = 'failed' WHERE id = $1`, [callId]);
      return;
    }

    if (transcriptData && transcriptData.queued) {
      logger.info(`[Job] Audio transcription successfully queued with AssemblyAI callback. Transcript ID: ${transcriptData.transcriptId}`);
      // Return and let webhook handle completion
      return { queued: true };
    }

    // Fallback/Synchronous path completed
    await completeTranscriptionProcessing(callId, transcriptData, businessId, fileSize, pitchThreshold);
    return { queued: false };

  } catch (err) {
    logger.error(`[Job] Transcription failed for call ${callId}: ${err.message}`);
    await query(`UPDATE calls SET status = 'failed' WHERE id = $1`, [callId]).catch(() => {});
  }
};

const completeTranscriptionProcessing = async (callId, transcriptData, businessId, fileSize, pitchThreshold = 10) => {
  logger.info(`[Job] Completing transcription processing for call ${callId}`);

  // Translate regional languages to English (always translate to English as requested)
  try {
    const detectedLang = (transcriptData.language || '').toLowerCase();
    const hasNonAscii = /[^\x00-\x7F]/.test(transcriptData.text || '');
    const isRegional = hasNonAscii || (detectedLang && detectedLang !== 'en' && !detectedLang.startsWith('en-') && !detectedLang.startsWith('en_'));
    
    if (isRegional) {
      const { translateTranscriptToEnglish } = require('../services/aiService');
      transcriptData = await translateTranscriptToEnglish(transcriptData);
    }
  } catch (translationErr) {
    logger.error(`[Job] Failed to translate transcript to English for call ${callId}: ${translationErr.message}`);
  }

  let duration = 0;
  if (transcriptData.duration) {
    duration = Math.round(transcriptData.duration);
  } else if (transcriptData.segments && transcriptData.segments.length > 0) {
    const lastSegmentEnd = Math.round(transcriptData.segments[transcriptData.segments.length - 1].end);
    if (lastSegmentEnd > 0) {
      duration = lastSegmentEnd;
    }
  }

  if (!duration || duration === 0) {
    // Estimate duration: ~16KB per second (128 kbps)
    duration = Math.max(30, Math.min(600, Math.round(fileSize / 16000)));
    logger.info(`[Job] Estimated call duration based on file size (${fileSize} bytes): ${duration} seconds`);
  }

  // Update duration_seconds in the database immediately
  await query(`UPDATE calls SET duration_seconds = $1 WHERE id = $2`, [duration, callId]);

  // Analyze speakers
  const speakerData = analyzeSpeakers(transcriptData.segments, duration);

  // Save transcript
  await query(
    `INSERT INTO call_transcripts (call_id, full_text, speaker_segments, word_count, language, confidence_score)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (call_id) DO UPDATE SET
       full_text = EXCLUDED.full_text,
       speaker_segments = EXCLUDED.speaker_segments,
       word_count = EXCLUDED.word_count,
       language = EXCLUDED.language,
       updated_at = NOW()`,
    [
      callId,
      transcriptData.text || '',
      JSON.stringify(speakerData.speaker_segments),
      (transcriptData.text || '').split(' ').length,
      transcriptData.language || 'en',
      0.95,
    ]
  );

  // Update call with speaker data and pitch status
  const isPitched = duration > pitchThreshold;
  await query(
    `UPDATE calls SET
      agent_talk_time = $1,
      customer_talk_time = $2,
      is_pitched = $3,
      status = 'processing'
     WHERE id = $4`,
    [speakerData.agent_talk_time, speakerData.customer_talk_time, isPitched, callId]
  );

  // Generate AI summary (only if text is meaningful)
  if (transcriptData.text && transcriptData.text.length > 50) {
    const summaryData = await generateSummary(transcriptData.text, duration, businessId);

    await query(
      `INSERT INTO call_summaries (call_id, summary, key_points, action_items, follow_up_suggestions, detected_outcome, sentiment, objections)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (call_id) DO UPDATE SET
         summary = EXCLUDED.summary,
         key_points = EXCLUDED.key_points,
         action_items = EXCLUDED.action_items,
         follow_up_suggestions = EXCLUDED.follow_up_suggestions,
         detected_outcome = EXCLUDED.detected_outcome,
         sentiment = EXCLUDED.sentiment,
         updated_at = NOW()`,
      [
        callId,
        summaryData.summary,
        JSON.stringify(summaryData.key_points || []),
        JSON.stringify(summaryData.action_items || []),
        JSON.stringify(summaryData.follow_up_suggestions || []),
        summaryData.detected_outcome || 'unknown',
        summaryData.sentiment || 'neutral',
        JSON.stringify(summaryData.objections || []),
      ]
    );

    // Create follow-up entries for suggestions containing "to be followed"
    if (Array.isArray(summaryData.follow_up_suggestions) && businessId) {
      const callData = await query(`SELECT user_id FROM calls WHERE id = $1`, [callId]);
      const userId = callData.rows[0]?.user_id || null;

      for (const suggestion of summaryData.follow_up_suggestions) {
        if (typeof suggestion === 'string' && suggestion.toLowerCase().includes('to be followed')) {
          // Insert a followup with a default due date of tomorrow
          await query(
            `INSERT INTO followups (business_id, call_id, title, due_date, status, assigned_user_id, created_by)
             VALUES ($1, $2, $3, NOW() + INTERVAL '1 day', 'pending', $4, $5) RETURNING id`,
            [businessId, callId, suggestion, userId, userId]
          );
        }
      }
    }

    // Update call outcome and pitch status from AI
    await query(
      `UPDATE calls SET call_outcome = $1, is_pitched = $2, status = 'transcribed' WHERE id = $3`,
      [summaryData.detected_outcome || 'unknown', summaryData.is_pitched !== undefined ? summaryData.is_pitched : isPitched, callId]
    );
  } else {
    await query(`UPDATE calls SET status = 'transcribed' WHERE id = $1`, [callId]);
  }

  // Create AI note
  if (transcriptData.text && transcriptData.text.length > 50) {
    await query(
      `INSERT INTO call_notes (call_id, content, is_ai_generated)
       VALUES ($1, $2, true)`,
      [callId, 'AI transcription and analysis completed successfully.']
    );
  }

  // Notify the user
  const callData = await query(
    `SELECT user_id, title FROM calls WHERE id = $1`, [callId]
  );
  if (callData.rows[0]) {
    await query(
      `INSERT INTO notifications (user_id, type, title, message, link)
       VALUES ($1, 'recording_processed', 'Recording Processed', $2, $3)`,
      [
        callData.rows[0].user_id,
        `Your call "${callData.rows[0].title}" has been transcribed and analyzed.`,
        `/calls/${callId}`,
      ]
    );
  }
};

const queueTranscription = (callId, fileKey, pitchThreshold, webhookUrl = null) => {
  return queueLimit(async () => {
    logger.info(`[Queue] Running transcription for call ${callId}. Queue stats: active=${queueLimit.activeCount}, pending=${queueLimit.pendingCount}`);
    await transcribeCall(callId, fileKey, pitchThreshold, webhookUrl);
  });
};

module.exports = { transcribeCall, queueTranscription, completeTranscriptionProcessing };
