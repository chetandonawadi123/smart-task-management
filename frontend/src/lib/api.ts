import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('stm_access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && sessionStorage.getItem('stm_access_token')) {
      sessionStorage.removeItem('stm_access_token');
      window.dispatchEvent(new Event('stm:unauthorized'));
    }
    return Promise.reject(error);
  }
);

export default api;
