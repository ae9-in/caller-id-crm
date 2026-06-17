import { format, formatDistanceToNow, parseISO } from 'date-fns'

export const formatDate = (date, fmt = 'MMM d, yyyy') => {
  if (!date) return '—'
  try {
    return format(typeof date === 'string' ? parseISO(date) : date, fmt)
  } catch { return '—' }
}

export const formatDateTime = (date) => formatDate(date, 'MMM d, yyyy h:mm a')

export const formatRelative = (date) => {
  if (!date) return '—'
  try {
    return formatDistanceToNow(typeof date === 'string' ? parseISO(date) : date, { addSuffix: true })
  } catch { return '—' }
}

export const formatDuration = (seconds) => {
  if (!seconds && seconds !== 0) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export const formatFileSize = (bytes) => {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export const formatPercent = (value) => {
  if (value === null || value === undefined) return '—'
  return `${parseFloat(value).toFixed(1)}%`
}

export const formatNumber = (n) => {
  if (n === null || n === undefined) return '0'
  return parseInt(n).toLocaleString()
}

export const getStatusColor = (status) => {
  const map = {
    new_lead: 'badge-gray',
    contacted: 'badge-info',
    follow_up_required: 'badge-warning',
    interested: 'badge-success',
    meeting_scheduled: 'badge-purple',
    converted: 'badge-success',
    closed: 'badge-danger',
    pending: 'badge-warning',
    completed: 'badge-success',
    overdue: 'badge-danger',
    uploaded: 'badge-gray',
    processing: 'badge-info',
    transcribed: 'badge-success',
    failed: 'badge-danger',
    positive: 'badge-success',
    neutral: 'badge-gray',
    negative: 'badge-danger',
  }
  return map[status] || 'badge-gray'
}

export const getStatusLabel = (status) => {
  if (!status) return '—'
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export const getOutcomeColor = (outcome) => {
  const map = {
    interested: 'badge-success',
    not_interested: 'badge-danger',
    follow_up_needed: 'badge-warning',
    call_back_later: 'badge-warning',
    meeting_scheduled: 'badge-purple',
    wrong_number: 'badge-gray',
    no_answer: 'badge-gray',
    unknown: 'badge-gray',
  }
  return map[outcome] || 'badge-gray'
}
