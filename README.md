# vowel skills

Public [agent skill](https://grokipedia.com/page/Claude_Skills) repository for [vowel](https://vowel.to) integration workflows.

These skills are used by [OpenCode](https://opencode.ai/) in [vowelbot](https://vowel.to/vowelbot) github action to automagically enable vowel intelligent conversational voice in new and existing web apps. 

## Install with the [Vercel Skills CLI](https://github.com/vercel-labs/skills)

```bash
npx skills add usevowel/skills
```

The CLI discovers skills from the [`skills/`](./skills) directory. Each skill lives at `skills/<name>/SKILL.md` and may include supporting files such as `references/`.

## Usage

Install the repository:

```bash
npx skills add usevowel/skills
```

Then invoke a skill by name in your agent. **Framework-specific skills (`vowel-react`, `vowel-vanilla`, `vowel-webcomponent`) load `vowel-client` internally for core concepts.**

- `vowel-client` — Core @vowel.to/client knowledge (loaded as dependency by all other skills)
- `vowel-react` — React, Next.js, TanStack Router, or React Router apps (requires `vowel-client`)
- `vowel-vanilla` — Plain JavaScript apps and traditional multi-page sites (requires `vowel-client`)
- `vowel-webcomponent` — `<vowel-voice-widget>` integrations (requires `vowel-client`)
- `voweldocs` — Documentation sites (VitePress/Vue, Astro/Starlight) (requires `vowel-client`)

## Included skills

| Skill | Layer | Purpose |
|-------|-------|---------|
| `vowel-client` | Core | Framework-agnostic client knowledge: config, adapters, VAD, actions, context |
| `vowel-react` | Framework | React/Next.js/Router: hooks, providers, state management, router adapters |
| `vowel-vanilla` | Framework | Vanilla JS: direct/controlled adapters, standalone bundle, multi-page patterns |
| `vowel-webcomponent` | Framework | Web component: `<vowel-voice-widget>` embed, events, attribute-based config |
| `voweldocs` | Product | Branded VowelDocs: route discovery, Astro lifecycle, RAG, credential modal |

## Repository scope

This repository only publishes vowel-related skills. Non-vowel skills should stay out of this repo so `npx skills add usevowel/skills` installs a focused, brand-aligned skill set.
