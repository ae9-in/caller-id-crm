import api from './api'

export const businessService = {
  getAll: (params) => api.get('/businesses', { params }),
  getById: (id) => api.get(`/businesses/${id}`),
  create: (data) => api.post('/businesses', data),
  update: (id, data) => api.put(`/businesses/${id}`, data),
  delete: (id) => api.delete(`/businesses/${id}`),
  getTimeline: (id) => api.get(`/businesses/${id}/timeline`),
  getCalls: (id) => api.get(`/businesses/${id}/calls`),
  getNotes: (id) => api.get(`/businesses/${id}/notes`),
  addNote: (id, content) => api.post(`/businesses/${id}/notes`, { content }),
  getTags: () => api.get('/businesses/tags'),
  createTag: (data) => api.post('/businesses/tags', data),
}
