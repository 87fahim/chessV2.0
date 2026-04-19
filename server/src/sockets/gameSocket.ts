import { Server as SocketIOServer } from 'socket.io';
import { AuthenticatedSocket } from '../middleware/socketAuth.js';
import { SocketEvents } from '../constants/socketEvents.js';
import * as gameService from '../services/gameService.js';
import { calculateRemainingTime } from '../services/clockService.js';
import { markDisconnected, markReconnected, clearGameDisconnects } from '../services/timeoutScheduler.js';
import { isUserOnline, connectedUsers } from './index.js';
import { logger } from '../utils/logger.js';

// Track draw offers in memory: gameId -> offeringUserId
const drawOffers = new Map<string, string>();

// Track rematch offers: gameId -> { offeredBy, timer }
const rematchOffers = new Map<string, { offeredBy: string; timer: ReturnType<typeof setTimeout> }>();

/** Rematch offer expires after 5 seconds */
const REMATCH_TIMEOUT_MS = 5_000;

// Track which games each socket is in: socketId -> Set<gameId>
const socketGames = new Map<string, Set<string>>();

export function getDrawOffer(gameId: string): string | null {
  return drawOffers.get(gameId) ?? null;
}

export function clearDrawOffer(gameId: string): void {
  drawOffers.delete(gameId);
}

