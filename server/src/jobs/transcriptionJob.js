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
    const transcriptionLang = callResult.rows[0]?.transcription_lang || 'en';
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
