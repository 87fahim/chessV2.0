import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { GameMode, Difficulty, GameStatus } from '../../types/game';
import type { PieceColor, PieceType } from '../../types/chess';
import { DEFAULT_FEN } from '../../lib/chess/fen';

interface GameSliceState {
  fen: string;
  moves: string[];       // SAN move list
  history: string[];     // FEN history for undo
  mode: GameMode;
  playerColor: PieceColor;
  difficulty: Difficulty;
  status: GameStatus;
  result: string | null;
  terminationReason: string | null;
  selectedSquare: string | null;
  legalMoves: string[];
  lastMove: { from: string; to: string } | null;
  capturedPieces: { w: PieceType[]; b: PieceType[] };
  isFlipped: boolean;
  promotionPending: { from: string; to: string } | null;
}

const initialState: GameSliceState = {
  fen: DEFAULT_FEN,
  moves: [],
  history: [DEFAULT_FEN],
  mode: 'vs-computer',
  playerColor: 'w',
  difficulty: 'medium',
  status: 'idle',
  result: null,
  terminationReason: null,
  selectedSquare: null,
  legalMoves: [],
  lastMove: null,
  capturedPieces: { w: [], b: [] },
  isFlipped: false,
  promotionPending: null,
};

const gameSlice = createSlice({
  name: 'game',
  initialState,
  reducers: {
    newGame(state, action: PayloadAction<{ mode: GameMode; playerColor: PieceColor; difficulty: Difficulty }>) {
      const { mode, playerColor, difficulty } = action.payload;
      state.fen = DEFAULT_FEN;
      state.moves = [];
      state.history = [DEFAULT_FEN];
      state.mode = mode;
      state.playerColor = playerColor;
      state.difficulty = difficulty;
      state.status = 'playing';
      state.result = null;
      state.terminationReason = null;
      state.selectedSquare = null;
      state.legalMoves = [];
      state.lastMove = null;
      state.capturedPieces = { w: [], b: [] };
      state.isFlipped = playerColor === 'b';
      state.promotionPending = null;
    },

    setFen(state, action: PayloadAction<string>) {
      state.fen = action.payload;
    },

    moveMade(state, action: PayloadAction<{ fen: string; san: string; from: string; to: string; captured?: PieceType; color: PieceColor }>) {
      const { fen, san, from, to, captured, color } = action.payload;
      state.fen = fen;
      state.moves.push(san);
      state.history.push(fen);
      state.lastMove = { from, to };
      state.selectedSquare = null;
      state.legalMoves = [];
      state.promotionPending = null;

      if (captured) {
        state.capturedPieces[color].push(captured);
      }
    },

    setSelectedSquare(state, action: PayloadAction<{ square: string | null; legalMoves: string[] }>) {
      state.selectedSquare = action.payload.square;
      state.legalMoves = action.payload.legalMoves;
    },

    clearSelection(state) {
      state.selectedSquare = null;
      state.legalMoves = [];
    },

    setPromotionPending(state, action: PayloadAction<{ from: string; to: string } | null>) {
      state.promotionPending = action.payload;
    },

    undoMove(state) {
      if (state.history.length <= 1) return;
      // Undo two moves (player + computer) in vs-computer mode
      const undoCount = state.mode === 'vs-computer' ? 2 : 1;
      const actual = Math.min(undoCount, state.history.length - 1);

      state.history = state.history.slice(0, -actual);
      state.moves = state.moves.slice(0, -actual);
      state.fen = state.history[state.history.length - 1];
      state.lastMove = null;
      state.selectedSquare = null;
      state.legalMoves = [];
      state.promotionPending = null;
    },

    gameOver(state, action: PayloadAction<{ result: string; reason?: string } | string>) {
      state.status = 'finished';
      if (typeof action.payload === 'string') {
        state.result = action.payload;
      } else {
        state.result = action.payload.result;
        state.terminationReason = action.payload.reason ?? null;
      }
      state.selectedSquare = null;
      state.legalMoves = [];
    },

    flipBoard(state) {
      state.isFlipped = !state.isFlipped;
    },

    setFlipped(state, action: PayloadAction<boolean>) {
      state.isFlipped = action.payload;
    },

    setLastMove(state, action: PayloadAction<{ from: string; to: string } | null>) {
      state.lastMove = action.payload;
    },

    resetGame(state) {
      Object.assign(state, initialState);
    },

    loadPosition(state, action: PayloadAction<string>) {
      state.fen = action.payload;
      state.moves = [];
      state.history = [action.payload];
      state.lastMove = null;
      state.selectedSquare = null;
      state.legalMoves = [];
      state.capturedPieces = { w: [], b: [] };
      state.promotionPending = null;
    },

    setStatus(state, action: PayloadAction<GameStatus>) {
      state.status = action.payload;
    },
  },
});

export const {
  newGame,
  setFen,
  moveMade,
  setSelectedSquare,
  clearSelection,
  setPromotionPending,
  undoMove,
  gameOver,
  flipBoard,
  setFlipped,
  setLastMove,
  resetGame,
  loadPosition,
  setStatus,
} = gameSlice.actions;

export default gameSlice.reducer;
