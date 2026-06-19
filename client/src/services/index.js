import api from './api'

export const analyticsService = {
  getDashboard: () => api.get('/analytics/dashboard'),
  getBusinessWiseStats: () => api.get('/analytics/business-stats'),
  getCallsPerDay: (days) => api.get('/analytics/calls-per-day', { params: { days } }),
  getCallsPerUser: () => api.get('/analytics/calls-per-user'),
  getOutcomes: () => api.get('/analytics/outcomes'),
  getLeaderboard: (period) => api.get('/analytics/leaderboard', { params: { period } }),
  getMonthlyGrowth: () => api.get('/analytics/monthly-growth'),
  getUserAnalytics: (id, days) => api.get(`/analytics/user/${id}`, { params: { days } }),
}

export const followupService = {
  getAll: (params) => api.get('/followups', { params }),
  getById: (id) => api.get(`/followups/${id}`),
  create: (data) => api.post('/followups', data),
  update: (id, data) => api.put(`/followups/${id}`, data),
  delete: (id) => api.delete(`/followups/${id}`),
  getStats: () => api.get('/followups/stats'),
}

export const notificationService = {
  getAll: (params) => api.get('/notifications', { params }),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
}

export const searchService = {
  search: (q, type) => api.get('/search', { params: { q, type } }),
}

export const adminService = {
  getStats: () => api.get('/admin/stats'),
  getAuditLogs: (params) => api.get('/admin/audit-logs', { params }),
  getAISettings: () => api.get('/admin/ai-settings'),
  updateAISettings: (settings) => api.put('/admin/ai-settings', { settings }),
  getPitchDetails: () => api.get('/admin/pitch-pdf'),
  uploadPitchPdf: (formData) => api.post('/admin/pitch-pdf', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
}

export const userService = {
  getAll: (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
}
