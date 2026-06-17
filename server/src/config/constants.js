module.exports = {
  ROLES: {
    ADMIN: 'admin',
    MANAGER: 'manager',
    AGENT: 'agent',
  },

  BUSINESS_STATUSES: [
    'new_lead',
    'contacted',
    'follow_up_required',
    'interested',
    'meeting_scheduled',
    'converted',
    'closed',
  ],

  CALL_OUTCOMES: [
    'interested',
    'not_interested',
    'follow_up_needed',
    'call_back_later',
    'meeting_scheduled',
    'wrong_number',
    'no_answer',
    'unknown',
  ],

  CALL_STATUSES: ['uploaded', 'processing', 'transcribed', 'failed'],

  FOLLOWUP_STATUSES: ['pending', 'completed', 'overdue', 'cancelled'],

  ACTIVITY_TYPES: [
    'call_uploaded',
    'business_created',
    'business_updated',
    'follow_up_created',
    'follow_up_completed',
    'meeting_scheduled',
    'note_added',
    'status_changed',
    'tag_added',
  ],

  NOTIFICATION_TYPES: [
    'follow_up_reminder',
    'recording_processed',
    'meeting_scheduled',
    'business_assigned',
    'system',
  ],

  ALLOWED_AUDIO_TYPES: ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/x-m4a', 'audio/ogg'],
  MAX_FILE_SIZE_BYTES: (parseInt(process.env.MAX_FILE_SIZE_MB) || 100) * 1024 * 1024,

  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
};
