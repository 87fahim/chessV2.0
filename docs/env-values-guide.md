# Environment Setup Guide

## File Layout

Each side (client + server) has **one template** and up to **three gitignored runtime files**:

| File | Tracked? | Purpose |
|------|----------|---------|
| `.env.example` | yes | Template – copy & fill for each env |
| `.env` | **no** | Local development (default for `npm run dev`) |
| `.env.staging` | **no** | Staging build / deploy |
| `.env.production` | **no** | Production build / deploy |

Same pattern under `server/`.

## Quick Start (local dev)

```bash
# 1. Root – client
cp .env.example .env          # leave VITE_API_URL empty

# 2. Server
cp server/.env.example server/.env
# Fill in MONGODB_URI, JWT_SECRET, JWT_REFRESH_SECRET
```

Then `npm run dev` — Vite proxies API + WebSocket calls to port 3001.

## Per-Environment Values

| Variable | Local dev | Staging (deployed) | Production (deployed) |
|----------|-----------|--------------------|-----------------------|
| `VITE_API_URL` | *(empty)* | *(empty or staging URL)* | `http://129.212.199.25` |
| `APP_ENV` | development | staging | production |
| `NODE_ENV` | development | production | production |
| `MONGODB_URI` | dev cluster/db | staging cluster/db | prod cluster/db |
| `CLIENT_URL` | `http://localhost:5173` | `http://localhost:5173` | `http://129.212.199.25` |
| `STOCKFISH_PATH` | Windows exe | Windows exe | `/usr/games/stockfish` |

## App Title

Auto-detected from the git branch at build/dev time (no env var needed):

| Branch | Title shown |
|--------|-------------|
| `main` | ♟ Chess V2.0 |
| `staging` | ♟ Chess V2.0 : Staging |
| `features/endGame` | ♟ Chess V2.0 : endGame |

Override with `VITE_APP_LABEL=MyLabel` in the relevant `.env.*` file if needed.

## Rules

1. **Never commit** `.env`, `.env.staging`, or `.env.production` (they're gitignored).
2. Use **different MongoDB databases** and **different JWT secrets** per environment.
3. Production secrets are managed only on the production server.
4. `server/.env.example` and `.env.example` are the single source of truth for variable names.
