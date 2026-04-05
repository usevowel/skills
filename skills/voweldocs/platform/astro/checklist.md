# Astro Checklist

Run this second pass every time you apply the Astro/Starlight VowelDocs package.

## File Graph

- `src/components/voweldocs/voweldocs-entry.ts` exists
- `src/components/voweldocs/voice-widget-init.ts` exists
- `src/components/voweldocs/voice-agent-react.tsx` exists
- `src/components/starlight/Head.astro` exists
- `src/components/starlight/PageFrame.astro` exists

## File Roles

- `voweldocs-entry.ts` is still a tiny bootstrap file
- `voice-widget-init.ts` still owns the modal, route map, actions, and Astro hooks
- `voice-agent-react.tsx` still owns the React/Vowel singleton runtime

## Build Checks

- the docs app builds successfully
- there are no unresolved imports from the VowelDocs files
- there are no invented Vowel APIs in imports

## Runtime Checks

- the `voweldocs` header button appears
- clicking it opens the branded credential modal
- saving config persists to `localStorage` under `voweldoc-config`
- the button reflects configured state after save

## Astro Checks

- `ClientRouter` is present
- the persisted host exists in the page frame
- `astro:page-load` is wired
- `astro:after-swap` is wired

## Route Checks

- the route map is non-empty
- generated routes never include `/content/docs/`
- built-in Vowel `navigate` uses the canonical route map

## Voice Checks

- captions are enabled in the canonical position/style
- the expected model/voice/provider defaults are still present
- audio-host wiring still points at `window.__vowelAudioHost`

## Event Checks

- config save/clear events are dispatched and observed consistently
- the implementation uses the same event target throughout the integration

If any item above is missing or fails, the Astro VowelDocs package was not reconstructed faithfully yet.
