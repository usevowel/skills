# vowel-webcomponent — Changelog

### [Unreleased]

- **vowel-client extracted.** This skill now loads `vowel-client` for core knowledge. Only web-component-specific embed/event guidance remains here.

### v0.3.x — v0.4.x

- **`vowel-ready` event** is the canonical readiness signal. `config` attribute replaced by `setConfig()` method on the element.
- **`preset` attribute:** `preset="vanilla"` (SPA, default), `preset="controlled"` (reload-based sites).
