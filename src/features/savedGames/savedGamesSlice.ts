import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { gameApi, historyApi, type SaveCompletedGameInput } from '../../services/gameService';

interface GameRecord {
  _id: string;
  mode: string;
  status: string;
  label?: string;
  fen: string;
  pgn: string;
  moves: Array<{ ply: number; san: string; from: string; to: string; fenAfter: string }>;
  result: string;
  terminationReason?: string;
  whitePlayer: { type: string; name: string };
  blackPlayer: { type: string; name: string };
  difficulty?: string;
  timeControl?: { initialMs: number; incrementMs: number };
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

interface SavedGamesState {
  savedGames: GameRecord[];
  historyGames: GameRecord[];
  historyTotal: number;
  currentGame: GameRecord | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: SavedGamesState = {
  savedGames: [],
  historyGames: [],
  historyTotal: 0,
  currentGame: null,
  isLoading: false,
  error: null,
};

export const fetchSavedGames = createAsyncThunk('savedGames/fetchAll', async (_, { rejectWithValue }) => {
  try {
    const { data } = await gameApi.list();
    return data.data.games as GameRecord[];
  } catch {
    return rejectWithValue('Failed to load saved games');
  }
});

export const saveCurrentGame = createAsyncThunk(
  'savedGames/save',
  async (
    input: {
      mode: string;
      fen: string;
      moves: Array<{ ply: number; san: string; from: string; to: string; fenAfter: string }>;
      whitePlayer: { type: string; userId?: string; name: string };
      blackPlayer: { type: string; userId?: string; name: string };
      difficulty?: string;
      label?: string;
    },
    { rejectWithValue },
  ) => {
    try {
      const { data } = await gameApi.create({
        mode: input.mode,
        whitePlayer: input.whitePlayer,
        blackPlayer: input.blackPlayer,
        fen: input.fen,
        difficulty: input.difficulty as 'easy' | 'medium' | 'hard' | undefined,
        label: input.label,
      });
      return data.data.game as GameRecord;
    } catch {
      return rejectWithValue('Failed to save game');
    }
  },
);

export const deleteSavedGame = createAsyncThunk('savedGames/delete', async (id: string, { rejectWithValue }) => {
  try {
    await gameApi.delete(id);
    return id;
  } catch {
    return rejectWithValue('Failed to delete game');
  }
});

export const autoSaveGame = createAsyncThunk(
  'savedGames/autoSave',
  async (input: SaveCompletedGameInput, { rejectWithValue }) => {
    try {
      const { data } = await gameApi.saveCompleted(input);
      return data.data.game as GameRecord;
    } catch {
      return rejectWithValue('Failed to auto-save game');
    }
  },
);

export const fetchHistory = createAsyncThunk(
  'savedGames/fetchHistory',
  async (params: Record<string, string | number> | undefined, { rejectWithValue }) => {
    try {
      const { data } = await historyApi.list(params);
      return { games: data.data.games as GameRecord[], total: data.total as number };
    } catch {
      return rejectWithValue('Failed to load history');
    }
  },
);

export const fetchHistoryGame = createAsyncThunk('savedGames/fetchHistoryGame', async (id: string, { rejectWithValue }) => {
  try {
    const { data } = await historyApi.get(id);
    return data.data.game as GameRecord;
  } catch {
    return rejectWithValue('Failed to load game');
  }
});

const savedGamesSlice = createSlice({
  name: 'savedGames',
  initialState,
  reducers: {
    clearCurrentGame(state) {
      state.currentGame = null;
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Saved games
    builder.addCase(fetchSavedGames.pending, (state) => {
      state.isLoading = true;
    });
    builder.addCase(fetchSavedGames.fulfilled, (state, action) => {
      state.isLoading = false;
      state.savedGames = action.payload;
    });
    builder.addCase(fetchSavedGames.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Save game
    builder.addCase(saveCurrentGame.fulfilled, (state, action) => {
      state.savedGames.unshift(action.payload);
    });

    // Delete game
    builder.addCase(deleteSavedGame.fulfilled, (state, action) => {
      state.savedGames = state.savedGames.filter((g) => g._id !== action.payload);
    });

    // History
    builder.addCase(fetchHistory.pending, (state) => {
      state.isLoading = true;
    });
    builder.addCase(fetchHistory.fulfilled, (state, action) => {
      state.isLoading = false;
      state.historyGames = action.payload.games;
      state.historyTotal = action.payload.total;
    });
    builder.addCase(fetchHistory.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Single history game
    builder.addCase(fetchHistoryGame.fulfilled, (state, action) => {
      state.currentGame = action.payload;
    });
  },
});

export const { clearCurrentGame, clearError } = savedGamesSlice.actions;
export default savedGamesSlice.reducer;
