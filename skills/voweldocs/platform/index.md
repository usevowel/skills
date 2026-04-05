# Platform Selector

Use this file only to decide which platform guide to open.

If the framework is already known to be Astro/Starlight, skip this file and open [astro.md](./astro.md) directly.

## Preferred Path

For Astro documentation sites, especially Starlight, load [astro.md](./astro.md) immediately.

That file contains:

- Astro SPA navigation adapter guidance
- persistent host pattern
- canonical route-map generation
- audio survival strategy
- linked Vowel client rebuild workflow

It is intentionally self-contained so the separate `vowel-react` skill is not required for Astro docs work.

## Other Platform Guides

- [vitepress.md](./vitepress.md)
  Use only for VitePress/Vue documentation sites.

## Unsupported Or Constrained Platforms

If the docs framework is mostly static HTML with weak client-side runtime support, read [../exclusions.md](../exclusions.md).

## Quick Decision Rule

- Astro/Starlight -> [astro.md](./astro.md)
- VitePress -> [vitepress.md](./vitepress.md)
- static HTML generator or unclear fit -> [../exclusions.md](../exclusions.md)
