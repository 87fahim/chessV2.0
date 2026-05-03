import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authApi, guestApi } from '../../services/authService';
import type { RegisterInput, LoginInput } from '../../services/authService';

interface UserProfile {
  _id: string;
  username: string;
  email: string;
  role: string;
}

interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  guestId: string | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isGuest: false,
  guestId: localStorage.getItem('guestId'),
  isLoading: false,
  error: null,
};

export const register = createAsyncThunk('auth/register', async (input: RegisterInput, { rejectWithValue }) => {
  try {
    const { data } = await authApi.register(input);
    const { user, tokens } = data.data;
    localStorage.setItem('accessToken', tokens.accessToken);
    localStorage.removeItem('guestId');
    return user;
  } catch (err: unknown) {
    const error = err as { response?: { data?: { error?: string; details?: Array<{ message: string }> } } };
    const msg = error.response?.data?.details?.[0]?.message || error.response?.data?.error || 'Registration failed';
    return rejectWithValue(msg);
  }
});

export const login = createAsyncThunk('auth/login', async (input: LoginInput, { rejectWithValue }) => {
  try {
    const { data } = await authApi.login(input);
    const { user, tokens } = data.data;
    localStorage.setItem('accessToken', tokens.accessToken);
    localStorage.removeItem('guestId');
    return user;
  } catch (err: unknown) {
    const error = err as { response?: { data?: { error?: string } } };
    return rejectWithValue(error.response?.data?.error || 'Login failed');
  }
});

export const fetchMe = createAsyncThunk('auth/fetchMe', async (_, { rejectWithValue }) => {
  try {
    const { data } = await authApi.getMe();
    return data.data.user;
  } catch {
    localStorage.removeItem('accessToken');
    return rejectWithValue('Session expired');
  }
});

export const logout = createAsyncThunk('auth/logout', async () => {
  try {
    await authApi.logout();
  } finally {
    localStorage.removeItem('accessToken');
  }
});

export const enterGuestMode = createAsyncThunk('auth/enterGuest', async (_, { rejectWithValue }) => {
  try {
    const existingId = localStorage.getItem('guestId');
    if (existingId) {
      try {
        await guestApi.getSession(existingId);
        return existingId;
      } catch {
        // Guest session expired, create new one
      }
    }
    const { data } = await guestApi.createSession();
    const guestId = data.data.session.guestId;
    localStorage.setItem('guestId', guestId);
    return guestId;
  } catch {
    return rejectWithValue('Failed to create guest session');
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Register
    builder.addCase(register.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(register.fulfilled, (state, action) => {
      state.isLoading = false;
      state.user = action.payload;
      state.isAuthenticated = true;
      state.isGuest = false;
      state.guestId = null;
    });
    builder.addCase(register.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Login
    builder.addCase(login.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(login.fulfilled, (state, action) => {
      state.isLoading = false;
      state.user = action.payload;
      state.isAuthenticated = true;
      state.isGuest = false;
      state.guestId = null;
    });
    builder.addCase(login.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Fetch me
    builder.addCase(fetchMe.fulfilled, (state, action) => {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.isGuest = false;
    });
    builder.addCase(fetchMe.rejected, (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.isGuest = false;
    });

    // Logout
    builder.addCase(logout.fulfilled, (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.isGuest = false;
    });

    // Guest
    builder.addCase(enterGuestMode.fulfilled, (state, action) => {
      state.isGuest = true;
      state.guestId = action.payload;
      state.isAuthenticated = false;
      state.user = null;
    });
    builder.addCase(enterGuestMode.rejected, (state) => {
      state.isGuest = true;
      state.guestId = null;
    });
  },
});

export const { clearError } = authSlice.actions;
export default authSlice.reducer;
