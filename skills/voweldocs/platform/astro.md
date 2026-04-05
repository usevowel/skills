# Astro Starlight + Vowel

This is the primary implementation guide for embedding Vowel into Astro documentation projects, especially Starlight.

It is intentionally self-contained. For Astro docs work, do not rely on the separate `vowel-react` skill.

## Goal

Build the same VowelDocs-branded docs voice agent pattern used in this repo, not a looser approximation.

That means the recreated integration should preserve:

- the same VowelDocs branding and header button experience
- the same docs-specific tools and action quality
- the same Astro/Starlight persistence and navigation workarounds
- the same credential modal structure, styling, and storage behavior
- the same voice/runtime defaults unless intentionally changed as a product decision

The implementation should:

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
6. One framework-visible `voweldocs` header button and local credential modal.

Do not:

- use the Vowel web component wrapper for Astro docs
- navigate with `window.location.href`
- feed Vowel source paths such as `/content/docs/...`
- rebuild the React/Vowel tree on every page navigation
- invent a new docs config UI when the repo already contains the canonical `voweldocs` button and modal

## Required Files And Responsibilities

These file names can vary, but the responsibilities should stay the same:

- `astro.config.mjs`
  Set `site`, configure React dedupe/aliasing if the Vowel client package is linked, and keep Astro transitions enabled.
- `src/components/starlight/PageFrame.astro`
  Own the persistent Vowel mount point in shared layout HTML.
- `src/components/starlight/Head.astro`
  Include `<ClientRouter />`, expose the JWT-mode bridge for the modal, add the Vowel UI isolation styles, and load the Vowel docs entrypoint.
- `src/components/voweldocs/voweldocs-entry.ts`
  Stay minimal and only bootstrap the global docs initializer.
- `src/components/voweldocs/voice-agent-react.tsx`
  Create/reuse the singleton Vowel client and singleton React root.
- `src/components/voweldocs/voice-widget-init.ts`
  Build config, route map, context, navigation adapter inputs, page-transition hooks, and the canonical header button plus credential modal.

## Required Config UI Pattern

Every docs integration must include the `voweldocs` header button and credential modal, even outside Astro.

The source of truth is:

- `src/components/voweldocs/voice-widget-init.ts`

Copy the behavior exactly unless the project has a compelling reason to diverge.

Do not reconstruct from `src/components/voweldocs/VoiceConfigDialog.astro`. That file is legacy/reference material, not the canonical runtime path used by this integration.

Required invariants:

- same local-storage key: `voweldoc-config`
- same button id: `voweldocs-config-btn`
- same modal id: `voweldocs-modal`
- same config style id: `voweldocs-config-styles`
- same modal style id: `voweldocs-modal-styles`
- same core class names, especially `voweldocs-header-btn`
- same two-mode credential flow: Hosted and Self-Hosted
- same Starlight-oriented button label and icon treatment: `voweldocs` text with the checkmark state
- same visibility-toggle behavior for sensitive fields
- same save/remove/clear actions
- same custom events: `voweldocs:config-saved` and `voweldocs:config-cleared`
- same button state behavior, including the configured checkmark state
- same "credentials stored locally in browser" persistence model

For Astro/Starlight specifically:

- inject the button into Starlight `.right-group` first
- add the style block once and persist it across transitions
- mark the modal and modal styles with Astro persistence attributes
- keep the same retry-based button injection behavior so header timing issues do not break the UI
- re-inject the button after `astro:page-load` and `astro:after-swap`

For non-Astro frameworks:

- preserve the exact markup, labels, button text, class names, and storage schema
- adapt only the mount target and framework lifecycle hooks
- keep the button in the docs header or equivalent top navigation area
- do not replace the modal with a framework-native settings panel unless explicitly requested

This matters because the config UI is part of the product pattern, not just a debugging aid. A recreated `voweldocs` integration is incomplete if the user cannot open the header button, enter credentials, and have them persist locally the same way they do in this repo.

The same rule applies to branding and defaults: the reconstructed agent should still feel like VowelDocs, not just "a Vowel widget attached to docs."

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

Match the repo’s page-shell behavior closely:

- keep the persisted root in shared layout HTML
- keep the inner widget host id `voweldocs-widget-host`
- keep the persistent root styled with `display: contents` so it does not disturb layout

## Head Pattern

In the shared head component:

- render `<ClientRouter />` from `astro:transitions`
- emit `<meta name="voweldocs-use-jwt" content={...} />` so the modal can decide whether self-hosted mode should show JWT-only or App ID + URL fields
- include the `.vowel-ui` isolation/reset CSS so Starlight global typography/reset styles do not distort the Vowel widget
- raise the Vowel UI/status layers with the same z-index approach used in this repo
- load the Vowel docs entrypoint script once

