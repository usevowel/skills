# Router Adapter Reference

Complete reference for all supported routers and their adapter configurations.

## Table of Contents

- TanStack Router Setup
- Next.js Setup
- React Router Setup
- Generic/Custom Router Setup
- Adapter Comparison Table

## TanStack Router Setup (Recommended - Auto Route Discovery!)

**Important:** Create a separate `router.ts` file to avoid circular dependencies and prevent router-before-init runtime failures.

### Router File (`router.ts`)

```typescript
import { createRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
```

### Vowel Client (`vowel.client.ts`)

```typescript
import { Vowel, createTanStackAdapters } from '@vowel.to/client';
import { router } from './router';

export function createVowelClient(apiKey: string) {
  const { navigationAdapter } = createTanStackAdapters({
    router: router as any,
    enableAutomation: false
  });

  const vowel = new Vowel({
    apiKey,
    instructions: `[See instructions section]`,
    navigationAdapter,
    floatingCursor: { enabled: false },
    _caption: { enabled: true },
    voiceConfig: {
      provider: 'vowel-prime',
      vowelPrimeConfig: { environment: 'staging' },
      llmProvider: 'groq',
      model: "openai/gpt-oss-120b",
      voice: 'Timothy',
      language: 'en-US',
      initialGreetingPrompt: `Welcome the user to this application. Briefly personalize using route and context, then ask how you can help.`
    },
  });

  registerCustomActions(vowel);
  return vowel;
}

function registerCustomActions(vowel: Vowel) {
  // Register custom actions here
}
```

### App Integration (`src/App.tsx`)

```typescript
import { VowelProvider, VowelAgent } from '@vowel.to/client/react';
import { RouterProvider } from '@tanstack/react-router';
import { router } from './router';
import { createVowelClient } from './vowel.client';

const vowel = createVowelClient(import.meta.env.VITE_VOWEL_API_KEY);

function App() {
  return (
    <VowelProvider client={vowel}>
      <RouterProvider router={router} />
      <VowelAgent position="bottom-right" enableFloatingCursor={false} />
    </VowelProvider>
  );
}

export default App;
```

### Root Route (`src/routes/__root.tsx`)

**Important:** Do NOT import vowel or VowelProvider in `__root.tsx` to avoid circular dependencies.

```typescript
import { createRootRoute, Outlet } from '@tanstack/react-router';
import { VowelAgent } from '@vowel.to/client/react';

function RootComponent() {
  return (
    <div className="min-h-screen">
      <nav>{/* Your navigation */}</nav>
      <main>
        <Outlet />
      </main>
      <VowelAgent position="bottom-right" enableFloatingCursor={false} />
    </div>
  );
}

export const Route = createRootRoute({
  component: RootComponent,
});
```

## Next.js Setup

### Pitfalls (common after vowelbot or hand-rolled integrations)

1. **Env:** Use **`NEXT_PUBLIC_VOWEL_APP_ID`** for any client-side `appId`. **`VOWEL_APP_ID` alone** is not inlined into the browser bundle.

2. **API keys:** Standard **platform `appId` flow** does not use a long-lived **`vkey_*`** in the frontend (server-only).

3. **`window.Vowel`:** The skill expects **`import { Vowel, createNextJSAdapters } from '@vowel.to/client'`** and **`new Vowel(...)`**. Using `window.Vowel` requires the standalone widget script.

4. **`VowelProvider client`:** Pass the Vowel instance directly — a simple module-level `createVowelClient()` call works as long as environment variables are available at module load time.

### Vowel Client (`vowel.client.ts`)

```typescript
import { Vowel, createNextJSAdapters } from '@vowel.to/client';

export function createVowelClient() {
  const { navigationAdapter } = createNextJSAdapters(/* router, { routes: [...], enableAutomation: false } */);

  const vowel = new Vowel({
    appId: process.env.NEXT_PUBLIC_VOWEL_APP_ID || 'your-app-id',
    navigationAdapter,
    _caption: { enabled: true },
    voiceConfig: {
      voice: 'Puck',
      initialGreetingPrompt: `Welcome the user to this application and briefly mention what they can do on this page.`
    }
  });

  registerCustomActions(vowel);
  return vowel;
}

function registerCustomActions(vowel: Vowel) {
  // Register custom actions here
}
```

### Layout Integration (`app/layout.tsx`)

```typescript
'use client';

import { VowelProvider, VowelAgent } from '@vowel.to/client/react';
import { createVowelClient } from '@/vowel.client';

const vowelClient = createVowelClient();

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <VowelProvider client={vowelClient}>
          {children}
          <VowelAgent />
        </VowelProvider>
      </body>
    </html>
  );
}
```

## React Router Setup

### Vowel Client (`vowel.client.ts`)

