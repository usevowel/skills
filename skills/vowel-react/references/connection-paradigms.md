# Connection Paradigms

Vowel uses two top-level client connection models, with a few advanced recipes layered on top. Full documentation: **`docs/recipes/connection-paradigms.md`** in the workspace.

## Overview

| Model / Pattern | Use Case | Credential Source |
|-----------------|----------|-------------------|
| **Hosted `appId` flow** | Managed platform setup | Platform-issued token |
| **Token-based flow** | Self-hosted, custom auth, backend-issued sessions | Your token service |
| **Sidecar pattern** | Shared browser + backend session | One token source, shared session identity |
| **Trusted server connections** | Backend automation and orchestration | Backend-held credentials or brokered token |

## Top-Level Model 1: Hosted `appId` Flow

Standard pattern for most React apps:

```typescript
const vowel = new Vowel({
  appId: 'your-app-id',
  // Platform handles token generation
});
```

The client requests a short-lived token from the hosted platform. This is the managed path.

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

- **Hosted `appId` flow**: Managed platform setup once the hosted path is available for your use case.
- **Token-based flow**: Current recommended path for self-hosted or backend-controlled integrations.
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
