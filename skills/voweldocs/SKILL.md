---
name: voweldocs
description: Add vowel.to voice navigation to documentation sites, especially Astro Starlight projects. Use this when embedding a Vowel voice agent into docs, generating a canonical route map, wiring Astro SPA navigation, preserving session/audio across transitions, or maintaining the docs voice integration over time.
---

# voweldocs

Use this skill when the task is "add or maintain Vowel inside a documentation site."

For Astro/Starlight, this skill is self-contained. Do not require the separate `vowel-react` skill for Astro docs work. Load [platform/astro.md](./platform/astro.md) first.

## Load Order

1. If the docs framework is already known to be Astro or Starlight, read [platform/astro.md](./platform/astro.md) immediately.
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

## Astro Workflow

For Astro/Starlight:

- Use the React Vowel client, not the web component wrapper.
- Mount into a persistent host owned by the shared layout.
- Use Astro client navigation from `astro:transitions/client`.
- Set `site` in `astro.config.*` so Astro emits canonical URLs and sitemap output.
- Feed Vowel a generated docs route map with canonical URLs.
- Resume playback after Astro swaps/page loads if transcripts continue but audio goes silent.

All implementation details, file responsibilities, and maintenance steps live in [platform/astro.md](./platform/astro.md).

## Route Map Regeneration Rule

Every time you change any of the following, regenerate the docs route map logic and validate it:

- files under `src/content/docs`
- slug structure
- sidebar labels or organization if route discovery depends on sidebar config
- `site` origin in Astro config
- route-generation code

Then run the relevant build commands from [platform/astro.md](./platform/astro.md).

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
- build steps documented and repeatable
- explicit maintenance instructions for route-map regeneration
