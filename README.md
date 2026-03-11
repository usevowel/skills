# vowel skills

Public skill repository for vowel integration workflows.

## Install with the Vercel Skills CLI

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

## Included skills

- `vowel-react`: Set up vowel voice agents in React applications.
- `vowel-vanilla`: Set up vowel voice agents in vanilla JavaScript applications.
- `vowel-webcomponent`: Set up vowel voice agents with the web component embed.

## Repository scope

This repository only publishes vowel-related skills. Non-vowel skills should stay out of this repo so `npx skills add usevowel/skills` installs a focused, brand-aligned skill set.
