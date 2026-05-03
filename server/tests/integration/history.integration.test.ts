import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createCompletedGame } from '../../src/services/gameService.js';
import { registerTestUser } from '../helpers/auth.js';
import {
  createIntegrationTestServer,
  type IntegrationTestServer,
} from '../helpers/testServer.js';

describe('history integration', () => {
  let server: IntegrationTestServer;

  beforeAll(async () => {
    server = await createIntegrationTestServer();
  });

  beforeEach(async () => {
    await server.resetDatabase();
  });

  afterAll(async () => {
    await server.stop();
  });

  it('returns authenticated history lists and game details', async () => {
    const player = await registerTestUser(server.request);

    const firstGame = await createCompletedGame({
      mode: 'computer',
      ownerUserId: player.user._id,
      whitePlayer: {
        type: 'user',
        userId: player.user._id,
        name: player.user.username,
      },
      blackPlayer: {
        type: 'computer',
        name: 'Computer',
      },
      finalFen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
      moves: [
        {
          ply: 1,
          from: 'e2',
          to: 'e4',
          san: 'e4',
          fenAfter:
            'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
        },
      ],
      result: '1-0',
      terminationReason: 'checkmate',
      difficulty: 'medium',
      completedAt: new Date('2026-01-01T10:00:00.000Z'),
    });

    const secondGame = await createCompletedGame({
      mode: 'practice',
      ownerUserId: player.user._id,
      whitePlayer: {
        type: 'user',
        userId: player.user._id,
        name: player.user.username,
      },
      blackPlayer: {
        type: 'computer',
        name: 'Practice Board',
      },
      finalFen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
      moves: [
        {
          ply: 1,
          from: 'e2',
          to: 'e4',
          san: 'e4',
          fenAfter:
            'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
        },
        {
          ply: 2,
          from: 'e7',
          to: 'e5',
          san: 'e5',
          fenAfter:
            'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
        },
      ],
      result: '0-1',
      terminationReason: 'resignation',
      completedAt: new Date('2026-01-02T10:00:00.000Z'),
    });

    const authHeader = {
      Authorization: `Bearer ${player.tokens.accessToken}`,
    };

    const historyResponse = await server.request.get('/api/history').set(authHeader);

    expect(historyResponse.status).toBe(200);
    expect(historyResponse.body.total).toBe(2);
    expect(historyResponse.body.data.games).toHaveLength(2);
    expect(historyResponse.body.data.games[0]._id).toBe(secondGame._id.toString());
    expect(historyResponse.body.data.games[1]._id).toBe(firstGame._id.toString());

    const filteredResponse = await server.request
      .get('/api/history')
      .query({ mode: 'computer', result: '1-0' })
      .set(authHeader);

    expect(filteredResponse.status).toBe(200);
    expect(filteredResponse.body.total).toBe(1);
    expect(filteredResponse.body.data.games[0]._id).toBe(firstGame._id.toString());

    const detailResponse = await server.request
      .get(`/api/history/${secondGame._id.toString()}`)
      .set(authHeader);

    expect(detailResponse.status).toBe(200);
    expect(detailResponse.body.data.game._id).toBe(secondGame._id.toString());
    expect(detailResponse.body.data.game.moves).toHaveLength(2);
    expect(detailResponse.body.data.game.terminationReason).toBe('resignation');
  });
});