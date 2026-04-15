import { Chess } from 'chess.js';

export function createChessInstance(fen?: string): Chess {
  return fen ? new Chess(fen) : new Chess();
}

export function validateMove(
  fen: string,
  move: { from: string; to: string; promotion?: string }
): { valid: boolean; san?: string; newFen?: string; gameOver?: boolean; result?: string; reason?: string } {
  const chess = new Chess(fen);

  try {
    const result = chess.move({
      from: move.from,
      to: move.to,
      promotion: move.promotion as 'q' | 'r' | 'b' | 'n' | undefined,
    });

    if (!result) {
      return { valid: false };
    }

    const response: {
      valid: boolean;
      san: string;
      newFen: string;
      gameOver?: boolean;
      result?: string;
      reason?: string;
    } = {
      valid: true,
      san: result.san,
      newFen: chess.fen(),
    };

    if (chess.isGameOver()) {
      response.gameOver = true;
      if (chess.isCheckmate()) {
        response.result = chess.turn() === 'w' ? '0-1' : '1-0';
        response.reason = 'checkmate';
      } else if (chess.isStalemate()) {
        response.result = '1/2-1/2';
        response.reason = 'stalemate';
      } else if (chess.isThreefoldRepetition()) {
        response.result = '1/2-1/2';
        response.reason = 'repetition';
      } else if (chess.isInsufficientMaterial()) {
        response.result = '1/2-1/2';
        response.reason = 'insufficient_material';
      } else if (chess.isDraw()) {
        response.result = '1/2-1/2';
        response.reason = 'draw';
      }
    }

    return response;
  } catch {
    return { valid: false };
  }
}

export function isValidFen(fen: string): boolean {
  try {
    new Chess(fen);
    return true;
  } catch {
    return false;
  }
}

export function getCurrentTurn(fen: string): 'white' | 'black' {
  const chess = new Chess(fen);
  return chess.turn() === 'w' ? 'white' : 'black';
}
