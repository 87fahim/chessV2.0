import api from './api';

export interface RegisterInput {
  username: string;
  email: string;
  password: string;
}

export interface LoginInput {
  login: string;
  password: string;
}

export const authApi = {
  register: (data: RegisterInput) => api.post('/auth/register', data),
  login: (data: LoginInput) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  refresh: (refreshToken: string) => api.post('/auth/refresh', { refreshToken }),
};

export const guestApi = {
  createSession: () => api.post('/guest/session'),
  getSession: (guestId: string) => api.get(`/guest/session/${guestId}`),
};
