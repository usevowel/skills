# vowel skills

Public [agent skill](https://grokipedia.com/page/Claude_Skills) repository for [vowel](https:vowel.to) integration workflows.

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

Then invoke a skill by name in your agent:

- `vowel-react` for React, Next.js, TanStack Router, or React Router apps
- `vowel-vanilla` for plain JavaScript apps and traditional multi-page sites
- `vowel-webcomponent` for `<vowel-voice-widget>` integrations
- `voweldocs` for documentation sites (VitePress/Vue, Docusaurus, Nextra, Starlight, etc.)

## Included skills

- `vowel-react`: Set up vowel voice agents in React applications.
- `vowel-vanilla`: Set up vowel voice agents in vanilla JavaScript applications.
- `vowel-webcomponent`: Set up vowel voice agents with the web component embed.
- `voweldocs`: Add voice-powered AI navigation to documentation sites (VitePress/Vue example).

## Repository scope

This repository only publishes vowel-related skills. Non-vowel skills should stay out of this repo so `npx skills add usevowel/skills` installs a focused, brand-aligned skill set.
