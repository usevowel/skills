# Platform Selector

Use this file only to decide which platform guide to open.

All supported platform guides should preserve the same branded VowelDocs product pattern:

- same VowelDocs branding
- same credential modal/storage behavior, especially the recognizable input-box/modal style
- same high-quality docs tools
- same canonical-route discipline
- same runtime defaults unless a framework guide explicitly calls out an unavoidable difference

Do not assume Astro-specific fixes belong everywhere. Framework guides should only adopt the workarounds required by that framework.

If the framework is already known to be Astro/Starlight, skip this file and open [astro/astro.md](./astro/astro.md) directly.

## Preferred Path

For Astro documentation sites, especially Starlight, load [astro/astro.md](./astro/astro.md) immediately.

That file contains:

- Astro SPA navigation adapter guidance
- persistent host pattern
- canonical route-map generation
- audio survival strategy
- linked Vowel client rebuild workflow

It is intentionally self-contained so the separate `vowel-react` skill is not required for Astro docs work, and it ships exact reference files under [astro/files](./astro/files).

## Other Platform Guides

- [vitepress.md](./vitepress.md)
  Use only for VitePress/Vue documentation sites. Preserve the branded VowelDocs modal/input style and shared product feel, but do not port Astro-specific persistence/navigation hacks into VitePress unless VitePress actually needs them.

## Unsupported Or Constrained Platforms

If the docs framework is mostly static HTML with weak client-side runtime support, read [../exclusions.md](../exclusions.md).

## Quick Decision Rule

- Astro/Starlight -> [astro/astro.md](./astro/astro.md)
- VitePress -> [vitepress.md](./vitepress.md)
- static HTML generator or unclear fit -> [../exclusions.md](../exclusions.md)
