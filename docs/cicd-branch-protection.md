# Branch protection checklist (GitHub)

Apply these in **Settings → Branches** (and Environments) for a corporate-style SDLC.

## Branch rules

### `dev`
- Require a pull request before merging
- Require status checks: `Lint & Build Client`, `Lint & Build Server`
- Require branches to be up to date before merging
- Restrict force pushes
- Do not allow deletions

### `uat`
- Same as `dev`
- Optionally require 1 approving review
- Prefer only merges from `dev` (enforced by team process / CODEOWNERS)

### `main`
- Same as `uat`
- Require 1+ approving reviews
- Dismiss stale pull request approvals when new commits are pushed
- Prefer only merges from `uat`

### `staging` (legacy)
- Mirror `uat` until the branch is retired

## Environments

Create environments: `development`, `uat`, `staging`, `production`.

| Environment | Deploy workflow | Suggested gate |
|---|---|---|
| `development` | Deploy Dev | none / auto |
| `uat` | Deploy UAT | optional reviewers |
| `staging` | Deploy Staging (legacy) | optional reviewers |
| `production` | Deploy Production | required reviewers + optional wait timer |

## Secrets

See README “Required GitHub setup” for `DEV_*`, `UAT_*` / `STAGING_*`, and `PROD_*` secrets.
