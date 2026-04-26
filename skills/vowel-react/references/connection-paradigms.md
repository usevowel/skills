# Connection Paradigms

Vowel uses two top-level client connection models, with a few advanced recipes layered on top. Full documentation: **`docs/recipes/connection-paradigms.md`** in the workspace.

## Overview

| Model / Pattern | Use Case | Credential Source |
|-----------------|----------|-------------------|
| **Hosted `appId` flow** | Managed platform setup | Platform-issued token |
| **Token-based flow** | Self-hosted, custom auth, backend-issued sessions | Your token service |
| **Sidecar pattern** | Shared browser + backend session | One token source, shared session identity |
| **Trusted server connections** | Backend automation and orchestration | Backend-held credentials or brokered token |

## Top-Level Model 1: Hosted token-issuer identifier (`apiKey` / `appId`)

Standard pattern for most React apps. Prefer **`apiKey`**; **`appId`** is a legacy alias for the same field.

```typescript
const vowel = new Vowel({
  apiKey: 'vkey_public_xxx', // or legacy hosted app id string
  // Platform handles short-lived session token generation
});
```

The value may be a **publishable key** (`vkey_*`) or a **legacy app identifier** from the dashboard— the client resolves it before calling the token issuer. Optional **`convexUrl`** / **`tokenEndpoint`** override where that minting request goes (self-hosted or non-default Convex deployments).

This is the default managed path when the browser is allowed to hold the publishable identifier.

## Top-Level Model 2: Token-Based Flow

Use token-based flow when your backend or token service should decide whether a client session can start.

**Flow:** Client -> your backend or token service -> short-lived token response -> client SDK

```typescript
const vowel = new Vowel({
  tokenProvider: async () => {
    const response = await fetch('/api/vowel/token', {
      method: 'POST',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Unable to fetch session token');
    }

    return response.json();
  },
});
```

For legacy integrations, you may still see a direct token passed through `voiceConfig.token`. Treat that as migration compatibility, not the preferred teaching path for new React examples.

## Advanced Recipe: Sidecar Pattern

Sidecar is not a third top-level client setup model. It is an advanced token-based recipe where a browser client and backend service participate in the same logical session.

Typical flow:

1. One system owns token issuance.
2. The browser joins with a client-safe token.
3. The backend joins or coordinates the same session lifecycle.
4. Client and server handle different tool domains.

Treat stable session identity and ownership boundaries as the key design constraints.

## Advanced Recipe: Trusted Server Connections

Trusted server connections are a backend pattern, not a browser-client primary integration path.

Use this when a backend service needs realtime access for orchestration, automation, or server-managed tools.

Rules:

- never expose long-lived credentials to browser code
- prefer short-lived tokens whenever possible
- present this as infrastructure guidance, not the default React integration path

## When to Use Which

- **Hosted `apiKey` / `appId` flow**: Managed platform setup when the browser may hold the publishable identifier or legacy app id.
- **Token-based flow**: Preferred when your backend must gate every session (`tokenProvider`, pre-issued token, or self-hosted Core patterns).
- **Sidecar**: Shared browser + backend session with distinct tool responsibilities.
- **Trusted server**: Backend-only orchestration or automation.

## Security Notes

- Short-lived tokens are preferred.
- Never expose trusted credentials in browser bundles.
- Treat session identifiers and brokered tokens as secrets.
- Never commit credentials to version control.

## Full Documentation

See **`docs/recipes/connection-paradigms.md`** in the workspace for:
- API key creation (Convex dashboard, HTTP API)
- Complete code examples
- Security best practices
- Troubleshooting
