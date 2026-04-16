# Environment Values Guide

Use different values for staging and production. Never reuse production secrets in staging.

## Frontend Values

File: .env.staging

- VITE_API_URL=https://staging-api.your-domain.com

File: .env.production

- VITE_API_URL=https://api.your-domain.com

## Backend Values

File: server/.env.staging

- APP_ENV=staging
- NODE_ENV=production
- PORT=3001
- MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>/<staging-db>?retryWrites=true&w=majority
- JWT_SECRET=<long-random-secret>
- JWT_REFRESH_SECRET=<long-random-secret>
- JWT_EXPIRES_IN=15m
- JWT_REFRESH_EXPIRES_IN=7d
- CLIENT_URL=https://staging.your-domain.com
- STOCKFISH_PATH=C:/Program Files/stockfish/stockfish-windows-x86-64-avx2.exe

File: server/.env.production

- APP_ENV=production
- NODE_ENV=production
- PORT=3001
- MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>/<production-db>?retryWrites=true&w=majority
- JWT_SECRET=<long-random-secret>
- JWT_REFRESH_SECRET=<long-random-secret>
- JWT_EXPIRES_IN=15m
- JWT_REFRESH_EXPIRES_IN=7d
- CLIENT_URL=https://your-domain.com
- STOCKFISH_PATH=C:/Program Files/stockfish/stockfish-windows-x86-64-avx2.exe

## Recommended Secret Rules

1. Use different MongoDB databases for staging and production.
2. Use different JWT secrets for staging and production.
3. Keep APP_ENV and file names consistent.
4. Keep NODE_ENV=production in staging and production runtime.
5. Rotate production secrets on a schedule.

## Quick Sanity Checks

1. Build staging frontend with npm run build:staging.
2. Build production frontend with npm run build:prod.
3. Build backend with cd server then npm run build.
4. Check logs to confirm APP_ENV and CLIENT_URL values at startup.
