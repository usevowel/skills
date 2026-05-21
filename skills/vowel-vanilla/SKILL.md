---
name: vowel-vanilla
description: Initialize vowel.to voice agent in vanilla JavaScript applications (no React) using standalone bundles or module imports, direct/controlled adapters, and custom actions. Use when integrating voice into plain JS SPAs or traditional multi-page sites. First read vowel-client/SKILL.md for core @vowel.to/client knowledge.
---

# Vowel Vanilla JavaScript Integration

**Before using this skill, read `vowel-client/SKILL.md` for core @vowel.to/client concepts** (installation, voiceConfig, connection paradigms, context management, custom actions basics).

This skill adds vanilla-JS-specific patterns.

## Core Principles

### 1) Register Actions Before `startSession()`

All custom actions must be registered before the first call to `startSession()`. Actions added afterward are not available to the active session.

### 2) Start Session from a User Gesture

Call `startSession()` from a click/tap handler to satisfy browser audio/microphone gesture requirements.

### 3) Pick the Right Adapter Pattern

- `createDirectAdapters(...)`: SPAs using client-side routing.
- `createControlledAdapters(...)`: traditional multi-page sites with full reloads.

### 4) Default to App-Specific Greeting + Captions

Set `_voiceConfig.initialGreetingPrompt` to match the app's domain, and enable captions by default (`_caption.enabled = true`).

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
  ],
  enableAutomation: true,
});

const vowel = new Vowel({
  apiKey: 'vkey_public_xxx',
  navigationAdapter,
  automationAdapter,
  _caption: { enabled: true },
  _voiceConfig: {
    provider: 'vowel-core',
    voice: 'af_heart',
    language: 'en-US',
    turnDetection: { mode: 'server_vad' },
    initialGreetingPrompt: `Welcome the user to this application, briefly mention what this page is for, and ask how you can help.`
  }
});

vowel.registerAction('searchProducts', {
  description: 'Search products by query',
  parameters: {
    query: { type: 'string', description: 'Search query text' },
  },
}, async ({ query }) => {
  runSearch(query);
  return { success: true };
});

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
      apiKey: 'vkey_public_xxx',
      _caption: { enabled: true },
      _voiceConfig: {
        provider: 'vowel-core',
        voice: 'af_heart',
        language: 'en-US',
        turnDetection: { mode: 'server_vad' },
        initialGreetingPrompt: `Welcome the user to this application, briefly mention what this page is for, and ask how you can help.`
      }
    });

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

For server-rendered/traditional sites, use controlled adapters:

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
  apiKey: 'vkey_public_xxx',
  navigationAdapter,
  automationAdapter,
  _caption: { enabled: true },
  _voiceConfig: {
    provider: 'vowel-core',
    voice: 'af_heart',
    language: 'en-US',
    turnDetection: { mode: 'server_vad' },
    initialGreetingPrompt: `Welcome the user to this application, briefly mention what this page is for, and ask how you can help.`
  }
});
```

## Readiness and State Wiring

- Subscribe with `vowel.onStateChange(...)` to drive button labels and status UI.
- Use `vowel.notifyEvent(...)` for app-side notifications that should be spoken.

## ⚠️ INTERNAL: Vowel Prime SaaS Mode

This configuration path is for **internal vowel team testing** of the hosted Vowel Prime SaaS deployment. It is NOT for general self-hosted use.

The AI agent must NOT reach for this config unless the user **explicitly** asks for Vowel Prime or provides Vowel Prime credentials.

**Default behavior:** Self-hosted Vowel Core with a `tokenEndpoint`. Do not default to Vowel Prime.

```ts
_voiceConfig: {
  provider: 'vowel-prime',
  vowelPrimeConfig: { environment: 'testing' },
  llmProvider: 'groq',
  model: "openai/gpt-oss-120b",
  voice: 'Timothy',
  language: 'en-US',
  initialGreetingPrompt: `Welcome the user to this application, briefly mention what this page is for, and ask how you can help.`,
  stt: { provider: 'groq-whisper' },
  tts: { provider: 'grok' },
}
```

See **vowel-client/SKILL.md** for the full environment reference table and dev-only override docs.

## Troubleshooting

- `Vowel` undefined: script/module not loaded yet; initialize after DOM/module readiness.
- No mic prompt: site must be HTTPS (or localhost).
- Actions ignored: verify actions were registered before `startSession()`.
- Navigation fails: adapter pattern mismatches app routing model.

## Reference

- **references/adapter-patterns.md** - Direct vs controlled adapter patterns
