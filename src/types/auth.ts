export interface User {
  id: string;
  username: string;
  email?: string;
  isGuest: boolean;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
