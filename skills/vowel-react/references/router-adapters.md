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

// App ID management
let currentAppId: string | null = null;
let vowelInstance: Vowel | null = null;

// Listeners for vowel instance changes
type VowelChangeListener = (client: Vowel | null) => void;
const vowelChangeListeners = new Set<VowelChangeListener>();

function createVowelClient(appId: string): Vowel {
  // ⚠️ CRITICAL: Create adapters inside the factory, not at module scope.
  // This prevents "Cannot access 'router' before initialization" runtime failures.
  const { navigationAdapter, automationAdapter } = createTanStackAdapters({
    router: router as any,
    enableAutomation: false  // ❌ Disabled by default - only enable if user explicitly requests it
  });

  const vowel = new Vowel({
    appId: appId,
    instructions: `[See instructions section]`,
    navigationAdapter,
    // ❌ Automation adapter disabled by default - uncomment only if user explicitly enables it
    // automationAdapter,
    floatingCursor: { enabled: false },
    borderGlow: {
      enabled: true,
      color: 'rgba(99, 102, 241, 0.5)',
      intensity: 30,
      pulse: true
    },
    // ✅ Enable captions by default
    // @ts-ignore - internal caption config may not be fully typed in all builds
    _caption: {
      enabled: true,
      position: 'top-center',
      maxWidth: '600px',
      showRole: true,
      showOnMobile: false
    },
    voiceConfig: {
      provider: 'vowel-prime',
      vowelPrimeConfig: { environment: 'staging' },
      llmProvider: 'groq',
      model: "openai/gpt-oss-120b",
      voice: 'Timothy',
      language: 'en-US',
      initialGreetingPrompt: `Welcome the user to this application. Briefly personalize using route and context, then ask how you can help.`
    },
    onUserSpeakingChange: (isSpeaking) => {
      console.log(isSpeaking ? '🗣️ User started speaking' : '🔇 User stopped speaking');
    },
    onAIThinkingChange: (isThinking) => {
      console.log(isThinking ? '🧠 AI started thinking' : '💭 AI stopped thinking');
    },
    onAISpeakingChange: (isSpeaking) => {
      console.log(isSpeaking ? '🔊 AI started speaking' : '🔇 AI stopped speaking');
    },
  });

  registerCustomActions(vowel);
  return vowel;
}

export function setAppId(appId: string) {
  currentAppId = appId;
  vowelInstance = createVowelClient(appId);
  console.log('✅ Vowel client initialized with App ID:', appId);
  vowelChangeListeners.forEach(listener => listener(vowelInstance));
}

export function getVowel(): Vowel | null {
  return vowelInstance;
}

export function subscribeToVowelChanges(listener: VowelChangeListener): () => void {
  vowelChangeListeners.add(listener);
  return () => { vowelChangeListeners.delete(listener); };
}

function registerCustomActions(vowel: Vowel) {
  // Register custom actions here
}

export type VowelClientType = Vowel | null;
```

### App Integration (`src/App.tsx`)

```typescript
import { useState, useEffect } from 'react';
import { RouterProvider } from '@tanstack/react-router';
import { VowelProvider } from '@vowel.to/client/react';
import { router } from './router';
import { getVowel, subscribeToVowelChanges, type VowelClientType } from './vowel.client';

function App() {
  const [vowel, setVowel] = useState<VowelClientType>(getVowel());

  useEffect(() => {
    const unsubscribe = subscribeToVowelChanges((newClient) => {
      setVowel(newClient);
    });
    return () => { unsubscribe(); };
  }, []);

  return (
    <VowelProvider client={vowel as any}>
      <RouterProvider router={router} />
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

### Vowel Client (`vowel.client.ts`)

```typescript
import { Vowel, createNextJSAdapters } from '@vowel.to/client';
import { useRouter } from 'next/navigation';

export function createVowelClient() {
  const router = useRouter();
  
  // ⚠️ CRITICAL: Automation adapter should be disabled by default
  const { navigationAdapter, automationAdapter } = createNextJSAdapters(router, {
    routes: [
      { path: '/', description: 'Home page' },
      { path: '/products', description: 'Product catalog' },
      { path: '/cart', description: 'Shopping cart' },
    ],
    enableAutomation: false  // ❌ Disabled by default
  });

  const vowel = new Vowel({
    appId: process.env.NEXT_PUBLIC_VOWEL_APP_ID || 'your-app-id',
    navigationAdapter,
    // ❌ Automation adapter disabled by default
    // automationAdapter,
    floatingCursor: { enabled: false },
    // @ts-ignore - internal caption config may not be fully typed in all builds
    _caption: { enabled: true },
    voiceConfig: {
      voice: 'Puck',
      vadType: 'simple',
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
import { useState, useEffect } from 'react';
import { createVowelClient } from '@/vowel.client';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [vowelClient, setVowelClient] = useState(null);

  useEffect(() => {
    const client = createVowelClient();
    setVowelClient(client);
  }, []);

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
import { useNavigate, useLocation } from 'react-router-dom';

export function createVowelClient() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // ⚠️ CRITICAL: Automation adapter should be disabled by default
  const { navigationAdapter, automationAdapter } = createReactRouterAdapters({
    navigate,
    location,
    routes: [
      { path: '/', description: 'Home page' },
      { path: '/products', description: 'Product catalog' },
      { path: '/cart', description: 'Shopping cart' },
    ],
    enableAutomation: false  // ❌ Disabled by default
  });

  const vowel = new Vowel({
    appId: process.env.REACT_APP_VOWEL_APP_ID || 'your-app-id',
    navigationAdapter,
    // ❌ Automation adapter disabled by default
    // automationAdapter,
    floatingCursor: { enabled: false },
    // @ts-ignore - internal caption config may not be fully typed in all builds
    _caption: { enabled: true },
    voiceConfig: {
      voice: 'Puck',
      vadType: 'simple',
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
import { useMemo } from 'react';
import { createVowelClient } from './vowel.client';

function Layout() {
  const vowelClient = useMemo(() => createVowelClient(), []);

  return (
    <VowelProvider client={vowelClient}>
      <div className="min-h-screen">
        <nav>{/* Your navigation */}</nav>
        <main>
          <Outlet />
        </main>
        <VowelAgent position="bottom-right" enableFloatingCursor={false} />
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

export function createVowelClient(router: any) {
  // ⚠️ CRITICAL: Automation adapter should be disabled by default
  const { navigationAdapter, automationAdapter } = createDirectAdapters({
    navigate: (path) => router.push(path),
    routes: [
      { path: '/', description: 'Home page' },
      { path: '/products', description: 'Product catalog' },
    ],
    enableAutomation: false  // ❌ Disabled by default
  });

  const vowel = new Vowel({
    appId: process.env.VITE_VOWEL_APP_ID || 'your-app-id',
    navigationAdapter,
    // ❌ Automation adapter disabled by default
    // automationAdapter,
    floatingCursor: { enabled: false },
    // @ts-ignore - internal caption config may not be fully typed in all builds
    _caption: { enabled: true },
    voiceConfig: {
      voice: 'Puck',
      vadType: 'simple',
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
