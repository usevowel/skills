# vowel-client — Changelog

## `@vowel.to/client` breaking changes affecting all framework skills.

### [Unreleased]

### v0.4.x

- **`SttOverrideConfig` / `TtsOverrideConfig`** — Anonymous `{ provider: string }` replaced with named exported types. Both marked `@internal`.
- **Context injection:** Context is baked into the token request — no `getAppState` fallback action needed. `updateContext()` + `useSyncContext` handle runtime state.

### v0.3.x — v0.4.1-beta

- **Adapter factories over legacy `router` helpers:** Prefer `createTanStackAdapters()`, `createReactRouterAdapters()`, `createDirectAdapters()`, `createControlledAdapters()`. Legacy `tanstackRouterAdapter()` etc. deprecated.
- **`apiKey`-first:** `apiKey` is the preferred token issuer field; `appId` is a legacy alias.
- **`automationAdapter` opt-in:** Disabled by default — pass explicitly to enable.
- **`VowelAgent` replaces old banner components:** Prefer `VowelAgent` component.

### v0.2.0

- **Public API cleanup:** Removed `agentConfig`, simplified `Vowel` constructor. Internal managers and low-level classes moved out of root exports.
- **`voiceConfig` stabilization:** `provider`, `model`, `voice`, `language` moved to stable top-level `voiceConfig` fields.

### v0.1.x

- Initial releases. Gemini and OpenAI provider support. `router`-based integration.
