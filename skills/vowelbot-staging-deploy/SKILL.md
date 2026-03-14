---
name: vowelbot-staging-deploy
description: Deploy and operate the vowelbot staging stack on Cloudflare (workers, Access app, Infisical secret sync, and staging GitHub App). Use when creating, updating, or validating vowelbot staging infrastructure.
---

# Vowelbot Staging Deploy

Use this skill when the task is to provision, deploy, or validate staging for vowelbot.

## Scope

- Cloudflare account: `84882f590c2154079d59fbaef6fb382b`
- API Worker: `vowelbot-worker-staging`
- Onboarding Worker: `vowelbot-onboarding-staging`
- Domains:
  - `api-staging.vowel.to` (API)
  - `add-staging.vowel.to` (onboarding)
- GitHub org/app:
  - org: `usevowel`
  - app: `vowelbot (staging)` / slug `vowelbot-staging`
- Infisical:
  - path: `/Projects/Vowel/Vowelbot`
  - env: `staging`

## Required sequence

1. Confirm Cloudflare and GitHub auth.
2. Provision staging KV + D1 resources and update Worker staging bindings.
3. Create/update `vowelbot (staging)` GitHub App and install where needed.
4. Store/update staging secrets in Infisical.
5. Sync Infisical staging secrets into Cloudflare Worker secrets.
6. Deploy API + onboarding staging workers.
7. Wire domains and Cloudflare Access (`Allow CmdPr Users`).
8. Run post-deploy checks (`/health`, OAuth start/callback routes, Access gate).

## Commands

Run from repo root.

```bash
bash ./scripts/setup-staging-stack.sh --project-id "$INFISICAL_PROJECT_ID"
```

With secret sync:

```bash
bash ./scripts/setup-staging-stack.sh \
  --project-id "$INFISICAL_PROJECT_ID" \
  --sync-secrets
```

Standalone secret sync:

```bash
bash ./scripts/sync-worker-secrets-staging.sh --project-id "$INFISICAL_PROJECT_ID"
```

Onboarding staging deploy (explicit build env + named worker):

```bash
cd packages/onboarding
NEXT_PUBLIC_WORKER_URL="https://api-staging.vowel.to" \
NEXT_PUBLIC_GITHUB_APP_SLUG="vowelbot-staging" \
NEXT_PUBLIC_WORKER_PUBLIC_KEY="<staging-public-key>" \
npx vinext build

CLOUDFLARE_ACCOUNT_ID=84882f590c2154079d59fbaef6fb382b \
npx wrangler deploy --config dist/server/wrangler.json --name vowelbot-onboarding-staging \
  --var NEXT_PUBLIC_WORKER_URL:https://api-staging.vowel.to \
  --var NEXT_PUBLIC_GITHUB_APP_SLUG:vowelbot-staging \
  --var NEXT_PUBLIC_WORKER_PUBLIC_KEY:<staging-public-key>
```

## Validation checklist

- `https://api-staging.vowel.to/health` returns `200`.
- `https://add-staging.vowel.to` is Access-protected.
- OAuth redirects use staging app slug and staging callback URL.
- Worker logs show no missing env secrets.

## Failure handling

- If `wrangler` cannot resolve account, set `CLOUDFLARE_ACCOUNT_ID=84882f590c2154079d59fbaef6fb382b`.
- If Infisical keys are missing, bootstrap key names first, then set values.
- If GitHub app pages require sudo re-auth, complete auth and resume from app setup step.
- If `wrangler secret bulk` fails with binding conflict for `FRONTEND_PUBLIC_API_KEY`, keep it in `[vars]` and only sync true secrets.
- If API-token auth fails with Cloudflare error `10023`, use Wrangler session auth or expand token scopes to include required Worker/KV permissions.
