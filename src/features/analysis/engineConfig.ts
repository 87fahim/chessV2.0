// Backend-only mode. The frontend will call a backend endpoint that runs the local Stockfish binary.
export const ENGINE_CONFIG = {
  backendAnalyzeUrl: import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}/api/engine/analyze`
    : '/api/engine/analyze',
};
