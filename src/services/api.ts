import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: API_BASE ? `${API_BASE}/api` : '/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Single-flight refresh: when several requests 401 at the same time they must
// share one refresh call. Parallel refreshes rotate the refresh-token cookie
// multiple times and all but the winner get their session revoked.
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const refreshUrl = API_BASE ? `${API_BASE}/api/auth/refresh` : '/api/auth/refresh';
        const { data } = await axios.post(
          refreshUrl,
          {},
          {
            withCredentials: true,
            headers: { 'Content-Type': 'application/json' },
          },
        );
        const accessToken = data.data.tokens.accessToken as string;
        localStorage.setItem('accessToken', accessToken);
        return accessToken;
      } catch {
        localStorage.removeItem('accessToken');
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

// Handle 401 → try refresh once, sharing the in-flight refresh across requests
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const accessToken = await refreshAccessToken();
      if (accessToken) {
        original.headers.Authorization = `Bearer ${accessToken}`;
        return api(original);
      }
    }
    return Promise.reject(error);
  },
);

export default api;
