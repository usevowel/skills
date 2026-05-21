# Initialization and Context-Ready Patterns

Ensure the Vowel client has meaningful app state from the first turn.

## Core Concepts

**Create the client → Push initial context → Done.**

There's no need for module-level state management wrappers (`setAppId`, `getVowel`, `subscribeToVowelChanges`) or loading gates. Just create the client when you have the data you need and pass it to `VowelProvider`.

## Basic Pattern

```typescript
// vowel.client.ts
import { Vowel, createTanStackAdapters } from '@vowel.to/client';
import { router } from './router';

function buildInitialContext() {
  const loc = router.state.location;
  return {
    route: {
      pathname: loc.pathname,
      pathnameLabel: loc.pathname || 'Home',
      search: String(loc.search),
    },
  };
}

export function createVowelClient(apiKey: string) {
  const { navigationAdapter } = createTanStackAdapters({
    router: router as any,
    enableAutomation: false,
  });

  const vowel = new Vowel({
    apiKey,
    navigationAdapter,
    _voiceConfig: {
      provider: 'vowel-core',
      turnDetection: { mode: 'server_vad' },
      // ... rest of config
    },
  });

  // Push initial context so the AI has state from turn 1
  vowel.updateContext(buildInitialContext());

  registerCustomActions(vowel);
  return vowel;
}
```

```typescript
// App.tsx
import { VowelProvider, VowelAgent } from '@vowel.to/client/react';
import { createVowelClient } from './vowel.client';

const vowel = createVowelClient(import.meta.env.VITE_VOWEL_API_KEY);

function App() {
  return (
    <VowelProvider client={vowel}>
      <RouterProvider router={router} />
      <VowelAgent position="bottom-right" />
    </VowelProvider>
  );
}
```

## Context Is Always Available

Context is **baked into the token request** before the session starts — no race condition, no fallback action needed.

- Use `vowel.updateContext({ ... })` to push state at any time
- Use `useSyncContext({ ... })` in React components for automatic re-syncs
- The AI sees context in the `<context>` section of every turn

## Router Init Order

For TanStack Router, create the router in a dedicated `router.ts` module. Import that shared instance in both `vowel.client.ts` and `App.tsx`. Never import `vowel.client.ts` from `router.ts` — this prevents `Cannot access 'router' before initialization` errors.
