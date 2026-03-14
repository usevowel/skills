---
name: vowel-webcomponent
description: Initialize vowel.to via the <vowel-voice-widget> web component for framework-agnostic integration. Use when adding a drop-in voice widget to any site and wiring custom actions/events after readiness.
---

# Vowel Web Component Integration

Initialize vowel.to using `<vowel-voice-widget>` for drop-in integration across frameworks and plain HTML.

## Overview

Use this skill when you want:

- Fast embed with minimal app code changes
- Framework-agnostic integration (React/Vue/Laravel/WordPress/plain HTML)
- Programmatic control through DOM events and element methods

## Core Principles

### 1) Wait for `vowel-ready` Before Programmatic Wiring

Register programmatic actions and call methods only after the component is ready.

### 2) Register Custom Actions Before Starting Session

If you control session start manually, ensure all actions are attached before `startSession()`.

### 3) Choose the Correct Preset

- `preset="vanilla"` (default): SPA-style client navigation.
- `preset="controlled"`: traditional reload/navigation sites.

See [references/attributes-events-methods.md](references/attributes-events-methods.md).

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
  config='{"voiceConfig":{"provider":"vowel-prime","vowelPrimeConfig":{"environment":"staging"},"llmProvider":"groq","model":"openai/gpt-oss-120b","voice":"Timothy","language":"en-US","initialGreetingPrompt":"Welcome the user to this application, briefly mention what this page is for, and ask how you can help."}}'
  preset="vanilla">
</vowel-voice-widget>
```

## Ready Pattern (Critical)

```html
<vowel-voice-widget id="voiceWidget" app-id="your-app-id" show-transcripts="true"></vowel-voice-widget>
<script>
  const widget = document.getElementById('voiceWidget');

  widget.setConfig({
    voiceConfig: {
      provider: 'vowel-prime',
      vowelPrimeConfig: { environment: 'staging' },
      llmProvider: 'groq',
      model: 'openai/gpt-oss-120b',
      voice: 'Timothy',
      language: 'en-US',
      initialGreetingPrompt: `Welcome the user to this application, briefly mention what this page is for, and ask how you can help.`
    }
  });

  widget.addEventListener('vowel-ready', async (event) => {
    const { client } = event.detail;

    // Register actions as soon as the widget is ready.
    widget.registerAction('searchProducts', {
      description: 'Search products by query',
      parameters: {
        query: { type: 'string', description: 'Search query text' }
      }
    }, async ({ query }) => {
      updateSearch(query);
      return { success: true };
    });

    // Optional manual start if you do not want auto user-driven start.
    // await widget.startSession();
  });
</script>
```

## Custom Actions via Attribute

If using the `custom-actions` attribute, handler names must resolve on `window`.

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

- `startSession()`
- `stopSession()`
- `toggleSession()`
- `registerAction(name, definition, handler)`
- `notifyEvent(message, context)`
- `sendText(text)`

## Sub-Agent / Voice Control of App Chat or AI

If the app has its own programmatically controllable chat, AI interface, or LLM integration (e.g., OpenWebUI, in-app chat, headless API), the Vowel voice agent can act as a **controller** or **orchestrator**. The user speaks to Vowel; Vowel delegates to the app's chat/AI via custom actions; the response is returned and spoken back to the user.

**Pattern:**
- User: "Ask the AI to summarize this page" → Vowel calls an action that sends the prompt to the app's chat
- App's chat/AI processes and returns a response
- Vowel speaks the response back to the user

**Implementation:**
1. **Register custom actions** (via `widget.registerAction` or `custom-actions` attribute) that bridge to whatever is programmatically controllable (chat send API, global function, postMessage to iframe, etc.). Choose action names that fit the app's domain (e.g., `sendToAppChat`, `askEmbeddedAI`, `queryChatModel`, `sendPromptToLLM`).
2. **Action handler** should: send the user's request (or a derived prompt) to the app's chat/AI, wait for the response, and return it so the voice agent can speak it.
3. **System instructions** (via config) should tell the voice agent when to delegate: e.g., "When the user says 'ask the AI', 'tell the chat', 'send a message to the model', or similar, use the [action name] to send the request and speak back the response."

Support any interface that can be controlled programmatically via vowel actions. The coding agent may choose appropriate action names and parameter shapes based on the app's structure.

## Troubleshooting

- Widget not visible: confirm JS/CSS asset URLs and load order.
- No mic access: HTTPS required outside localhost.
- No custom actions: handlers attached too late or handler name not global.
- No events: listener added before element exists or wrong event name.
