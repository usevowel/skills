---
name: vowel-webcomponent
description: Initialize vowel.to via the <vowel-voice-widget> web component for framework-agnostic integration. Use when adding a drop-in voice widget to any site and wiring custom actions/events after readiness. First read vowel-client/SKILL.md for core @vowel.to/client knowledge.
---

# Vowel Web Component Integration

**Before using this skill, read `vowel-client/SKILL.md` for core @vowel.to/client concepts** (installation, voiceConfig, custom actions basics).

This skill adds web-component-specific patterns.

## Core Principles

### 1) Wait for `vowel-ready` Before Programmatic Wiring

Register programmatic actions and call methods only after the component fires the `vowel-ready` event.

### 2) Register Custom Actions Before Starting Session

If you control session start manually, ensure all actions are attached before `startSession()`.

### 3) Choose the Correct Preset

- `preset="vanilla"` (default): SPA-style client navigation.
- `preset="controlled"`: traditional reload/navigation sites.

### 4) Default to App-Specific Greeting + Captions

Set an app-specific `voiceConfig.initialGreetingPrompt` and enable captions by default with `show-transcripts="true"`.

## Setup

```bash
bun add @vowel.to/client @ricky0123/vad-web
cp -r node_modules/@vowel.to/client/dist/standalone ./public/vowel
```

```html
<link rel="stylesheet" href="/vowel/vowel-voice-widget.css" />
<script src="/vowel/vowel-voice-widget.min.js" defer></script>
```

## Minimal Embed

```html
<vowel-voice-widget
  app-id="your-app-id"
  position="bottom-right"
  show-transcripts="true"
  config='{"_voiceConfig":{"provider":"vowel-core","voice":"af_heart","language":"en-US","turnDetection":{"mode":"server_vad"},"initialGreetingPrompt":"Welcome the user to this application, briefly mention what this page is for, and ask how you can help."}}'
  preset="vanilla">
</vowel-voice-widget>
```

## Ready Pattern (Critical)

```html
<vowel-voice-widget id="voiceWidget" app-id="your-app-id" show-transcripts="true"></vowel-voice-widget>
<script>
  const widget = document.getElementById('voiceWidget');

  widget.setConfig({
    _voiceConfig: {
      provider: 'vowel-core',
      voice: 'af_heart',
      language: 'en-US',
      turnDetection: { mode: 'server_vad' },
      initialGreetingPrompt: `Welcome the user to this application, briefly mention what this page is for, and ask how you can help.`
    }
  });

  widget.addEventListener('vowel-ready', async (event) => {
    const { client } = event.detail;

    widget.registerAction('searchProducts', {
      description: 'Search products by query',
      parameters: {
        query: { type: 'string', description: 'Search query text' }
      }
    }, async ({ query }) => {
      updateSearch(query);
      return { success: true };
    });

    // Optional manual start
    // await widget.startSession();
  });
</script>
```

## Custom Actions via Attribute

Handler names must resolve on `window`:

```html
<script>
  window.handleSearch = async ({ query }) => {
    updateSearch(query);
    return { success: true };
  };
</script>

<vowel-voice-widget
  app-id="your-app-id"
  custom-actions='[{"name":"searchProducts","definition":{"description":"Search products","parameters":{"query":{"type":"string","description":"Search query"}}},"handler":"handleSearch"}]'>
</vowel-voice-widget>
```

## Programmatic Control

Use element methods after readiness:
- `startSession()`, `stopSession()`, `toggleSession()`
- `registerAction(name, definition, handler)`
- `notifyEvent(message, context)`, `sendText(text)`

## ⚠️ INTERNAL: Vowel Prime SaaS Mode

This configuration path is for **internal vowel team testing** of the hosted Vowel Prime SaaS deployment. It is NOT for general self-hosted use.

The AI agent must NOT reach for this config unless the user **explicitly** asks for Vowel Prime or provides Vowel Prime credentials.

**Default behavior:** Self-hosted Vowel Core with a `tokenEndpoint`. Do not default to Vowel Prime.

```html
<vowel-voice-widget
  api-key="vkey_public_xxx"
  position="bottom-right"
  show-transcripts="true"
  config='{"_voiceConfig":{"provider":"vowel-prime","vowelPrimeConfig":{"environment":"testing"},"llmProvider":"groq","model":"openai/gpt-oss-120b","voice":"Timothy","language":"en-US"}}'
  preset="vanilla">
</vowel-voice-widget>
```

See **vowel-client/SKILL.md** for the full environment reference table and dev-only override docs.

## Troubleshooting

- Widget not visible: confirm JS/CSS asset URLs and load order.
- No mic access: HTTPS required outside localhost.
- No custom actions: handlers attached too late or handler name not global.
- No events: listener added before element exists or wrong event name.

## Reference

- **references/attributes-events-methods.md** - Full attribute, event, and method reference
