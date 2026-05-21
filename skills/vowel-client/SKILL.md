---
name: vowel-client
description: Core @vowel.to/client knowledge shared by all framework skills. Covers installation, connection paradigms (apiKey/appId/tokenProvider/direct token), voiceConfig reference (provider, model, voice, language, STT/TTS overrides, VAD, turn detection), adapter patterns, custom actions, context management, and environment variables. Framework-specific skills (vowel-react, vowel-vanilla, vowel-webcomponent) instruct agents to load this file first.
---

# Vowel Client Library

Core reference for `@vowel.to/client`. Framework-specific skills (vowel-react, vowel-vanilla, vowel-webcomponent) assume you have read this file first.

## What is Vowel?

**vowel** (lowercase) adds AI-powered voice agents to web applications. The `@vowel.to/client` package provides real-time voice interaction via **Vowel Core** (self-hosted), **Vowel Prime** (SaaS), Gemini Live API, or OpenAI Realtime API. Key capabilities: **smart navigation** (voice-controlled routing), **custom actions** (business logic via voice), and optional **page automation** (DOM interaction).

## Connection Paradigms

The client supports these top-level connection models:

1. **Hosted / platform token issuer** — pass **`apiKey`** (preferred, `vkey_*` format) or legacy **`appId`**. Optionally set **`convexUrl`** or **`tokenEndpoint`** to override the default hosted URL.
2. **Token-based flow** — **`tokenProvider`** callback or pre-issued **`voiceConfig.token`** for server-managed sessions.
3. **Direct WebSocket** — raw `voiceConfig.token` pointing to a Vowel Engine WebSocket. See `docs/recipes/connection-paradigms.md` for advanced patterns (sidecar, trusted server, fixed API keys).

**`apiKey` and `appId` are aliases** for the token issuer identifier. Prefer `apiKey` in new code.

## Installation

```bash
bun add @vowel.to/client @ricky0123/vad-web
# or: npm install @vowel.to/client @ricky0123/vad-web
```

For standalone/CDN usage, copy the standalone bundle:
```bash
cp -r node_modules/@vowel.to/client/dist/standalone ./public/vowel
```

## Core `_voiceConfig` Reference

`_voiceConfig` (the `VowelVoiceConfig` interface) is for specifying voice session overrides. In the standard **Vowel Core** self-hosted flow, the engine provides sensible defaults — you typically omit `_voiceConfig` entirely:

```typescript
// Self-hosted Vowel Core — no _voiceConfig needed (engine provides defaults):
const vowel = new Vowel({
  apiKey: 'vkey_public_xxx',
  tokenEndpoint: 'http://localhost:8080/api/token',
  routes: [...],
});

// With explicit overrides (user requested specific settings):
_voiceConfig: {
  provider: 'vowel-core',           // 'vowel-core' | 'vowel-prime' | 'gemini' | 'openai' | 'grok'
  voice: 'af_heart',
  language: 'en-US',
  turnDetection: { mode: 'server_vad' },

  initialGreetingPrompt: `Welcome to this application. Briefly personalize using available context, then ask what they want to do.`,
}
```

> **API note:** `_voiceConfig` (with underscore) is the current config path. The deprecated `voiceConfig` (no underscore) is a legacy alias — do not use it in new code.

### STT/TTS Provider Override (Dev-Only)

`_voiceConfig.stt` and `_voiceConfig.tts` are `@internal` dev-only overrides for testing different speech provider backends. In production, the managed preset or engine configuration resolves the optimal stack.

### Turn Detection / VAD

Turn detection controls when speech is detected and when the AI responds:

| Mode | Accuracy | Load Time | Use Case |
|------|----------|-----------|----------|
| **server_vad** (default) | High | Instant | Server-side VAD (AssemblyAI/Fennec). No client processing. |
| **client_vad** | High | 5-10s | Client-side ML (silero-vad). Best accuracy, client-side interruptions. |
| **semantic_vad** | High | Instant | Server-side semantic VAD. Understands speech context. |
| **disabled** | N/A | Instant | No VAD. Troubleshooting, bandwidth-constrained environments. |

```typescript
// Server VAD (default)
_voiceConfig: {
  turnDetection: {
    mode: 'server_vad',
    serverVAD: {
      threshold: 0.5,
      silenceDurationMs: 550,
      prefixPaddingMs: 0,
      interruptResponse: true,
    },
  },
}

// Client VAD
_voiceConfig: {
  turnDetection: {
    mode: 'client_vad',
    clientVAD: { adapter: 'silero-vad' },  // 'silero-vad' | 'simple-vad' | 'smart-turn'
  },
}
```

### Supported Languages

| Provider | Mode | Languages |
|----------|------|-----------|
| **Groq Whisper** | Client VAD (batch) | 99+ languages |
| **AssemblyAI** | Server VAD (streaming) | en, es, fr, de, it, pt |
| **Fennec ASR** | Server VAD (streaming) | Varies |
| **Inworld TTS** | Output engine | 12: en, es, fr, de, it, pt, ko, zh, ja, nl, pl, ru |

Of the 99+ Whisper languages, vowel only supports those Inworld TTS can speak. Unsupported languages fall back to English voice.

## ⚠️ INTERNAL: Vowel Prime SaaS Mode

This configuration path is for **internal vowel team testing** of the hosted Vowel Prime SaaS deployment. It is NOT for general self-hosted use.