This enables Astro SPA navigation and ensures the voice bootstrap is present on every page.

The head/layout integration must also leave the header button modal path intact. The voice runtime and the config UI are both required parts of the finished docs integration.

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
- exact reconstruction should also keep `site` aligned with the environment where routes will be spoken back to the user.

## Route Map Strategy

Do not use the docs sidebar DOM as the source of truth.

Do not use search UI as the source of truth.

Instead, generate a canonical route map from docs content at build time or module-load time, then feed that map into Vowel `getRoutes()`.

Treat this generated route map as a required artifact. When the docs structure changes, regenerate it and revalidate the resulting canonical URLs before considering the integration updated.

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

If the project needs a named artifact for maintenance, generate a checked-in or build-generated route-map module/JSON file and document the regeneration step in the repo. The important part is that Vowel consumes canonical docs routes, not inferred source paths.

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

For an exact reconstruction of this repo, keep these UI/runtime choices:

- `VowelProvider client={client} floatingCursor={false} clientMode="strict"`
- `VowelAgent position="bottom-right" showTranscripts={false}`
- store the singleton runtime on `window.__voweldocsVoiceAgent`
- only recreate the Vowel client when the serialized credentials/config key changes
- otherwise call `client.updateContext(...)` in place

## Exact Voice Defaults

If the goal is to reproduce this repo rather than invent a new personality/config, keep these defaults aligned with `voice-widget-init.ts`:

- `language: "en-US"`
- greeting prompt equivalent to: `Welcome to the emdash docs. How can I help?`
- provider stack:
  - `provider: "vowel-prime"`
  - `vowelPrimeConfig.environment: "staging"`
  - `llmProvider: "groq"`
  - `model: "openai/gpt-oss-120b"`
  - `voice: "Timothy"`
  - `turnDetection.mode: "server_vad"`
- captions enabled at top-center with role, mobile, and streaming text visible
- border glow enabled with the same blue/indigo treatment and pulse
- floating cursor disabled

If you intentionally change these values, treat that as a product change, not a routine reconstruction.

## Audio Survival Pattern

If transcripts continue but audio becomes silent after navigation, treat it as a playback pipeline problem, not a session problem.

Required mitigations:

1. Mount Vowel’s hidden playback `<audio>` element into a persistent host, not raw `document.body`.
2. On navigation events, resume the output `AudioContext` and replay the hidden loopback audio element if it became paused.
3. Call this playback-resume hook on:
   - `astro:after-swap`
   - `astro:page-load`
   - before/while processing incoming audio chunks if needed

Also mirror the repo’s host wiring:

- set `window.__vowelAudioHost = document.getElementById('voweldocs-widget-host')`
- if a fallback host must be created, set the same persistence attributes on it and reassign `window.__vowelAudioHost`

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

To match this repo’s docs assistant behavior, also recreate the supporting custom actions:

- `navigateToHeading`
- `getCurrentPage`
- `listHeadings`
- `listSections`
- `summarizePage`
- `readSection`
- `browserHistory`

Keep the model prompt aligned with the current runtime:

- navigate first, then speak
- use built-in `listRoutes` if the exact path is unknown
- never rely on search UI for route discovery

These actions are part of the quality bar for the VowelDocs experience. Do not silently drop them unless the target project explicitly asks for a reduced toolset.

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

For an exact reconstruction, also re-check:

- the `Head.astro` JWT-mode meta tag still matches the intended env behavior
- the button/modal still use the canonical ids and classes
- the custom action schemas still avoid optional params
- the default voice config still matches the intended provider/model/voice settings

## Initialization Lifecycle

Mirror the repo’s initialization flow:

- run the docs bootstrap on `DOMContentLoaded` if the document is still loading, otherwise run immediately
- on `astro:page-load`, re-inject the header button, re-run voice initialization, and resume playback
- on `astro:after-swap`, re-inject the header button after a short delay and resume playback

For debugging parity with this repo, it is also reasonable to expose a small `window.voweldocs` helper with methods like `getConfig`, `reinitialize`, `cleanup`, and `openConfig`.

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

If the route-map logic changed, rerun the docs app build after regenerating that route source so the emitted bundle and sitemap stay aligned.

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
- the `voweldocs` button appears in the header and opens the canonical credential modal
- saved config persists in `localStorage` under `voweldoc-config`
- self-hosted mode shows the correct JWT or App ID + URL fields based on `PUBLIC_VOWEL_USE_JWT`
- the Vowel widget renders with the intended placement and without Starlight CSS corruption
- the reconstructed agent still matches this repo’s branded VowelDocs experience rather than a generic integration
