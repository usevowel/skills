# Vowel Platform Overview

Essential context for integrating the vowel voice AI platform into React applications.

## What is vowel?

**vowel** (lowercase) is a SaaS platform that enables developers to add AI-powered voice agents to any web application. It provides:

- **Real-time Voice Interface** - Powered by Google Gemini Live API, OpenAI Realtime API, or vowel-prime (custom backend)
- **Smart Navigation** - AI understands app routes and navigates via voice commands
- **Custom Actions** - Business logic the AI can execute via voice (e.g., add to cart, search products)
- **Page Automation** - Voice-controlled DOM interaction (click, type, search) - optional, disabled by default in React
- **Framework Agnostic** - Works with React, Vue, Next.js, Laravel, vanilla JS

**Package:** `@vowel.to/client` - NPM package at [vowel.to](https://vowel.to)

## Key Concepts for React Integration

### Token issuer identifier (`apiKey` / `appId`) and tokens

- **`apiKey` (preferred)** - Top-level field on `new Vowel({ ... })` for the **token issuer identifier**. It accepts either a **publishable API key** (`vkey_*`) or a **legacy hosted app identifier** during the migration to key-first auth.
- **`appId` (legacy alias)** - Same meaning as `apiKey`; kept for backward compatibility. New examples should prefer `apiKey`, but either field works.
- When you pass one of these identifiers, the client calls the hosted (or custom) token issuer to obtain a **short-lived session token**; long-lived secrets stay off the client except where you intentionally use advanced patterns.
- **Direct token** - Alternative: pass a pre-issued token via `voiceConfig.token` (or use `tokenProvider`) to bypass the default token endpoint (custom auth, server-managed sessions).
- **Custom issuer URL** - Optional `convexUrl` or `tokenEndpoint` on the client points token minting at a specific Convex **site** URL or a fully custom HTTP endpoint (see `VowelClientConfig` in `@vowel.to/client`).

### Dual Adapter Architecture

Vowel uses two independent adapters:

| Adapter | Purpose | React default |
|---------|---------|---------------|
| **Navigation** | Voice-controlled routing (WHERE to go) | ✅ Always enabled |
| **Automation** | Voice-controlled DOM interaction (WHAT to do on page) | ❌ Disabled by default |

For React apps, prefer **custom actions** that write to state stores over the automation adapter. Enable automation only when the user explicitly requests DOM interaction.

### Connection Paradigms

Vowel supports multiple connection patterns: **platform-managed** (appId), **developer-managed tokens** (backend mints), **fixed API keys**, **direct WebSocket**, and **sidecar** (client + server same session). See **references/connection-paradigms.md** and workspace `docs/recipes/connection-paradigms.md`.

### Supported Languages and VAD

- **Languages**: Of 99+ Whisper languages (client VAD), only those Inworld TTS can speak are fully supported (12: en, es, fr, de, it, pt, ko, zh, ja, nl, pl, ru). AssemblyAI (server VAD) supports 6. See **references/languages-and-vad.md**.
- **VAD modes**: `client_vad` (default, silero-vad), `server_vad` (AssemblyAI/Fennec), `semantic_vad`, `disabled`.

### Connection Flow

1. Client creates a `Vowel` instance with `apiKey` / `appId`, `tokenProvider`, or a direct `voiceConfig.token`.
2. Platform (or your backend) returns a short-lived token with tool definitions.
3. Client opens a WebSocket to **Vowel Engine** (e.g. hosted **Vowel Prime** or self-hosted engine).
4. Audio flows: microphone → client → engine → TTS → speaker.
5. Tool calls (navigation, custom actions) execute in the browser.

### Custom Actions: Client-Side Execution

**Critical:** Custom actions run in the user's browser, not on the server. This enables:
- Low latency (no round-trip)
- Access to app state (stores, localStorage)
- Framework-agnostic execution

Actions must be registered **before** `startSession()`. They should modify application state, not manipulate the DOM directly.

## Platform Components (Monorepo)

When working in the vowel workspace:

- **client/** - `@vowel.to/client` library (adapters, providers, components)
- **platform/** - Admin dashboard + Convex backend (token generation, app config)
- **engine/** - **Vowel Engine** realtime backend (OpenAI Realtime–compatible) — submodule
- **engine-hosted/** - Hosted deployment wrapper for managed **Vowel Prime** (not the default self-hosted stack)
- **core/** - Self-hosted control plane (apps, keys, runtime JSON)
- **webextension/** - Browser extension — submodule
- **demos/** - Reference implementations — submodule

## Naming Conventions

- **Platform name:** `vowel` (all lowercase)
- **Domain:** `vowel.to` (package namespace `@vowel.to/client`)
- **Realtime product:** **Vowel Engine** (use in docs and skills; avoid legacy internal codenames in customer-facing text)
- **Hosted managed offering:** **Vowel Prime** (managed Vowel Engine; not a separate self-hosted backend)
