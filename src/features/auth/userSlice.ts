import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { userApi, type UserProfileData, type UserSocialData, type UserStatsData, type UserSummaryData } from '../../services/userService';

interface UserDomainState {
  account: UserSummaryData['account'] | null;
  profile: UserProfileData | null;
  social: UserSocialData | null;
  stats: UserStatsData | null;
  recentActivities: Array<Record<string, unknown>>;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
}

const initialState: UserDomainState = {
  account: null,
  profile: null,
  social: null,
  stats: null,
  recentActivities: [],
  isLoading: false,
  isSaving: false,
  error: null,
};

export const fetchUserSummary = createAsyncThunk('userDomain/fetchSummary', async (_, { rejectWithValue }) => {
  try {
    const { data } = await userApi.getSummary();
    return data.data.summary as UserSummaryData;
  } catch {
    return rejectWithValue('Failed to load user summary');
  }
});

export const saveUserProfile = createAsyncThunk(
  'userDomain/saveProfile',
  async (update: Partial<UserProfileData>, { rejectWithValue }) => {
    try {
      const { data } = await userApi.updateProfile(update);
      return data.data.profile as UserProfileData;
    } catch {
      return rejectWithValue('Failed to save profile');
    }
  }
);

export const saveUserSocial = createAsyncThunk(
  'userDomain/saveSocial',
  async (update: Partial<UserSocialData>, { rejectWithValue }) => {
    try {
      const { data } = await userApi.updateSocial(update);
      return data.data.social as UserSocialData;
    } catch {
      return rejectWithValue('Failed to save social settings');
    }
  }
);

export const fetchRecentActivity = createAsyncThunk(
  'userDomain/fetchRecentActivity',
  async (limit: number | undefined, { rejectWithValue }) => {
    try {
      const { data } = await userApi.getRecentActivity(limit ?? 20);
      return data.data.activities as Array<Record<string, unknown>>;
    } catch {
      return rejectWithValue('Failed to load activity');
    }
  }
);

const userSlice = createSlice({
  name: 'userDomain',
  initialState,
  reducers: {
    clearUserDomain(state) {
      state.account = null;
      state.profile = null;
      state.social = null;
      state.stats = null;
      state.recentActivities = [];
      state.error = null;
      state.isLoading = false;
      state.isSaving = false;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchUserSummary.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchUserSummary.fulfilled, (state, action) => {
      state.isLoading = false;
      state.account = action.payload.account;
      state.profile = action.payload.profile;
      state.social = action.payload.social;
      state.stats = action.payload.stats;
    });
    builder.addCase(fetchUserSummary.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    builder.addCase(saveUserProfile.pending, (state) => {
      state.isSaving = true;
      state.error = null;
    });
    builder.addCase(saveUserProfile.fulfilled, (state, action) => {
      state.isSaving = false;
      state.profile = action.payload;
    });
    builder.addCase(saveUserProfile.rejected, (state, action) => {
      state.isSaving = false;
      state.error = action.payload as string;
    });

    builder.addCase(saveUserSocial.pending, (state) => {
      state.isSaving = true;
      state.error = null;
    });
    builder.addCase(saveUserSocial.fulfilled, (state, action) => {
      state.isSaving = false;
      state.social = action.payload;
    });
    builder.addCase(saveUserSocial.rejected, (state, action) => {
      state.isSaving = false;
      state.error = action.payload as string;
    });

    builder.addCase(fetchRecentActivity.fulfilled, (state, action) => {
      state.recentActivities = action.payload;
    });
  },
});

export const { clearUserDomain } = userSlice.actions;
export default userSlice.reducer;
