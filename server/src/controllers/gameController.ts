import { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as gameService from '../services/gameService.js';

const createGameSchema = z.object({
  mode: z.enum(['local', 'computer', 'analysis', 'online']),
  whitePlayer: z.object({
    type: z.enum(['user', 'guest', 'computer']),
    userId: z.string().optional(),
    guestId: z.string().optional(),
    name: z.string(),
  }),
  blackPlayer: z.object({
    type: z.enum(['user', 'guest', 'computer']),
    userId: z.string().optional(),
    guestId: z.string().optional(),
    name: z.string(),
  }),
  fen: z.string().optional(),
  timeControl: z
    .object({
      initialMs: z.number().positive(),
      incrementMs: z.number().min(0),
    })
    .optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  label: z.string().max(100).optional(),
});

const updateGameSchema = z.object({
  fen: z.string().optional(),
  pgn: z.string().optional(),
  status: z.string().optional(),
  label: z.string().max(100).optional(),
});

const playerInfoSchema = z.object({
  type: z.enum(['user', 'guest', 'computer']),
  userId: z.string().optional(),
  name: z.string(),
});

const saveCompletedGameSchema = z.object({
  mode: z.enum(['local', 'computer', 'practice']),
  whitePlayer: playerInfoSchema,
  blackPlayer: playerInfoSchema,
  initialFen: z.string().optional(),
  finalFen: z.string().min(1),
  moves: z
    .array(
      z.object({
        ply: z.number().int().positive(),
        from: z.string().min(2).max(2),
        to: z.string().min(2).max(2),
        san: z.string().min(1),
        fenAfter: z.string().min(1),
      })
    )
    .max(600),
  result: z.enum(['1-0', '0-1', '1/2-1/2', '*']),
  terminationReason: z
    .enum([
      'checkmate',
      'resignation',
      'timeout',
      'stalemate',
      'draw_agreement',
      'repetition',
      'insufficient_material',
      'abandonment',
    ])
    .optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  timeControl: z
    .object({ initialMs: z.number().positive(), incrementMs: z.number().min(0) })
    .optional(),
  label: z.string().max(100).optional(),
  startedAt: z.string().datetime().optional(),
  endedAt: z.string().datetime().optional(),
});

export const getActiveSessionGame = asyncHandler(async (req: Request, res: Response) => {
  const clientSessionId = req.query.clientSessionId as string | undefined;
  const guestId = req.query.guestId as string | undefined;

  if (!clientSessionId) {
    res.status(400).json({ success: false, error: 'clientSessionId is required' });
    return;
  }

  const userId = req.user?.userId;
  const game = await gameService.getActiveGameBySession(clientSessionId, userId, guestId);
  res.json({ success: true, data: { game: game ?? null } });
});

export const createGame = asyncHandler(async (req: Request, res: Response) => {
  const input = createGameSchema.parse(req.body);
  const clientSessionId = (req.body as Record<string, unknown>).clientSessionId as string | undefined;

  // Return existing active game for this session if one exists (prevents duplicates)
  if (clientSessionId) {
    const existing = await gameService.getActiveGameBySession(clientSessionId, req.user!.userId);
    if (existing) {
      res.status(200).json({ success: true, data: { game: existing, resumed: true } });
      return;
    }
  }

  const game = await gameService.createGame({
    ...input,
    ownerUserId: req.user!.userId,
    clientSessionId,
  });

  res.status(201).json({ success: true, data: { game } });
});

export const getGames = asyncHandler(async (req: Request, res: Response) => {
  const status = req.query.status as string | undefined;
  const games = await gameService.getUserGames(req.user!.userId, status);

  res.json({ success: true, data: { games } });
});

export const getGame = asyncHandler(async (req: Request, res: Response) => {
  const game = await gameService.getGameById(req.params.id as string);

  // Verify access
  const userId = req.user!.userId;
  const isParticipant =
    game.ownerUserId?.toString() === userId ||
    game.whitePlayer.userId?.toString() === userId ||
    game.blackPlayer.userId?.toString() === userId;

  if (!isParticipant) {
    res.status(403).json({ error: 'Not authorized to view this game' });
    return;
  }

  res.json({ success: true, data: { game } });
});

export const updateGame = asyncHandler(async (req: Request, res: Response) => {
  const update = updateGameSchema.parse(req.body);
  const game = await gameService.updateGame(req.params.id as string, req.user!.userId, update);

  res.json({ success: true, data: { game } });
});

export const deleteGame = asyncHandler(async (req: Request, res: Response) => {
  await gameService.deleteGame(req.params.id as string, req.user!.userId);

  res.json({ success: true, data: { message: 'Game deleted' } });
});

export const saveCompletedGame = asyncHandler(async (req: Request, res: Response) => {
  const input = saveCompletedGameSchema.parse(req.body);

  const now = new Date();
  const completedAt = input.endedAt ? new Date(input.endedAt) : now;

  const game = await gameService.createCompletedGame({
    mode: input.mode as 'local' | 'computer',
    ownerUserId: req.user!.userId,
    whitePlayer: input.whitePlayer,
    blackPlayer: input.blackPlayer,
    initialFen: input.initialFen,
    finalFen: input.finalFen,
    moves: input.moves,
    result: input.result,
    terminationReason: input.terminationReason,
    difficulty: input.difficulty,
    timeControl: input.timeControl,
    label: input.label,
    completedAt,
  });

  res.status(201).json({ success: true, data: { game } });
});
