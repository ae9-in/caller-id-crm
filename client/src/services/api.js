import axios from 'axios'

const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && !envUrl.includes('onrender.com')) {
    return envUrl;
  }
  return '/api';
};

const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('crm_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('crm_token')
      localStorage.removeItem('crm_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
