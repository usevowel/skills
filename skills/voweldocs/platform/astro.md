# Astro Starlight + Vowel

This is the primary implementation guide for embedding Vowel into Astro documentation projects, especially Starlight.

It is intentionally self-contained. For Astro docs work, do not rely on the separate `vowel-react` skill.

## Goal

Build a docs voice agent that:

- survives Astro transitions
- uses Astro SPA navigation instead of reloads
- keeps audio playback alive during navigation
- feeds Vowel canonical docs routes
- can be recreated in a new Astro/Starlight project without repo-specific context

## Required Architecture

Use these invariants:

1. One long-lived Vowel client for the entire app.
2. One React root mounted into a persistent layout-owned host.
3. One Astro navigation adapter using `astro:transitions/client`.
4. One generated canonical docs route map.
5. One persisted audio mount point for Vowel playback DOM.

Do not:

- use the Vowel web component wrapper for Astro docs
- navigate with `window.location.href`
- feed Vowel source paths such as `/content/docs/...`
- rebuild the React/Vowel tree on every page navigation

## Required Files And Responsibilities

These file names can vary, but the responsibilities should stay the same:

- `astro.config.mjs`
  Set `site`, configure React dedupe/aliasing if the Vowel client package is linked, and keep Astro transitions enabled.
- `src/components/starlight/PageFrame.astro`
  Own the persistent Vowel mount point in shared layout HTML.
- `src/components/starlight/Head.astro`
  Include `<ClientRouter />` and load the Vowel docs entrypoint.
- `src/components/voweldocs/voice-agent-react.tsx`
  Create/reuse the singleton Vowel client and singleton React root.
- `src/components/voweldocs/voice-widget-init.ts`
  Build config, route map, context, navigation adapter inputs, and page-transition hooks.

## Astro Layout Pattern

Create the persistent host in shared layout HTML, not only from imperative JS.

Example:

```astro
<div id="voweldocs-persist-root" transition:persist>
  <div id="voweldocs-widget-host"></div>
</div>
```

Why:

- Astro can only persist what exists in the swapped page trees.
- JS-created body nodes are more fragile during swaps.
- the Vowel UI root and audio host should live under the same persistent subtree.

## Head Pattern

In the shared head component:

- render `<ClientRouter />` from `astro:transitions`
- load the Vowel docs entrypoint script once

This enables Astro SPA navigation and ensures the voice bootstrap is present on every page.

## Canonical Site Origin

Always set `site` in Astro config.

Example:

```js
export default defineConfig({
  site: "http://localhost:4321",
});
```

Why:

- Astro emits canonical route output and sitemap artifacts only when `site` is set.
- the docs voice integration needs a canonical origin for route generation.

## Route Map Strategy

Do not use the docs sidebar DOM as the source of truth.

Do not use search UI as the source of truth.

Instead, generate a canonical route map from docs content at build time or module-load time, then feed that map into Vowel `getRoutes()`.

### Minimum Route Map Requirements

Each route entry should include:

- canonical URL
- canonical path
- title
- optional summary/description
- optional category/section metadata

### Required Normalization Rule

Never leak docs source file paths into route URLs.

Bad:

```text
http://localhost:4321/content/docs/guides/media-library/
```

Good:

```text
http://localhost:4321/guides/media-library/
```

### Recommended Generation Pattern

Use `import.meta.glob('../../content/docs/**/*.mdx', { eager: true, query: '?raw', import: 'default' })`
or an equivalent build-time collector.

Then:

1. Strip the docs source root exactly.
2. Strip `.mdx`.
3. Drop trailing `/index`.
4. Convert to canonical path like `/guides/media-library/`.
5. Convert to canonical URL with `new URL(path, window.location.origin).href` or the configured `site`.
6. Extract frontmatter title and optional description if available.

If the glob is relative to the module, strip the explicit relative prefix first. Do not rely only on a loose regex.

## Vowel Navigation Adapter

Create a custom adapter for Vowel’s built-in `navigate` tool.

The adapter must:

