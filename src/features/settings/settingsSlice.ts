import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { settingsApi, type UserSettingsData } from '../../services/settingsService';

interface SettingsState {
  data: UserSettingsData;
  isLoading: boolean;
  isSaving: boolean;
}

const defaultSettings: UserSettingsData = {
  boardTheme: 'wood2',
  moveColorTheme: 'classic',
  pieceTheme: 'default',
  boardOrientation: 'auto',
  soundEnabled: true,
  moveSoundEnabled: true,
  captureSoundEnabled: true,
  checkSoundEnabled: true,
  puzzleFeedbackSoundEnabled: true,
  animationEnabled: true,
  showCoordinates: false,
  showLegalMoves: true,
  highlightLastMove: true,
  highlightCheck: true,
  appearanceMode: 'light',
  showNotationPanel: true,
  showEvaluationPanel: true,
  largerBoardDisplay: false,
  highContrast: false,
  simplifiedIndicators: false,
  preferredColor: 'white',
  preferredGameType: 'casual',
  defaultDifficulty: 'medium',
  autoPromotion: true,
  moveConfirmation: false,
  moveInputMethod: 'drag_and_drop',
  practiceFreeMove: true,
  practiceHintsEnabled: true,
  practiceUnlimitedUndo: true,
  analysisEngineStrength: 'medium',
  analysisDefaultDepth: 12,
  analysisShowBestLine: true,
  defaultTimeControl: '10+0',
  boardFlipped: false,
  language: 'en',
  inviteNotifications: true,
  matchNotifications: true,
  puzzleReminders: false,
  emailNotifications: false,
  pushNotifications: false,
  friendRequestPolicy: 'everyone',
  directChallengePolicy: 'everyone',
  gameHistoryVisibility: 'friends_only',
  profileVisibility: 'public',
  onlinePresenceVisibility: 'everyone',
  spectatorPolicy: 'everyone',
};

const initialState: SettingsState = {
  data: defaultSettings,
  isLoading: false,
  isSaving: false,
};

export const fetchSettings = createAsyncThunk('settings/fetch', async (_, { rejectWithValue }) => {
  try {
    const { data } = await settingsApi.get();
    return data.data.settings as UserSettingsData;
  } catch {
    return rejectWithValue('Failed to load settings');
  }
});

export const saveSettings = createAsyncThunk(
  'settings/save',
  async (update: Partial<UserSettingsData>, { rejectWithValue }) => {
    try {
      const { data } = await settingsApi.update(update);
      return data.data.settings as UserSettingsData;
    } catch {
      return rejectWithValue('Failed to save settings');
    }
  },
);

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setLocalSetting(state, action) {
      state.data = { ...state.data, ...action.payload };
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchSettings.pending, (state) => {
      state.isLoading = true;
    });
    builder.addCase(fetchSettings.fulfilled, (state, action) => {
      state.isLoading = false;
      state.data = { ...defaultSettings, ...action.payload };
    });
    builder.addCase(fetchSettings.rejected, (state) => {
      state.isLoading = false;
    });
    builder.addCase(saveSettings.pending, (state) => {
      state.isSaving = true;
    });
    builder.addCase(saveSettings.fulfilled, (state, action) => {
      state.isSaving = false;
      state.data = { ...defaultSettings, ...action.payload };
    });
    builder.addCase(saveSettings.rejected, (state) => {
      state.isSaving = false;
    });
  },
});

export const { setLocalSetting } = settingsSlice.actions;
export default settingsSlice.reducer;
