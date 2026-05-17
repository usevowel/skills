---
name: vowel-client
description: Core @vowel.to/client knowledge shared by all framework skills. Covers installation, connection paradigms (apiKey/appId/tokenProvider/direct token), voiceConfig reference (provider, model, voice, language, STT/TTS overrides, VAD, turn detection), adapter patterns, custom actions, context management, and environment variables. Framework-specific skills (vowel-react, vowel-vanilla, vowel-webcomponent) instruct agents to load this file first.
---

# Vowel Client Library

Core reference for `@vowel.to/client`. Framework-specific skills (vowel-react, vowel-vanilla, vowel-webcomponent) assume you have read this file first.

## What is Vowel?

**vowel** (lowercase) is a SaaS platform that adds AI-powered voice agents to web applications. The `@vowel.to/client` package provides real-time voice interaction via vowel-prime, Gemini Live API, or OpenAI Realtime API. Key capabilities: **smart navigation** (voice-controlled routing), **custom actions** (business logic via voice), and optional **page automation** (DOM interaction).

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

## Core voiceConfig Reference

Use `voiceConfig` (or its escape-hatch alias `_voiceConfig`) to configure the voice session:

```typescript
voiceConfig: {
  provider: 'vowel-prime',           // 'vowel-prime' | 'gemini' | 'openai' | 'grok' | 'vowel-core'
  vowelPrimeConfig: { environment: 'staging' },
  llmProvider: 'groq',               // 'groq' | 'openrouter'
  model: "openai/gpt-oss-120b",      // LLM model
  voice: 'Timothy',                  // TTS voice name
  language: 'en-US',                 // ISO 639-1 language code

  initialGreetingPrompt: `Welcome to this application. Briefly personalize using available context, then ask what they want to do.`,

  // DEV-ONLY: STT/TTS provider overrides (server presets used in production)
  // stt: { provider: 'deepgram' },
  // tts: { provider: 'deepgram' },
}
```

### STT/TTS Provider Override (Dev-Only)

`voiceConfig.stt` and `voiceConfig.tts` are `@internal` dev-only overrides for testing. In production, the managed preset system resolves the optimal stack.

**Supported STT providers:** `deepgram`, `groq-whisper`, `assemblyai`, `fennec`, `modulate`, `grok`, `mistral-voxtral-realtime`, `none` (text-only).

**Supported TTS providers:** `deepgram`, `inworld`, `grok`, `none` (text-only).

The `"none"` provider disables speech I/O for text-only mode.

### Turn Detection / VAD

Turn detection controls when speech is detected and when the AI responds:

| Mode | Accuracy | Load Time | Use Case |
|------|----------|-----------|----------|
| **client_vad** (default) | High | 5-10s | Client-side ML (silero-vad). Best accuracy, client-side interruptions. |
| **server_vad** | High | Instant | Server-side VAD (AssemblyAI/Fennec). No client processing. |
| **semantic_vad** | High | Instant | Server-side semantic VAD. Understands speech context. |
| **disabled** | N/A | Instant | No VAD. Troubleshooting, bandwidth-constrained environments. |

```typescript
// Client VAD (default)
voiceConfig: {
  turnDetection: {
    mode: 'client_vad',
    clientVAD: { adapter: 'silero-vad' },  // 'silero-vad' | 'simple-vad' | 'smart-turn'
  },
}

// Server VAD
voiceConfig: {
  turnDetection: {
    mode: 'server_vad',
    serverVAD: {
      threshold: 0.5,
      silenceDurationMs: 550,
      prefixPaddingMs: 0,
      interruptResponse: true,
    },
  },
  useServerVad: true,
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

# Self-hosted URL override (optional)
VITE_VOWEL_URL=wss://realtime.vowel.to/v1
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
