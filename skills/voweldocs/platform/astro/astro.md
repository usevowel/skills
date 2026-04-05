# Astro Starlight + VowelDocs

Use this folder as the exact Astro/Starlight VowelDocs package source.

Do not re-synthesize the integration from scratch if you can avoid it. Instead:

1. Read this file.
2. Copy the shipped reference files from [`files/`](./files).
3. Adapt only the project-specific values called out below.
4. Run the required second pass in [checklist.md](./checklist.md).

## Goal

Recreate the same VowelDocs-branded docs agent pattern shipped in this repo:

- same VowelDocs button and credential modal
- same Astro transition persistence workarounds
- same React/Vowel runtime architecture
- same route-map generation pattern
- same captions, model, voice, border glow, and tool quality

Treat the bundled files as canonical source, not inspiration.

## Copy Order

Copy these files in this order:

1. [`files/astro.config.mjs`](./files/astro.config.mjs)
2. [`files/src/components/starlight/Head.astro`](./files/src/components/starlight/Head.astro)
3. [`files/src/components/starlight/PageFrame.astro`](./files/src/components/starlight/PageFrame.astro)
4. [`files/src/components/voweldocs/voweldocs-entry.ts`](./files/src/components/voweldocs/voweldocs-entry.ts)
5. [`files/src/components/voweldocs/voice-agent-react.tsx`](./files/src/components/voweldocs/voice-agent-react.tsx)
6. [`files/src/components/voweldocs/voice-widget-init.ts`](./files/src/components/voweldocs/voice-widget-init.ts)

Keep the file split intact:

- `voweldocs-entry.ts` should stay tiny
- `voice-agent-react.tsx` should stay the React/Vowel runtime
- `voice-widget-init.ts` should keep the modal, route map, actions, and Astro hooks

## What You May Adapt

Adapt only the target-project specifics:

- Astro `site`
- repo-specific branding in the docs content prompt
- social links, logo paths, edit-link URLs, and sidebar data
- docs copy that references the host product name instead of `emdash`

Do not casually change:

- `voweldoc-config`
- `voweldocs-config-btn`
- `voweldocs-modal`
- the header button styling/classes
- the modal structure and save/clear behavior
- the route normalization pattern
- the Astro transition hooks
- the React/Vowel runtime architecture
- the voice defaults unless the user explicitly wants a product change

## Vowel Import Rules

Mirror the canonical import pattern exactly:

- import `Vowel` from `@vowel.to/client`
- import `VowelProvider` and `VowelAgent` from `@vowel.to/client/react`

Do not invent helper APIs such as `createVowelClient` or `defaultAdapter` unless they are explicitly confirmed in the installed package and intentionally part of the target implementation.

## Important Astro Notes

- Astro/Starlight needs the full persistence/navigation/audio workarounds from this package.
- Use the persisted host in the shared layout.
- Use `ClientRouter`.
- Use the `voweldocs-use-jwt` meta bridge.
- Keep the Vowel UI isolation CSS.
- Keep the hidden audio host wiring via `window.__vowelAudioHost`.

## Route Map Rule

The route map must be generated from docs content and normalized into canonical docs URLs.

Never let the agent navigate to source paths like:

```text
/content/docs/guides/media-library/
```

The correct result is:

```text
/guides/media-library/
```

## Required Second Pass

You are not done after copying files.

Run the full audit in [checklist.md](./checklist.md). If any item fails, continue working until the integration matches the packaged VowelDocs pattern.
