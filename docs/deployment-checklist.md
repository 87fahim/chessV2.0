# Deployment Checklist

## One-time Setup

1. Create GitHub environments named staging and production.
2. Add branch protections:
- staging: require pull request and status checks.
- main: require pull request, approval, and status checks.
3. Ensure the server has Node, npm, PM2, and nginx installed.
4. Ensure the app directories exist on the server for staging and production.

## GitHub Environment Secrets

Add these in both environments unless noted:

- SERVER_HOST
- SERVER_USER
- SERVER_SSH_KEY

Staging only:

- STAGING_APP_DIR
- STAGING_PM2_APP

Production only:

- PROD_APP_DIR
- PROD_PM2_APP

## Server Env Files

Staging server should have:

- .env.staging at repo root for frontend build values
- server/.env.staging for backend runtime values

Production server should have:

- .env.production at repo root for frontend build values
- server/.env.production for backend runtime values

Mandatory safety checks:

- `server/.env.staging` must contain `APP_ENV=staging`
- `server/.env.production` must contain `APP_ENV=production`
- production values must not point to staging API endpoints

## Daily Flow

1. Create feature branch from staging.
2. Merge feature branch into staging via pull request.
3. Confirm staging deployment workflow succeeds.
4. Validate application in UAT.
5. Merge staging into main via pull request.
6. Confirm production deployment workflow succeeds.

## Hotfix Flow

1. Create hotfix branch from main.
2. Merge hotfix into main and deploy production.
3. Merge main back into staging to keep branches aligned.

## Validation Commands On Server

Run after deploy if needed:

- pm2 status
- pm2 logs <app-name> --lines 100
- sudo nginx -t
- curl -I http://127.0.0.1
