---
name: vowel-vanilla
description: Initialize vowel.to voice agent in vanilla JavaScript applications (no React) using standalone bundles or module imports, direct/controlled adapters, and custom actions. Use when integrating voice into plain JS SPAs or traditional multi-page sites.
---

# Vowel Vanilla JavaScript Integration

Initialize a vowel.to voice agent in plain JavaScript applications with predictable startup and session behavior.

## Overview

Use this skill when the app is not React-first and you want direct control over:

- Vowel client lifecycle
- Navigation + automation adapters
- Custom action registration
- Session start/stop UI wiring

## Core Principles

### 1) Register Actions Before `startSession()`

All custom actions must be registered before the first call to `startSession()`. Actions added afterward are not available to the active session.

### 2) Start Session from a User Gesture

Call `startSession()` from a click/tap handler to satisfy browser audio/microphone gesture requirements.

### 3) Pick the Right Adapter Pattern

- `createDirectAdapters(...)`: SPAs using client-side routing.
- `createControlledAdapters(...)`: traditional multi-page sites with full reloads.

See [references/adapter-patterns.md](references/adapter-patterns.md).

### 4) Default to App-Specific Greeting + Captions

Set `voiceConfig.initialGreetingPrompt` to match the app's domain/page context, and enable captions by default (`_caption.enabled = true`).

## Installation

```bash
bun add @vowel.to/client @ricky0123/vad-web

# Or if using npm/yarn:
# npm install @vowel.to/client @ricky0123/vad-web
```

## Quick Start (Bundler / Module Import)

```ts
import { Vowel, createDirectAdapters } from '@vowel.to/client';

const { navigationAdapter, automationAdapter } = createDirectAdapters({
  navigate: (path) => {
    history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate', { state: null }));
  },
  getCurrentPath: () => window.location.pathname,
  routes: [
    { path: '/', description: 'Home page' },
    { path: '/products', description: 'Products page' },
    { path: '/cart', description: 'Cart page' },
  ],
  enableAutomation: true,
});

const vowel = new Vowel({
  appId: 'your-app-id',
  navigationAdapter,
  automationAdapter,
  // @ts-ignore - internal caption config may not be fully typed in all builds
  _caption: { enabled: true },
  voiceConfig: {
    provider: 'vowel-prime',
    vowelPrimeConfig: { environment: 'staging' },
    llmProvider: 'groq',
    model: "openai/gpt-oss-120b",
    voice: 'Timothy',
    language: 'en-US',
    initialGreetingPrompt: `Welcome the user to this application, briefly mention what this page is for, and ask how you can help.`
  }
});

vowel.registerAction(
  'searchProducts',
  {
    description: 'Search products by query',
    parameters: {
      query: { type: 'string', description: 'Search query text' },
    },
  },
  async ({ query }) => {
    // Update app state/store here, not direct random DOM mutations.
    runSearch(query);
    return { success: true };
  }
);

const micButton = document.getElementById('voice-toggle');
micButton?.addEventListener('click', async () => {
  if (vowel.state.isConnected) {
    vowel.stopSession();
  } else {
    await vowel.startSession();
  }
});
```

## Quick Start (Standalone Script)

```html
<link rel="stylesheet" href="/vowel/vowel.css" />
<script src="/vowel/vowel.min.js" defer></script>
<script>
  window.addEventListener('DOMContentLoaded', () => {
    const VowelCtor = window.Vowel || window.VowelClient?.Vowel;
    const vowel = new VowelCtor({
      appId: 'your-app-id',
      // @ts-ignore - internal caption config may not be fully typed in all builds
      _caption: { enabled: true },
      voiceConfig: {
        provider: 'vowel-prime',
        vowelPrimeConfig: { environment: 'staging' },
        llmProvider: 'groq',
        model: "openai/gpt-oss-120b",
        voice: 'Timothy',
        language: 'en-US',
        initialGreetingPrompt: `Welcome the user to this application, briefly mention what this page is for, and ask how you can help.`
      }
    });

    // Register actions before session start.
    vowel.registerAction('ping', {
      description: 'Health check',
      parameters: {}
    }, async () => ({ success: true }));

    document.getElementById('voice-toggle')?.addEventListener('click', async () => {
      if (vowel.state.isConnected) vowel.stopSession();
      else await vowel.startSession();
    });
  });
</script>
```

## Multi-Page Sites (Reload Navigation)

For server-rendered/traditional sites, use controlled adapters so state and voice navigation survive page transitions.

```ts
import { Vowel, createControlledAdapters } from '@vowel.to/client';

const { navigationAdapter, automationAdapter } = createControlledAdapters({
  channelName: 'my-site-vowel',
  routes: [
    { path: '/', description: 'Home page' },
    { path: '/products', description: 'Products page' },
  ],
  enableAutomation: true,
});

const vowel = new Vowel({
  appId: 'your-app-id',
  navigationAdapter,
  automationAdapter,
  // @ts-ignore - internal caption config may not be fully typed in all builds
  _caption: { enabled: true },
  voiceConfig: {
    provider: 'vowel-prime',
    vowelPrimeConfig: { environment: 'staging' },
    llmProvider: 'groq',
    model: "openai/gpt-oss-120b",
    voice: 'Timothy',
    language: 'en-US',
    initialGreetingPrompt: `Welcome the user to this application, briefly mention what this page is for, and ask how you can help.`
  }
});
```

## Readiness and State Wiring

- Subscribe with `vowel.onStateChange(...)` to drive button labels and status UI.
- Use `vowel.notifyEvent(...)` for app-side notifications that should be spoken.
- Keep route descriptions accurate so navigation commands are reliable.

## Sub-Agent / Voice Control of App Chat or AI

If the app has its own programmatically controllable chat, AI interface, or LLM integration (e.g., OpenWebUI, in-app chat, headless API), the Vowel voice agent can act as a **controller** or **orchestrator**. The user speaks to Vowel; Vowel delegates to the app's chat/AI via custom actions; the response is returned and spoken back to the user.

**Pattern:**
- User: "Ask the AI to summarize this page" → Vowel calls an action that sends the prompt to the app's chat
- App's chat/AI processes and returns a response
- Vowel speaks the response back to the user

**Implementation:**
1. **Register custom actions** that bridge to whatever is programmatically controllable (chat send API, global function, postMessage to iframe, etc.). Choose action names that fit the app's domain (e.g., `sendToAppChat`, `askEmbeddedAI`, `queryChatModel`, `sendPromptToLLM`).
2. **Action handler** should: send the user's request (or a derived prompt) to the app's chat/AI, wait for the response, and return it so the voice agent can speak it.
3. **System instructions** should tell the voice agent when to delegate: e.g., "When the user says 'ask the AI', 'tell the chat', 'send a message to the model', or similar, use the [action name] to send the request and speak back the response."

Support any interface that can be controlled programmatically via vowel actions. The coding agent may choose appropriate action names and parameter shapes based on the app's structure.

## Troubleshooting

- `Vowel` undefined: script/module not loaded yet; initialize after DOM/module readiness.
- No mic prompt: site must be HTTPS (or localhost).
- Actions ignored: verify actions were registered before `startSession()`.
- Navigation fails: adapter pattern mismatches app routing model.
