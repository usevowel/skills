# vowel-vanilla — Changelog

### [Unreleased]

- **vowel-client extracted.** This skill now loads `vowel-client` for core knowledge. Only vanilla-specific adapter/setup guidance remains here.

### v0.3.x — v0.4.x

- **`createDirectAdapters()` and `createControlledAdapters()`** replace manual adapter wiring for most cases. Legacy patterns still work but factories are preferred.
- **Standalone bundle:** `window.Vowel` requires `vowel-voice-widget.min.js` loaded on the page.

### v0.2.0

- `apiKey`-first token issuer. `appId` is a legacy alias.
