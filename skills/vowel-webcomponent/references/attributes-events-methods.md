# Web Component Reference

## Common Attributes

- `app-id` (required): Vowel app ID.
- `position`: `bottom-right`, `bottom-left`, `top-right`, `top-left`.
- `preset`: `vanilla` (default) or `controlled`.
- `show-transcripts`: boolean.
- `button-color`: CSS color.
- `custom-actions`: JSON string (handler names map to `window` functions).
- `config`: JSON string for instruction/voice overrides.
- `init-mode`: `auto` (default) or `custom` (factory-based).

## Events

- `vowel-ready`: `{ client }` once client and element API are ready.
- `vowel-state-change`: current voice/session state changes.
- `vowel-transcript`: transcript events as speech turns are added.
- `vowel-error`: initialization/session/runtime errors.

## Element Methods

- `registerAction(name, definition, handler)`
- `getVowelClient()`
- `startSession()`
- `stopSession()`
- `getState()`
- `setConfig(config)`

## Optional Helper API (Module Imports)

If importing from `@vowel.to/client/web-component`, you can use:

- `waitForVowelReady(element)`
- `enhanceVowelElement(element, instanceId)`
- `dispatchVowelEvent(element, eventName, detail)`

## Preset Guidance

- `vanilla`: best for SPA/client-side routing.
- `controlled`: best for sites that fully reload on navigation.
- `shopify` exists internally but should not be recommended as a public default.
