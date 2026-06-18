import api from './api'

export const callService = {
  getAll: (params) => api.get('/calls', { params }),
  getCallFolders: (params) => api.get('/calls/folders', { params }),
  getById: (id) => api.get(`/calls/${id}`),
  upload: (formData, onProgress) =>
    api.post('/calls/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress,
    }),
  uploadZip: (formData, onProgress) =>
    api.post('/calls/upload-zip', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress,
    }),
  update: (id, data) => api.put(`/calls/${id}`, data),
  delete: (id) => api.delete(`/calls/${id}`),
  getTranscript: (id) => api.get(`/calls/${id}/transcript`),
  getSummary: (id) => api.get(`/calls/${id}/summary`),
  getNotes: (id) => api.get(`/calls/${id}/notes`),
  addNote: (id, data) => api.post(`/calls/${id}/notes`, data),
  reprocess: (id) => api.post(`/calls/${id}/reprocess`),
  getSignedUrl: (id) => api.get(`/calls/${id}/signed-url`),
}
