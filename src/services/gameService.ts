import api from './api';

export interface CreateGameInput {
  mode: string;
  whitePlayer: { type: string; userId?: string; guestId?: string; name: string };
  blackPlayer: { type: string; userId?: string; guestId?: string; name: string };
  fen?: string;
  timeControl?: { initialMs: number; incrementMs: number };
  difficulty?: string;
  label?: string;
}

export const gameApi = {
  list: (status?: string) => api.get('/games', { params: status ? { status } : {} }),
  create: (data: CreateGameInput) => api.post('/games', data),
  get: (id: string) => api.get(`/games/${id}`),
  update: (id: string, data: Record<string, unknown>) => api.put(`/games/${id}`, data),
  delete: (id: string) => api.delete(`/games/${id}`),
};

export const historyApi = {
  list: (params?: Record<string, string | number>) => api.get('/history', { params }),
  get: (id: string) => api.get(`/history/${id}`),
};

export const matchmakingApi = {
  join: (data: { timeControl: { initialMs: number; incrementMs: number }; preferredColor?: string; rated?: boolean }) =>
    api.post('/matchmaking/join', data),
  leave: () => api.post('/matchmaking/leave'),
  status: () => api.get('/matchmaking/status'),
};