```typescript
import { Vowel, createReactRouterAdapters } from '@vowel.to/client';

export function createVowelClient() {
  // Create adapters with navigate/getCurrentPath callbacks
  // See createDirectAdapters for the generic pattern
  const { navigationAdapter } = createReactRouterAdapters({
    navigate: (path) => { /* router navigate */ },
    location: window.location,
    routes: [
      { path: '/', description: 'Home page' },
      { path: '/products', description: 'Product catalog' },
    ],
    enableAutomation: false
  });

  const vowel = new Vowel({
    apiKey: process.env.VITE_VOWEL_API_KEY || 'your-api-key',
    navigationAdapter,
    _caption: { enabled: true },
    voiceConfig: {
      voice: 'Puck',
      initialGreetingPrompt: `Welcome the user to this application and briefly mention what they can do on this page.`
    }
  });

  registerCustomActions(vowel);
  return vowel;
}

function registerCustomActions(vowel: Vowel) {
  // Register custom actions here
}
```

### App Integration (`src/App.tsx`)

```typescript
import { VowelProvider, VowelAgent } from '@vowel.to/client/react';
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import { createVowelClient } from './vowel.client';

const vowel = createVowelClient();

function Layout() {
  return (
    <VowelProvider client={vowel}>
      <div className="min-h-screen">
        <nav>{/* Your navigation */}</nav>
        <main><Outlet /></main>
        <VowelAgent position="bottom-right" />
      </div>
    </VowelProvider>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/products" element={<ProductsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
```

## Generic/Custom Router Setup

For any other routing solution:

```typescript
import { Vowel, createDirectAdapters } from '@vowel.to/client';

export function createVowelClient(apiKey: string) {
  const { navigationAdapter } = createDirectAdapters({
    navigate: (path) => { history.pushState({}, '', path); },
    getCurrentPath: () => window.location.pathname,
    routes: [
      { path: '/', description: 'Home page' },
      { path: '/products', description: 'Product catalog' },
    ],
    enableAutomation: false
  });

  const vowel = new Vowel({
    apiKey,
    navigationAdapter,
    _caption: { enabled: true },
    voiceConfig: {
      voice: 'Puck',
      initialGreetingPrompt: `Welcome the user to this application and briefly mention what they can do on this page.`
    }
  });

  registerCustomActions(vowel);
  return vowel;
}

function registerCustomActions(vowel: Vowel) {
  // Register custom actions here
}
```

## Adapter Comparison Table

| Router | Adapter Class | Helper Function | Route Discovery | Best For |
|--------|---------------|-----------------|-----------------|----------|
| **TanStack Router** | `TanStackNavigationAdapter` | `createTanStackAdapters()` | ✅ **Automatic** | Type-safe routing with auto-discovery |
| **Next.js** | `DirectNavigationAdapter` | `createNextJSAdapters()` | ❌ Manual | Next.js App Router or Pages Router |
| **React Router** | `ReactRouterNavigationAdapter` | `createReactRouterAdapters()` | ❌ Manual | React Router v6+ |
| **Custom Router** | `DirectNavigationAdapter` | `createDirectAdapters()` | ❌ Manual | Any custom routing solution |

## Troubleshooting

### TanStack Router Issues

```typescript
// ❌ Wrong - can't use hooks in module scope
function createVowelClient() {
  const router = useRouter(); // Can't use hooks here!
  return new Vowel({...});
}

// ✅ Correct - import router instance from router.ts
import { router } from './router';
const { navigationAdapter } = createTanStackAdapters({ router: router as any });
```

### `Cannot access 'router' before initialization` (TanStack Runtime Error)

If you see an error like:

```text
vowel.client.ts:44 Uncaught ReferenceError: Cannot access 'router' before initialization
```

You have an import cycle / initialization-order issue.

```typescript
// ❌ Wrong - router is created in App/main and imported by vowel.client
// main.tsx
export const router = createRouter({ routeTree });
import { setAppId } from './vowel.client'; // vowel.client imports router from main -> cycle

// ✅ Correct - router is created in dedicated module
// router.ts
export const router = createRouter({ routeTree });

// main.tsx
import { router } from './router';

// vowel.client.ts
import { router } from './router';
```

Checklist:
- Keep `createRouter(...)` in `router.ts` only
- `router.ts` must not import `vowel.client.ts`
- `vowel.client.ts` imports router from `router.ts`, not from `main.tsx`/`App.tsx`

### React Router Issues

```typescript
// ❌ Wrong - missing location updates
const adapter = new ReactRouterNavigationAdapter({
  navigate,
  location,
  routes: [...]
});

// ✅ Correct - use helper function
const { navigationAdapter } = createReactRouterAdapters({
  navigate,
  location,
  routes: [...]
});
```

### Next.js Issues

```typescript
// ❌ Wrong - wrong import
import { useRouter } from 'next/router'; // Pages Router (old)

// ✅ Correct - App Router import
import { useRouter } from 'next/navigation'; // App Router (new)
```

**Env and bundle:** Client code must read **`process.env.NEXT_PUBLIC_VOWEL_APP_ID`**. Using **`VOWEL_APP_ID`** only in `.env` leaves the browser **`appId` empty** and prevents the voice wrapper from mounting.

**Instantiation:** Prefer **`new Vowel`** from **`@vowel.to/client`**. **`window.Vowel`** requires the standalone widget script and **`public/vowel/`**; missing script → **"Vowel SDK not loaded"**.

**Provider state:** Pass the Vowel instance directly to `VowelProvider`. Create it at module level if env vars are available synchronously, or in a `useEffect` + state if loaded asynchronously.
