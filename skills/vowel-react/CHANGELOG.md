# vowel-react — Changelog

React-specific changes for `@vowel.to/client` integration.

### [Unreleased]

- **`getAppState` fallback action removed.** Context injection handles state — no fallback action needed. System instructions no longer need "call getAppState() FIRST."
- **Context-ready patterns simplified.** Patterns 5 (getAppState) removed from initialization-context-ready.md.

### v0.5.0

- **Simplified `vowel.client.ts` — removed setAppId/getVowel/subscribeToVowelChanges wrappers.** The complex module-level state management pattern with `vowelChangeListeners` and loading gates has been replaced with a simple `createVowelClient()` factory function. Apps create the client directly and pass it to `VowelProvider`. No more subscription boilerplate, no more startup deadlock risks.
- **initialization-context-ready.md rewritten.** Removed patterns 1-7 and the summary checklist. Replaced with a single-page guide: create the client, push context, done.
- **router-adapters.md simplified.** All vowel.client.ts examples streamlined to factory functions without subscription wrappers.

### v0.3.x — v0.4.x

- **`VowelProvider` must use `useState` + subscription.** Module-level variable set from child `useEffect` no longer re-renders the parent. Use `subscribeToVowelChanges()` and `useState`.
- **TanStack Router:** Create router in dedicated `router.ts` to avoid circular init failures. `createTanStackAdapters()` replaces legacy helper.
- **Next.js:** Use `NEXT_PUBLIC_VOWEL_APP_ID` (not `VOWEL_APP_ID` alone) in `.env`.
- **Context-ready init:** Defer `setAppId` to `useEffect`, push `buildVowelContext()` after creating client, show loading gate.

### v0.2.0

- **Router migration:** `tanstackRouterAdapter()` → `createTanStackAdapters()`. `router` prop → `navigationAdapter` + `automationAdapter`.
- **Automation disabled by default.** Opt-in via `enableAutomation: true`.

### v0.1.x

- Initial React integration patterns. `VowelProvider`, `useVowel` hook, `VowelAgent` component.