The AI agent must NOT reach for this config unless the user **explicitly** asks for Vowel Prime or provides Vowel Prime credentials (e.g., a `vkey_*` publishable key that resolves to a Vowel Prime token issuer).

**Default behavior:** Self-hosted Vowel Core with a `tokenEndpoint` pointing to the user's self-hosted core instance. Always start there.

### Vowel Prime Config

```typescript
_voiceConfig: {
  provider: 'vowel-prime',
  vowelPrimeConfig: {
    environment: 'testing',  // see environment table below
  },
  llmProvider: 'groq',
  model: "openai/gpt-oss-120b",
  voice: 'Timothy',
  language: 'en-US',
  initialGreetingPrompt: `Welcome the user to this application, briefly mention what this page is for, and ask how you can help.`,
  stt: { provider: 'groq-whisper' },
  tts: { provider: 'grok' },
}
```

### Environment Reference

| Environment  | URL                                           | Provider Type      |
|--------------|-----------------------------------------------|--------------------|
| `testing`    | `wss://testing-prime.vowel.to/v1/realtime`    | `vowel-prime`      |
| `dev`        | `wss://dev-prime.vowel.to/v1/realtime`        | `vowel-prime`      |
| `staging`    | `wss://staging.prime.vowel.to/v1/realtime`    | `vowel-prime`      |
| `production` | `wss://prime.vowel.to/v1/realtime`            | `vowel-prime`      |
| `billing-test` | `wss://billing-test.vowel.to/v1/realtime`   | `vowel-prime`      |
| `testing-cfa`  | `wss://testing-cfa-prime.vowel.to`          | `cloudflare-voice` |

### Dev-Only STT/TTS Override Reference

`_voiceConfig.stt` and `_voiceConfig.tts` are `@internal` dev-only overrides:

**Supported STT providers:** `deepgram`, `groq-whisper`, `assemblyai`, `fennec`, `modulate`, `grok`, `mistral-voxtral-realtime`, `none` (text-only).

**Supported TTS providers:** `deepgram`, `inworld`, `grok`, `none` (text-only).

The `"none"` provider disables speech I/O for text-only mode.

## Context Management

Context gives the AI current app state. It is **baked into the token request** before the session starts — no race condition, no fallback action needed.

```typescript
// Push context after creating client (before startSession)
vowelInstance.updateContext({ route: { pathname: '/products' }, cart: { items: [] } });

// React hook (auto-syncs on value changes)
useSyncContext({ route: { pathname: '/products' }, userName: 'Alice' });

// Initial context at construction
const vowel = new Vowel({
  initialContext: { route: { pathname: '/', pathnameLabel: 'Home' } },
});
```

## Adapter Patterns

Adapters bridge voice navigation to your app's routing system:

| Adapter | Use Case |
|---------|----------|
| **`createDirectAdapters()`** | SPAs with client-side routing. Pass `navigate()` and `getCurrentPath()` callbacks. |
| **`createControlledAdapters()`** | Multi-page / reload-based sites. Uses `BroadcastChannel` for cross-page state. |
| **`createTanStackAdapters()`** | TanStack Router (automatic route discovery). |
| **`createReactRouterAdapters()`** | React Router v6+. |
| **`createNextJSAdapters()`** | Next.js App Router (uses `useRouter` from `next/navigation`). |

Automation adapters are disabled by default — opt-in only when DOM manipulation is explicitly needed.

## Custom Actions

Register actions **before** calling `startSession()`. Actions should modify application state, not the DOM:

```typescript
vowel.registerAction('searchProducts', {
  description: 'Search products by query',
  parameters: {
    query: { type: 'string', description: 'Search query' },
  },
}, async ({ query }) => {
  productStore.setSearchQuery(query);
  return { success: true };
});
```

**Best practices:**
- Write to app store/state management, not DOM
- Shallow parameters (strings, numbers, booleans)
- 10-15 actions max
- Register all before `startSession()`
- Actions **cannot** call other actions — only the AI can

## Environment Variables

```bash
# Vite
VITE_VOWEL_APP_ID=your-app-id

# Next.js (MUST use NEXT_PUBLIC_ prefix for client code)
NEXT_PUBLIC_VOWEL_APP_ID=your-app-id

# Create React App
REACT_APP_VOWEL_APP_ID=your-app-id

# Self-hosted core endpoint (optional — overrides Vowel Core engine URL)
VITE_VOWEL_CORE_URL=http://localhost:8080
```

## Sub-Agent / Voice Control of App Chat or AI

If the app has its own programmatically controllable chat or AI, Vowel can delegate to it via custom actions:

1. Register a bridge action (e.g., `sendToAppChat`, `askEmbeddedAI`)
2. Handler sends prompt to the chat/AI, waits for response, returns it
3. System instructions tell the AI when to delegate

## Troubleshooting (Client-Level)

- **Mic not working:** HTTPS required (localhost exempted). Check browser permissions.
- **Vowel undefined:** Script not loaded; use `import { Vowel } from '@vowel.to/client'` (not `window.Vowel`) unless using standalone bundle.
- **Actions ignored:** Were they registered before `startSession()`?
- **Wrong state on first turn:** Push `updateContext(initialState)` immediately after creating the client. Context is included in the token request.
- **Client null / Provider not mounting:** Verify `appId`/`apiKey` reaches `new Vowel()`. Next.js: use `NEXT_PUBLIC_` prefix.
