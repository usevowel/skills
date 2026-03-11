# Adapter Patterns (Vanilla)

Use the adapter pattern that matches the app's routing model.

## Direct Adapters (`createDirectAdapters`)

Use for SPAs where navigation is client-side:

- React/Vue/Svelte-style routing without full reload
- Custom `history.pushState` based routing

Behavior:

- Navigation action calls your `navigate(path)` callback.
- Optional `getCurrentPath()` can improve route context accuracy.
- `DirectAutomationAdapter` can be enabled for page interaction.

## Controlled Adapters (`createControlledAdapters`)

Use for full-page reload apps:

- WordPress, Laravel, PHP templates, traditional multipage sites

Behavior:

- Uses `BroadcastChannel` (`channelName`) for cross-tab/control communication.
- Designed for preserving voice-control flow across navigation that reloads documents.
- `ControlledAutomationAdapter` can be enabled for controlled-tab interactions.

## Route Quality Checklist

- Keep routes explicit and user-meaningful.
- Include descriptions for each path.
- Avoid stale/dead paths in route definitions.
- Regenerate/update route lists when app navigation changes.
