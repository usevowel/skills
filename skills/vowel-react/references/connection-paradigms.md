# Connection Paradigms

Vowel supports multiple connection paradigms beyond the standard client-side integration. Full documentation: **`docs/recipes/connection-paradigms.md`** in the workspace.

## Overview

| Paradigm | Use Case | Token Source |
|----------|----------|---------------|
| **Platform-Managed** | Standard integrations | `appId` → platform mints token |
| **Fixed API Keys** | Trusted backend services | Long-lived `vkey_*` keys |
| **Developer-Managed Tokens** | Custom auth, your backend | Backend mints token via Vowel API |
| **Direct WebSocket** | Server-to-server | Fixed API key in WebSocket header |
| **Sidecar Pattern** | Client + server tools | Same sessionKey, multiple connections |

## Paradigm 1: Platform-Managed (appId)

Standard pattern for most React apps:

```typescript
const vowel = new Vowel({
  appId: 'your-app-id',
  // Platform handles token generation
});
```

Client requests ephemeral token from platform; platform manages API keys.

## Paradigm 2: Developer-Managed Ephemeral Tokens

Your backend mints tokens for clients. Full control over auth and session creation.

**Flow:** Client → Backend (your auth) → Vowel API (`POST /v1/realtime/sessions`) → Token → Client

```typescript
// Backend: POST to Vowel API with fixed API key
const response = await fetch(`${BASE_URL}/v1/realtime/sessions`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'gpt-4o-realtime-preview',
    sessionKey: sessionKey,  // Optional: for sidecar
    tools: [/* your tool definitions */],
  }),
});
const { client_secret } = await response.json();

// Client: Pass token directly
const vowel = new Vowel({
  voiceConfig: {
    provider: 'vowel-prime',
    token: ephemeralToken,  // Bypasses platform token endpoint
  },
});
```

## Paradigm 3: Fixed API Keys

Long-lived keys for trusted backend services. Create via Convex dashboard or API. Scopes: `mint_ephemeral`, `direct_ws`.

**Never expose in client-side code.** Use only in backend.

## Paradigm 4: Direct WebSocket Connections

Server connects directly to Vowel WebSocket using fixed API key. For server-side tool execution, automation, backend-to-backend.

```typescript
const ws = new WebSocket(WS_URL, {
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
  },
});
```

## Paradigm 5: Sidecar Pattern

Client + server join the same session. Both can define tools; conversation is shared.

1. Backend creates session with `sessionKey`, gets token.
2. Client connects with that token (client-side tools).
3. Server connects to same session with `sessionKey` (server-side tools).

**SessionKey format:** `sesskey_{32_hex_characters}`

## When to Use Which

- **appId**: Most React apps. Easiest setup.
- **Developer-Managed Tokens**: Custom auth, per-user tokens, usage tracking.
- **Fixed API Keys**: Backend automation, server-side tools.
- **Sidecar**: Client UI tools + server backend tools in one session.

## Security Notes

- Ephemeral tokens expire in ~1 hour.
- Fixed API keys: store in env, rotate regularly.
- SessionKeys: treat as secrets.
- Never commit keys to version control.

## Full Documentation

See **`docs/recipes/connection-paradigms.md`** in the workspace for:
- API key creation (Convex dashboard, HTTP API)
- Complete code examples
- Security best practices
- Troubleshooting
