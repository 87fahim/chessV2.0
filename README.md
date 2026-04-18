# ChessV2.0

## Branch Environments

This repo now supports separate frontend and backend environment files for:

- development
- staging
- production

For the backend, `APP_ENV` selects the config file and `NODE_ENV` controls runtime behavior.

- `APP_ENV=staging` loads `server/.env.staging`
- `APP_ENV=production` loads `server/.env.production`
- no `APP_ENV` loads `server/.env`

For the frontend, Vite mode selects the file automatically.

- `vite --mode staging` loads `.env.staging`
- `vite build --mode production` loads `.env.production`

## Environment Files

Create these files from the examples in the repo:

- `.env.example` -> `.env`
- `.env.staging.example` -> `.env.staging`
- `.env.production.example` -> `.env.production`
- `server/.env.example` -> `server/.env`
- `server/.env.staging.example` -> `server/.env.staging`
- `server/.env.production.example` -> `server/.env.production`

Do not commit the real `.env` files.

## Useful Commands

Full stack:

```bash
npm run dev
```

Client only:

```bash
npm run dev:client
npm run dev:staging
npm run build
npm run build:staging
npm run build:prod
```

Backend:

```bash
npm run dev:server

cd server
npm run dev
npm run dev:staging
npm run build
npm run start:staging
npm run start:prod
```

Notes:

- The root `npm run dev` now starts both Vite and the backend API together.
- In development, the backend stays up even if Stockfish is unavailable. Only engine analysis endpoints are affected in that case.

## Deployment Mapping

- `staging` branch should use staging env files and staging secrets
- `main` branch should use production env files and production secrets
- never reuse production secrets in staging

## Deployment Docs

- [Deployment Checklist](docs/deployment-checklist.md)
- [Environment Values Guide](docs/env-values-guide.md)

## GitHub Actions Deployment

- pushes to `staging` trigger `.github/workflows/deploy-staging.yml`
- pushes to `main` trigger `.github/workflows/deploy-production.yml`
- each workflow can also be started manually using workflow dispatch
