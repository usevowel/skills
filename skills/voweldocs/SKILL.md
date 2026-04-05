---
name: voweldocs
description: Add the branded VowelDocs voice-agent paradigm to supported documentation frameworks, especially Astro Starlight projects. Use this when embedding or maintaining the shipped VowelDocs experience in docs, including canonical route maps, SPA navigation adapters, credential modal UI, session/audio persistence, and framework-specific lifecycle workarounds.
---

# voweldocs

Use this skill when the task is "add or maintain Vowel inside a documentation site."

For Astro/Starlight, this skill is self-contained. Do not require the separate `vowel-react` skill for Astro docs work. Load [platform/astro/astro.md](./platform/astro/astro.md) first.

The goal is not a generic voice widget. The goal is to recreate the same VowelDocs-branded docs agent pattern used in this repo:

- same VowelDocs branding and header entrypoint
- same docs-oriented tool quality and action set
- same Astro/Starlight lifecycle workarounds
- same credential modal styling and local-storage behavior
- same runtime defaults such as captions, model, voice, and border glow

Treat this skill as the packaged VowelDocs product spec for supported documentation frameworks. When it fires, the expected outcome is that the target docs site adopts the VowelDocs paradigm, not merely "some Vowel integration."

Framework note:

- Astro/Starlight should adopt the full set of Astro-specific persistence, navigation, audio, and lifecycle workarounds described in [platform/astro/astro.md](./platform/astro/astro.md).
- VitePress should keep its existing lighter-weight platform approach unless a real VitePress-specific issue requires more. Preserve the shared VowelDocs branding and credential-modal style, but do not import Astro-only quirks into VitePress by default.

## Load Order

1. If the docs framework is already known to be Astro or Starlight, read [platform/astro/astro.md](./platform/astro/astro.md) immediately.
2. If the framework is not yet known, read [platform/index.md](./platform/index.md) to choose the correct platform guide.
3. Only read [platform/vitepress.md](./platform/vitepress.md) if the docs site is VitePress.
4. Read [exclusions.md](./exclusions.md) only when evaluating unsupported/static-only frameworks.

## Core Rules

- Prefer a single long-lived Vowel client for the entire docs app.
- Prefer a real framework navigation adapter over custom page reloads.
- Never let Vowel routes use source paths like `/content/docs/...`.
- Generate a canonical route map from the docs source and canonical site origin.
- Regenerate the route map whenever docs files, slugs, sidebar structure, or site origin changes.
- After changing the linked Vowel client package, rebuild that package and then rebuild the docs app.
- Always include the canonical `voweldocs` header button and credential modal UI, with the same storage key, class names, interaction model, and local-storage behavior used in this repo.
- Prefer exact parity with this repo’s shipped VowelDocs experience over framework-specific reinterpretation.

## Astro Workflow

For Astro/Starlight:

- Use the React Vowel client, not the web component wrapper.
- Mount into a persistent host owned by the shared layout.
- Use Astro client navigation from `astro:transitions/client`.
- Set `site` in `astro.config.*` so Astro emits canonical URLs and sitemap output.
- Feed Vowel a generated docs route map with canonical URLs.
- Resume playback after Astro swaps/page loads if transcripts continue but audio goes silent.
- Recreate the `voweldocs` header button and config modal exactly from the canonical implementation in `src/components/voweldocs/voice-widget-init.ts`.

All implementation details, file responsibilities, the shipped source files, and maintenance steps live in [platform/astro/astro.md](./platform/astro/astro.md).

## Route Map Regeneration Rule

Every time you change any of the following, regenerate the docs route map logic and validate it:

- files under `src/content/docs`
- slug structure
- sidebar labels or organization if route discovery depends on sidebar config
- `site` origin in Astro config
- route-generation code

Then run the relevant build commands from [platform/astro/astro.md](./platform/astro/astro.md).

## Reusable Slash Command Prompt

When you want Codex to refresh or recreate the Astro docs voice integration, use this prompt:

```text
/voweldocs-sync Rebuild the Astro/Starlight Vowel docs integration. Regenerate the canonical docs route map, verify Astro site origin and sitemap output, rebuild the linked Vowel client if its source changed, rebuild the docs app, and validate that navigation uses Astro SPA routing without dropping the live session or audio playback.
```

## Deliverables

When using this skill successfully, the resulting docs integration should have:

- one persistent Vowel client
- one persistent UI/audio host
- Astro SPA navigation adapter
- canonical route map for Vowel navigation
- the `voweldocs` header button plus credential modal
- build steps documented and repeatable
- explicit maintenance instructions for route-map regeneration
