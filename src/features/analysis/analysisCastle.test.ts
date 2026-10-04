import { describe, expect, it } from 'vitest';
import { parseFenToPosition } from './fenBuilder';
import { sideAtBottom, tryLegalCastle } from './analysisCastle';

const START = parseFenToPosition('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
const EMPTY_RIGHTS = { K: false, Q: false, k: false, q: false };

function castleFrom(fen: string, from: string, to: string) {
  const parsed = parseFenToPosition(fen);
  return tryLegalCastle(
    parsed.position,
    from,
    to,
    parsed.castling,
    parsed.enPassant,
    parsed.halfMoveClock,
    parsed.fullMoveNumber,
  );
}

describe('sideAtBottom', () => {
  it('selects white when white is at the bottom', () => {
    expect(sideAtBottom(false)).toBe('w');
  });

  it('selects black when the board is flipped', () => {
    expect(sideAtBottom(true)).toBe('b');
  });
});

describe('tryLegalCastle', () => {
  it('castles kingside for white (e1-g1, rook h1-f1)', () => {
    const result = castleFrom('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1', 'e1', 'g1');
    expect(result).not.toBeNull();
    expect(result?.position.g1).toEqual({ color: 'w', type: 'k' });
    expect(result?.position.f1).toEqual({ color: 'w', type: 'r' });
    expect(result?.position.e1).toBeUndefined();
    expect(result?.position.h1).toBeUndefined();
    expect(result?.castling.K).toBe(false);
    expect(result?.castling.Q).toBe(false);
  });

  it('castles queenside for white (e1-c1, rook a1-d1)', () => {
    const result = castleFrom('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1', 'e1', 'c1');
    expect(result).not.toBeNull();
    expect(result?.position.c1).toEqual({ color: 'w', type: 'k' });
    expect(result?.position.d1).toEqual({ color: 'w', type: 'r' });
    expect(result?.position.a1).toBeUndefined();
  });

  it('castles kingside for black (e8-g8, rook h8-f8)', () => {
    const result = castleFrom('r3k2r/8/8/8/8/8/8/R3K2R b KQkq - 0 1', 'e8', 'g8');
    expect(result).not.toBeNull();
    expect(result?.position.g8).toEqual({ color: 'b', type: 'k' });
    expect(result?.position.f8).toEqual({ color: 'b', type: 'r' });
    expect(result?.position.h8).toBeUndefined();
  });

  it('returns null when castling rights are missing', () => {
    const result = tryLegalCastle(START.position, 'e1', 'g1', EMPTY_RIGHTS, '-', 0, 1);
    expect(result).toBeNull();
  });

  it('returns null when the path is blocked', () => {
    expect(castleFrom('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 'e1', 'g1')).toBeNull();
  });

  it('returns null when the king would castle through check', () => {
    expect(castleFrom('8/8/8/8/8/8/5r2/R3K2R w KQ - 0 1', 'e1', 'g1')).toBeNull();
  });

  it('returns null when the king is in check', () => {
    expect(castleFrom('r3k2r/8/8/8/8/4q3/8/R3K2R w KQkq - 0 1', 'e1', 'g1')).toBeNull();
  });

  it('returns null for a non-castle king destination', () => {
    expect(tryLegalCastle(START.position, 'e1', 'e2', START.castling, '-', 0, 1)).toBeNull();
  });
});
