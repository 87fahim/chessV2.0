import { configureStore } from '@reduxjs/toolkit';
import gameReducer from '../features/game/gameSlice';
import authReducer from '../features/auth/authSlice';
import settingsReducer from '../features/settings/settingsSlice';
import savedGamesReducer from '../features/savedGames/savedGamesSlice';

export const store = configureStore({
  reducer: {
    game: gameReducer,
    auth: authReducer,
    settings: settingsReducer,
    savedGames: savedGamesReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
