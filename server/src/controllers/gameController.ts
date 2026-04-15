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

export const createGame = asyncHandler(async (req: Request, res: Response) => {
  const input = createGameSchema.parse(req.body);

  const game = await gameService.createGame({
    ...input,
    ownerUserId: req.user!.userId,
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