- accept absolute same-origin URLs or paths
- normalize them with `new URL(path, window.location.origin)`
- pass only `pathname + search + hash` to Astro navigation
- expose `getCurrentPath()`
- expose `getRoutes()` from the canonical route map
- optionally expose current page context

Use:

```ts
import { navigate as astroNavigate } from "astro:transitions/client";
```

Then navigate like:

```ts
const url = new URL(path, window.location.origin);
await astroNavigate(`${url.pathname}${url.search}${url.hash}`);
```

Do not use:

- `window.location.href`
- synthetic anchor clicks
- custom search actions for route discovery

## React Runtime Pattern

The Vowel React runtime should behave like a portal mount:

- create the Vowel client once
- create the React root once
- mount once into the persistent host
- update context/routes/config in place
- only re-render the React tree when the actual Vowel client instance changes

This avoids remount churn during Astro transitions.

## Audio Survival Pattern

If transcripts continue but audio becomes silent after navigation, treat it as a playback pipeline problem, not a session problem.

Required mitigations:

1. Mount Vowel’s hidden playback `<audio>` element into a persistent host, not raw `document.body`.
2. On navigation events, resume the output `AudioContext` and replay the hidden loopback audio element if it became paused.
3. Call this playback-resume hook on:
   - `astro:after-swap`
   - `astro:page-load`
   - before/while processing incoming audio chunks if needed

The symptom "transcripts continue but audio stops" usually means:

- session is alive
- AI output is still streaming
- output playback got suspended, paused, or orphaned

## React And Linked Package Safety

If `@vowel.to/client` is symlinked from another workspace, force the app to use one React/ReactDOM instance.

In Vite/Astro config:

- alias `react`
- alias `react/jsx-runtime`
- alias `react/jsx-dev-runtime`
- alias `react-dom`
- alias `react-dom/client`
- set `dedupe: ["react", "react-dom"]`
- set `preserveSymlinks: false`

This prevents invalid-hook-call failures.

## Action Design Rules

For docs integrations:

- prefer Vowel’s built-in `navigate` and `listRoutes`
- avoid a separate custom "navigateToGuide" action unless absolutely necessary
- avoid search-driven navigation
- avoid optional action parameters for LLM compatibility when the target model struggles with them
- use sentinel values like `"none"` instead of omitted params

## Regeneration Rule

Regenerate and validate the route-map path every time any of these change:

- files under `src/content/docs`
- doc slugs
- sidebar config if titles/categories come from it
- Astro `site`
- route-map code

After those changes:

1. rebuild the route-map-producing app code
2. verify generated routes are canonical
3. rebuild the docs app

## Rebuild Rule

If you change the linked Vowel client source:

1. rebuild the Vowel client package
2. rebuild the Astro docs app

Do not assume the docs app will pick up unbuilt source changes from a linked package dist automatically.

## Commands

Use these commands as the default maintenance workflow:

```bash
# Rebuild the linked Vowel client after client source changes
cd /srv/store/Shared/Development/vowel.to/workspace/client
bun run build

# Rebuild the Astro docs app after integration or route-map changes
cd /srv/store/Shared/Development/vowel.to/voweldocs-demos/emdash-cms
bun run build
```

## Suggested Slash Command Prompt

Use this prompt when asking Codex to recreate or refresh the integration in an Astro docs project:

```text
/voweldocs-sync Recreate the Astro/Starlight Vowel docs integration from scratch. Use a persistent layout-owned host, a singleton React Vowel client, Astro transitions navigation, a generated canonical docs route map, and persisted audio playback recovery. Regenerate the route map, rebuild the linked Vowel client if its source changed, rebuild the docs app, and verify that navigation does not reload the page or silence playback.
```

## Validation Checklist

Before calling the work done, verify:

- routes are canonical and never include `/content/docs/`
- Astro build emits sitemap output once `site` is set
- the model receives exact docs URLs from `listRoutes`
- Vowel built-in `navigate` uses the Astro adapter
- navigation does not refresh the page
- the same voice session survives navigation
- transcripts continue after navigation
- audio continues after navigation
