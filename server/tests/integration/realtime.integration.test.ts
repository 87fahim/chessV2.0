import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Socket } from 'socket.io-client';
import { SocketEvents } from '../../src/constants/socketEvents.js';
import { registerTestUser } from '../helpers/auth.js';
import {
  createIntegrationTestServer,
  type IntegrationTestServer,
} from '../helpers/testServer.js';
import { connectSocket, waitForSocketEvent } from '../helpers/socket.js';

interface MatchFoundPayload {
  gameId: string;
  yourColor: 'white' | 'black';
  whiteUserId: string;
  blackUserId: string;
}

interface GameStatePayload {
  gameId: string;
  fen: string;
  moves: Array<{ ply: number; from: string; to: string; san: string }>;
  status: string;
}

interface MoveAcceptedPayload {
  gameId: string;
  fen: string;
  move: {
    from: string;
    to: string;
    san: string;
    ply: number;
  };
}

describe('realtime online game integration', () => {
  let server: IntegrationTestServer;
  let sockets: Socket[];

  beforeAll(async () => {
    server = await createIntegrationTestServer();
  });

  beforeEach(async () => {
    sockets = [];
    await server.resetDatabase();
  });

  afterEach(() => {
    for (const socket of sockets) {
      if (socket.connected) {
        socket.disconnect();
      }
    }
  });

  afterAll(async () => {
    await server.stop();
  });

  it('matches players, accepts a move, and supports resumable reconnect', async () => {
    const whitePlayer = await registerTestUser(server.request, {
      username: 'alice_test',
      email: 'alice_test@example.com',
    });
    const blackPlayer = await registerTestUser(server.request, {
      username: 'bob_test',
      email: 'bob_test@example.com',
    });

    const whiteSocket = server.createSocket(whitePlayer.tokens.accessToken);
    const blackSocket = server.createSocket(blackPlayer.tokens.accessToken);
    sockets.push(whiteSocket, blackSocket);

    await Promise.all([connectSocket(whiteSocket), connectSocket(blackSocket)]);

    const timeControl = { initialMs: 60_000, incrementMs: 0 };

    const whiteQueueJoined = waitForSocketEvent<{ message: string }>(
      whiteSocket,
      SocketEvents.QUEUE_JOINED,
    );
    const whiteMatchFound = waitForSocketEvent<MatchFoundPayload>(
      whiteSocket,
      SocketEvents.MATCH_FOUND,
    );
    whiteSocket.emit(SocketEvents.QUEUE_JOIN, {
      preferredColor: 'white',
      timeControl,
    });

    const blackQueueJoined = waitForSocketEvent<{ message: string }>(
      blackSocket,
      SocketEvents.QUEUE_JOINED,
    );
    const blackMatchFound = waitForSocketEvent<MatchFoundPayload>(
      blackSocket,
      SocketEvents.MATCH_FOUND,
    );
    blackSocket.emit(SocketEvents.QUEUE_JOIN, {
      preferredColor: 'black',
      timeControl,
    });

    const [whiteQueuePayload, blackQueuePayload, whiteMatch, blackMatch] =
      await Promise.all([
        whiteQueueJoined,
        blackQueueJoined,
        whiteMatchFound,
        blackMatchFound,
      ]);

    expect(whiteQueuePayload.message).toBe('Joined queue');
    expect(blackQueuePayload.message).toBe('Joined queue');
    expect(whiteMatch.gameId).toBe(blackMatch.gameId);
    expect(whiteMatch.yourColor).toBe('white');
    expect(blackMatch.yourColor).toBe('black');

    const gameId = whiteMatch.gameId;

    const whiteGameState = waitForSocketEvent<GameStatePayload>(
      whiteSocket,
      SocketEvents.GAME_STATE,
    );
    const whiteJoinedGame = waitForSocketEvent<{ gameId: string }>(
      whiteSocket,
      SocketEvents.GAME_JOINED,
    );
    whiteSocket.emit(SocketEvents.GAME_JOIN, { gameId });

    const blackGameState = waitForSocketEvent<GameStatePayload>(
      blackSocket,
      SocketEvents.GAME_STATE,
    );
    const blackJoinedGame = waitForSocketEvent<{ gameId: string }>(
      blackSocket,
      SocketEvents.GAME_JOINED,
    );
    blackSocket.emit(SocketEvents.GAME_JOIN, { gameId });

    const [whiteState, blackState, whiteJoinAck, blackJoinAck] = await Promise.all([
      whiteGameState,
      blackGameState,
      whiteJoinedGame,
      blackJoinedGame,
    ]);

    expect(whiteJoinAck.gameId).toBe(gameId);
    expect(blackJoinAck.gameId).toBe(gameId);
    expect(whiteState.moves).toHaveLength(0);
    expect(blackState.status).toBe('active');

    const whiteMoveAccepted = waitForSocketEvent<MoveAcceptedPayload>(
      whiteSocket,
      SocketEvents.GAME_MOVE_ACCEPTED,
    );
    const blackMoveAccepted = waitForSocketEvent<MoveAcceptedPayload>(
      blackSocket,
      SocketEvents.GAME_MOVE_ACCEPTED,
    );
    whiteSocket.emit(SocketEvents.GAME_MOVE, {
      gameId,
      move: { from: 'e2', to: 'e4' },
      clientMoveNumber: 1,
    });

    const [whiteMove, blackMove] = await Promise.all([
      whiteMoveAccepted,
      blackMoveAccepted,
    ]);

    expect(whiteMove.gameId).toBe(gameId);
    expect(whiteMove.move.san).toBe('e4');
    expect(whiteMove.move.ply).toBe(1);
    expect(blackMove.fen).toBe(
      'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
    );

    const opponentDisconnected = waitForSocketEvent<{ userId: string }>(
      whiteSocket,
      SocketEvents.GAME_OPPONENT_DISCONNECTED,
    );
    blackSocket.disconnect();

    const disconnectedPayload = await opponentDisconnected;
    expect(disconnectedPayload.userId).toBe(blackPlayer.user._id);

    const reconnectingSocket = server.createSocket(blackPlayer.tokens.accessToken);
    sockets.push(reconnectingSocket);

    const resumableGame = waitForSocketEvent<{ gameId: string }>(
      reconnectingSocket,
      SocketEvents.GAME_RESUMABLE,
    );
    await connectSocket(reconnectingSocket);

    expect((await resumableGame).gameId).toBe(gameId);

    const opponentReconnected = waitForSocketEvent<{ userId: string }>(
      whiteSocket,
      SocketEvents.GAME_OPPONENT_RECONNECTED,
    );
    const resumedGameState = waitForSocketEvent<GameStatePayload>(
      reconnectingSocket,
      SocketEvents.GAME_STATE,
    );
    const resumedJoinAck = waitForSocketEvent<{ gameId: string }>(
      reconnectingSocket,
      SocketEvents.GAME_JOINED,
    );
    reconnectingSocket.emit(SocketEvents.GAME_JOIN, { gameId });

    const [reconnectedPayload, resumedState, resumedAck] = await Promise.all([
      opponentReconnected,
      resumedGameState,
      resumedJoinAck,
    ]);

    expect(reconnectedPayload.userId).toBe(blackPlayer.user._id);
    expect(resumedAck.gameId).toBe(gameId);
    expect(resumedState.moves).toHaveLength(1);
    expect(resumedState.moves[0]?.san).toBe('e4');
    expect(resumedState.fen).toBe(
      'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
    );
  });
});