export function registerGameHandlers(io: SocketIOServer, socket: AuthenticatedSocket): void {
  const userId = socket.user!.userId;

  // Track this socket's game memberships for disconnect handler
  if (!socketGames.has(socket.id)) {
    socketGames.set(socket.id, new Set());
  }

  // Join a game room
  socket.on(SocketEvents.GAME_JOIN, async (data: { gameId: string }) => {
    try {
      const game = await gameService.getGameById(data.gameId);
      const { isPlayer } = gameService.isParticipant(game, userId);

      if (!isPlayer) {
        socket.emit(SocketEvents.ERROR, { message: 'Not a participant in this game' });
        return;
      }

      const roomId = `game:${data.gameId}`;
      await socket.join(roomId);
      socketGames.get(socket.id)?.add(data.gameId);

      // Clear disconnect timer for this player
      markReconnected(data.gameId, userId);

      // Notify opponent of reconnect
      socket.to(roomId).emit(SocketEvents.GAME_OPPONENT_RECONNECTED, { userId });
      socket.to(roomId).emit(SocketEvents.OPPONENT_PRESENCE, {
        gameId: data.gameId,
        userId,
        online: true,
      });

      // Send opponent presence status
      const opponentId = gameService.getOpponentUserId(game, userId);
      if (opponentId) {
        socket.emit(SocketEvents.OPPONENT_PRESENCE, {
          gameId: data.gameId,
          userId: opponentId,
          online: isUserOnline(opponentId),
        });
      }

      // Send current game state
      const clocks = calculateRemainingTime(game);
      socket.emit(SocketEvents.GAME_STATE, {
        gameId: data.gameId,
        fen: game.fen,
        moves: game.moves,
        status: game.status,
        result: game.result,
        clocks,
        whitePlayer: game.whitePlayer,
        blackPlayer: game.blackPlayer,
        drawOfferedBy: drawOffers.get(data.gameId) ?? null,
      });

      socket.emit(SocketEvents.GAME_JOINED, { gameId: data.gameId });

      logger.info(`User ${userId} joined game room ${roomId}`);
    } catch (error) {
      socket.emit(SocketEvents.ERROR, { message: 'Failed to join game' });
      logger.error('Game join error', error);
    }
  });

  // Make a move
  socket.on(
    SocketEvents.GAME_MOVE,
    async (data: { gameId: string; move: { from: string; to: string; promotion?: string }; clientMoveNumber?: number }) => {
      try {
        const result = await gameService.makeMove({
          gameId: data.gameId,
          userId,
          from: data.move.from,
          to: data.move.to,
          promotion: data.move.promotion,
          clientMoveNumber: data.clientMoveNumber,
        });

        const game = await gameService.getGameById(data.gameId);
        const clocks = calculateRemainingTime(game);
        const roomId = `game:${data.gameId}`;

        // Clear any pending draw offer on move
        drawOffers.delete(data.gameId);

        // Broadcast accepted move to all in room
        io.to(roomId).emit(SocketEvents.GAME_MOVE_ACCEPTED, {
          gameId: data.gameId,
          move: {
            from: data.move.from,
            to: data.move.to,
            san: result.san,
            ply: result.ply,
          },
          fen: result.fen,
          clocks,
        });

        // If game over, broadcast end
        if (result.gameOver) {
          io.to(roomId).emit(SocketEvents.GAME_ENDED, {
            gameId: data.gameId,
            result: result.result,
            reason: result.reason,
          });
          clearGameDisconnects(data.gameId);
          drawOffers.delete(data.gameId);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Move rejected';
        socket.emit(SocketEvents.GAME_MOVE_REJECTED, {
          gameId: data.gameId,
          reason: message,
        });

        // On stale state, send fresh game state for resync (FR-60)
        try {
          const game = await gameService.getGameById(data.gameId);
          const clocks = calculateRemainingTime(game);
          socket.emit(SocketEvents.GAME_STATE, {
            gameId: data.gameId,
            fen: game.fen,
            moves: game.moves,
            status: game.status,
            result: game.result,
            clocks,
            whitePlayer: game.whitePlayer,
            blackPlayer: game.blackPlayer,
            drawOfferedBy: drawOffers.get(data.gameId) ?? null,
          });
        } catch {
          // ignore secondary error
        }
      }
    }
  );

  // Resign
  socket.on(SocketEvents.GAME_RESIGN, async (data: { gameId: string }) => {
    try {
      const game = await gameService.resignGame(data.gameId, userId);
      const roomId = `game:${data.gameId}`;

      io.to(roomId).emit(SocketEvents.GAME_ENDED, {
        gameId: data.gameId,
        result: game.result,
        reason: 'resignation',
      });
      clearGameDisconnects(data.gameId);
      drawOffers.delete(data.gameId);
    } catch (error) {
      socket.emit(SocketEvents.ERROR, { message: 'Failed to resign' });
      logger.error('Resign error', error);
    }
  });

  // Offer draw (limit: one unresolved offer at a time, FR-47)
  socket.on(SocketEvents.GAME_OFFER_DRAW, async (data: { gameId: string }) => {
    const existingOffer = drawOffers.get(data.gameId);
    if (existingOffer === userId) {
      socket.emit(SocketEvents.ERROR, { message: 'Draw already offered' });
      return;
    }
    // If opponent already offered, this counts as acceptance
    if (existingOffer && existingOffer !== userId) {
      try {
        const game = await gameService.endGameByDraw(data.gameId);
        drawOffers.delete(data.gameId);
        const roomId = `game:${data.gameId}`;
        io.to(roomId).emit(SocketEvents.GAME_ENDED, {
          gameId: data.gameId,
          result: game.result,
          reason: 'draw_agreement',
        });
        clearGameDisconnects(data.gameId);
      } catch (error) {
        socket.emit(SocketEvents.ERROR, { message: 'Failed to process draw' });
        logger.error('Draw via counter-offer error', error);
      }
      return;
    }

    drawOffers.set(data.gameId, userId);
    const roomId = `game:${data.gameId}`;
    socket.to(roomId).emit(SocketEvents.GAME_DRAW_OFFERED, { gameId: data.gameId, offeredBy: userId });
  });

  // Accept draw
  socket.on(SocketEvents.GAME_ACCEPT_DRAW, async (data: { gameId: string }) => {
    const offeredBy = drawOffers.get(data.gameId);
    if (!offeredBy || offeredBy === userId) {
      socket.emit(SocketEvents.ERROR, { message: 'No draw offer to accept' });
      return;
    }

    try {
      const game = await gameService.endGameByDraw(data.gameId);
      drawOffers.delete(data.gameId);

      const roomId = `game:${data.gameId}`;
      io.to(roomId).emit(SocketEvents.GAME_ENDED, {
        gameId: data.gameId,
        result: game.result,
        reason: 'draw_agreement',
      });
      clearGameDisconnects(data.gameId);
    } catch (error) {
      socket.emit(SocketEvents.ERROR, { message: 'Failed to accept draw' });
      logger.error('Accept draw error', error);
    }
  });

  // Decline draw (proper event, FR-46)
  socket.on(SocketEvents.GAME_DECLINE_DRAW, (data: { gameId: string }) => {
    drawOffers.delete(data.gameId);
    const roomId = `game:${data.gameId}`;
    socket.to(roomId).emit(SocketEvents.GAME_DRAW_DECLINED, { gameId: data.gameId });
  });

  // Sync request (reconnect scenario, FR-59)
  socket.on(SocketEvents.GAME_SYNC_REQUEST, async (data: { gameId: string }) => {
    try {
      const game = await gameService.getGameById(data.gameId);
      const clocks = calculateRemainingTime(game);

      socket.emit(SocketEvents.GAME_STATE, {
        gameId: data.gameId,
        fen: game.fen,
        moves: game.moves,
        status: game.status,
        result: game.result,
        clocks,
        whitePlayer: game.whitePlayer,
        blackPlayer: game.blackPlayer,
        drawOfferedBy: drawOffers.get(data.gameId) ?? null,
      });
    } catch (error) {
      socket.emit(SocketEvents.ERROR, { message: 'Failed to sync game state' });
      logger.error('Sync error', error);
    }
  });

  // Rematch request
  socket.on(SocketEvents.GAME_REMATCH_REQUEST, async (data: { gameId: string }) => {
    try {
      const game = await gameService.getGameById(data.gameId);
      if (game.status !== 'completed' && game.status !== 'abandoned') {
        socket.emit(SocketEvents.ERROR, { message: 'Game is not finished' });
        return;
      }

      const { isPlayer } = gameService.isParticipant(game, userId);
      if (!isPlayer) {
        socket.emit(SocketEvents.ERROR, { message: 'Not a participant in this game' });
        return;
      }

      // Prevent duplicate: user already has a pending offer for this game
      const existing = rematchOffers.get(data.gameId);
      if (existing && existing.offeredBy === userId) {
        return; // silently ignore duplicate click
      }

      // Check opponent availability
      const opponentId = gameService.getOpponentUserId(game, userId);
      if (!opponentId || !isUserOnline(opponentId)) {
        socket.emit(SocketEvents.GAME_REMATCH_DECLINED, {
          gameId: data.gameId,
          reason: 'Opponent is no longer available for a rematch.',
        });
        return;
      }

      // Check if opponent already started another game
      const opponentActiveGame = await gameService.findActiveOnlineGame(opponentId);
      if (opponentActiveGame && opponentActiveGame._id.toString() !== data.gameId) {
        socket.emit(SocketEvents.GAME_REMATCH_DECLINED, {
          gameId: data.gameId,
          reason: 'Opponent has already started another game.',
        });
        return;
      }

      // If opponent already requested rematch (mutual), create game immediately
      if (existing && existing.offeredBy !== userId) {
        clearTimeout(existing.timer);
        rematchOffers.delete(data.gameId);
        const newGame = await gameService.createRematchGame(data.gameId);
        const roomId = `game:${data.gameId}`;
        const newGameId = newGame._id.toString();

        io.to(roomId).emit(SocketEvents.GAME_REMATCH_ACCEPTED, {
          oldGameId: data.gameId,
          newGameId,
          whitePlayer: newGame.whitePlayer,
          blackPlayer: newGame.blackPlayer,
          timeControl: newGame.timeControl,
        });

        logger.info(`Mutual rematch for game ${data.gameId} → new game ${newGameId}`);
        return;
      }

      // Set a 5-second timeout for the offer
      const timer = setTimeout(() => {
        rematchOffers.delete(data.gameId);
        const roomId = `game:${data.gameId}`;
        io.to(roomId).emit(SocketEvents.GAME_REMATCH_EXPIRED, { gameId: data.gameId });
        logger.info(`Rematch offer expired for game ${data.gameId}`);
      }, REMATCH_TIMEOUT_MS);

      // Store the offer and notify opponent
      rematchOffers.set(data.gameId, { offeredBy: userId, timer });
      const roomId = `game:${data.gameId}`;
      socket.to(roomId).emit(SocketEvents.GAME_REMATCH_OFFERED, {
        gameId: data.gameId,
        offeredBy: userId,
      });

      logger.info(`User ${userId} offered rematch for game ${data.gameId}`);
    } catch (error) {
      socket.emit(SocketEvents.ERROR, { message: 'Failed to request rematch' });
      logger.error('Rematch request error', error);
    }
  });

  // Accept rematch
  socket.on(SocketEvents.GAME_REMATCH_ACCEPT, async (data: { gameId: string }) => {
    try {
      const offer = rematchOffers.get(data.gameId);
      if (!offer || offer.offeredBy === userId) {
        socket.emit(SocketEvents.ERROR, { message: 'This rematch request is no longer valid.' });
        return;
      }

      clearTimeout(offer.timer);
      rematchOffers.delete(data.gameId);
      const newGame = await gameService.createRematchGame(data.gameId);
      const roomId = `game:${data.gameId}`;
      const newGameId = newGame._id.toString();

      io.to(roomId).emit(SocketEvents.GAME_REMATCH_ACCEPTED, {
        oldGameId: data.gameId,
        newGameId,
        whitePlayer: newGame.whitePlayer,
        blackPlayer: newGame.blackPlayer,
        timeControl: newGame.timeControl,
      });

      logger.info(`Rematch accepted for game ${data.gameId} → new game ${newGameId}`);
    } catch (error) {
      socket.emit(SocketEvents.ERROR, { message: 'Failed to accept rematch' });
      logger.error('Rematch accept error', error);
    }
  });

  // Decline rematch
  socket.on(SocketEvents.GAME_REMATCH_DECLINE, (data: { gameId: string }) => {
    const offer = rematchOffers.get(data.gameId);
    if (offer) {
      clearTimeout(offer.timer);
      rematchOffers.delete(data.gameId);
    }
    const roomId = `game:${data.gameId}`;
    socket.to(roomId).emit(SocketEvents.GAME_REMATCH_DECLINED, { gameId: data.gameId });
    logger.info(`User ${userId} declined rematch for game ${data.gameId}`);
  });

  // Handle disconnect — notify opponent and start abandonment timer (FR-26, FR-27, FR-33)
  socket.on('disconnect', async () => {
    const gameIds = socketGames.get(socket.id) ?? new Set();
    socketGames.delete(socket.id);

    for (const gameId of gameIds) {
      const roomId = `game:${gameId}`;

      // Only mark as disconnected if no other sockets for this user are in the room
      const userSockets = connectedUsers.get(userId);
      let stillInRoom = false;
      if (userSockets) {
        for (const sid of userSockets) {
          if (sid === socket.id) continue;
          const otherSocket = io.sockets.sockets.get(sid) as AuthenticatedSocket | undefined;
          if (otherSocket?.rooms.has(roomId)) {
            stillInRoom = true;
            break;
          }
        }
      }

      if (!stillInRoom) {
        // Cancel any pending rematch offers for this game
        const offer = rematchOffers.get(gameId);
        if (offer) {
          clearTimeout(offer.timer);
          rematchOffers.delete(gameId);
          io.to(roomId).emit(SocketEvents.GAME_REMATCH_DECLINED, {
            gameId,
            reason: 'Opponent is no longer available for a rematch.',
          });
        }

        io.to(roomId).emit(SocketEvents.GAME_OPPONENT_DISCONNECTED, { userId });
        io.to(roomId).emit(SocketEvents.OPPONENT_PRESENCE, {
          gameId,
          userId,
          online: false,
        });
        markDisconnected(gameId, userId);
      }
    }
  });
}
