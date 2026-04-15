import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IMove {
  ply: number;
  from: string;
  to: string;
  san: string;
  fenAfter: string;
  movedAt: Date;
  spentTimeMs?: number;
}

export interface IPlayerInfo {
  type: 'user' | 'guest' | 'computer';
  userId?: Types.ObjectId;
  guestId?: string;
  name: string;
}

export interface ITimeControl {
  initialMs: number;
  incrementMs: number;
}

export interface IClocks {
  whiteRemainingMs: number;
  blackRemainingMs: number;
  activeColor: string;
  activeSince?: Date;
}

export interface IGame extends Document {
  mode: string;
  status: string;
  label?: string;
  ownerUserId?: Types.ObjectId;
  guestSessionId?: Types.ObjectId;
  whitePlayer: IPlayerInfo;
  blackPlayer: IPlayerInfo;
  fen: string;
  pgn: string;
  moves: IMove[];
  result: string;
  terminationReason?: string;
  timeControl?: ITimeControl;
  clocks?: IClocks;
  difficulty?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

const moveSchema = new Schema<IMove>(
  {
    ply: { type: Number, required: true },
    from: { type: String, required: true },
    to: { type: String, required: true },
    san: { type: String, required: true },
    fenAfter: { type: String, required: true },
    movedAt: { type: Date, default: Date.now },
    spentTimeMs: { type: Number },
  },
  { _id: false }
);

const playerInfoSchema = new Schema<IPlayerInfo>(
  {
    type: { type: String, required: true, enum: ['user', 'guest', 'computer'] },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    guestId: { type: String },
    name: { type: String, required: true },
  },
  { _id: false }
);

const gameSchema = new Schema<IGame>(
  {
    mode: {
      type: String,
      required: true,
      enum: ['local', 'computer', 'analysis', 'online'],
    },
    status: {
      type: String,
      required: true,
      default: 'active',
      enum: ['pending', 'waiting_for_opponent', 'active', 'completed', 'abandoned', 'cancelled'],
    },
    label: { type: String },
    ownerUserId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    guestSessionId: { type: Schema.Types.ObjectId, ref: 'GuestSession' },
    whitePlayer: { type: playerInfoSchema, required: true },
    blackPlayer: { type: playerInfoSchema, required: true },
    fen: {
      type: String,
      required: true,
      default: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    },
    pgn: { type: String, default: '' },
    moves: { type: [moveSchema], default: [] },
    result: {
      type: String,
      default: '*',
      enum: ['1-0', '0-1', '1/2-1/2', '*'],
    },
    terminationReason: {
      type: String,
      enum: [
        'checkmate',
        'resignation',
        'timeout',
        'stalemate',
        'draw_agreement',
        'repetition',
        'insufficient_material',
        'abandonment',
        null,
      ],
    },
    timeControl: {
      initialMs: { type: Number },
      incrementMs: { type: Number },
    },
    clocks: {
      whiteRemainingMs: { type: Number },
      blackRemainingMs: { type: Number },
      activeColor: { type: String },
      activeSince: { type: Date },
    },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard', null] },
    completedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

gameSchema.index({ ownerUserId: 1, status: 1 });
gameSchema.index({ 'whitePlayer.userId': 1, status: 1 });
gameSchema.index({ 'blackPlayer.userId': 1, status: 1 });

export const Game = mongoose.model<IGame>('Game', gameSchema);
