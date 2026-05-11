---
name: vowel-react
description: Initialize vowel.to voice agent in React applications (React 19+, Next.js, TanStack Router, React Router) with complete setup including adapters, providers, hooks, and custom actions. Use when setting up voice agent integration, configuring navigation adapters, implementing custom voice actions, or integrating state management with voice AI. First read vowel-client/SKILL.md for core @vowel.to/client knowledge.
---

# Vowel React Integration

**Before using this skill, read `vowel-client/SKILL.md` for core @vowel.to/client concepts** (installation, voiceConfig, connection paradigms, context management, custom actions basics, environment variables).

This skill adds React-specific patterns: hooks, providers, router adapters, state management, and context-ready initialization.

## Overview

React-specific guidance for voice agent integration:

- Installation and client setup for all major React routers
- Navigation adapter configuration (TanStack Router, Next.js, React Router, custom)
- **Context-ready initialization** — ensure stores are loaded before client init, push initial context
- State management integration with automatic context syncing
- Custom action design with app store patterns
- Voice UI components and configuration

## 0.2.0 Migration Patterns

### Prefer helper factories over legacy router adapters

Use the factory APIs instead of legacy `router` adapter helpers:
- `createTanStackAdapters(...)` for TanStack Router
- `createReactRouterAdapters(...)` for React Router
- `createNextJSAdapters(...)` for Next.js
- Keep the returned `navigationAdapter`; leave `automationAdapter` disabled unless explicitly needed

Do not use: `tanstackRouterAdapter(...)`, `tanstackRouterHookAdapter(...)`, `router:` prop.

### Keep automation opt-in

Default: `navigationAdapter` only. Add `automationAdapter` only when the user explicitly wants DOM automation.

### Connection guidance

1. **Hosted / platform token issuer** — pass `apiKey` (preferred) or legacy `appId`. Optionally set `convexUrl` or `tokenEndpoint`.
2. **Token-based flow** — `tokenProvider` or pre-issued `voiceConfig.token`.

`apiKey` and `appId` are aliases for the token issuer identifier. Prefer `apiKey` in new code.

## ⚠️ CRITICAL: Router Initialization Order (Circular Import Prevention)

For TanStack Router, keep router creation in a dedicated `router.ts` module and import that shared instance in both `main/App` and `vowel.client.ts`.

**Prevents:** `vowel.client.ts:44 Uncaught ReferenceError: Cannot access 'router' before initialization`

**Required pattern:**
- `router.ts`: defines and exports `router`
- `vowel.client.ts`: imports `{ router }` from `router.ts`
- `main.tsx` / `App.tsx`: imports `{ router }` from `router.ts`
- Never define `createRouter(...)` in `main.tsx`/`App.tsx` if `vowel.client.ts` depends on that router
- Never import `vowel.client.ts` from `router.ts`

## ⚠️ CRITICAL: Next.js — Public env vars and API keys

**`NEXT_PUBLIC_VOWEL_APP_ID` is required.** Next.js only inlines `NEXT_PUBLIC_*` variables into the client bundle. `VOWEL_APP_ID` alone is empty in browser code, so `appId` is missing and the voice wrapper never mounts.

**API keys (`vkey_*`):** Publishable keys (`vkey_public_*`) are designed for the browser in the standard hosted flow. Private/server keys must never ship to the client.

## ⚠️ CRITICAL: Next.js — Use npm client, not `window.Vowel`

Use `import { Vowel } from '@vowel.to/client'`. If using `window.Vowel`, the standalone script must be loaded and `public/vowel/` must exist.

## ⚠️ CRITICAL: VowelProvider State Management

Do **not** store the Vowel instance in a module-level variable set from a child `useEffect`. This does **not** re-render the parent that renders `VowelProvider`, so `client` stays `null` forever.

Use `useState` for the client and `subscribeToVowelChanges()` (or set state when init completes) in the **same** component subtree as `VowelProvider`.

Under React Strict Mode, prefer **idempotent init** or **state-driven readiness** instead of a sticky `initialized` flag that blocks the second mount.

## ⚠️ CRITICAL: Startup Deadlock Guard

If a root/layout gates rendering on `vowelReady`, the initializer for that dependency must run **before or outside** the gated subtree. Otherwise `vowelReady` can never flip.

Required checks:
- If rendering is gated on `vowelReady`, `setAppId` init must run outside that gated subtree
- For optional integrations, wrap init in `try/catch`, log failures, continue rendering without the integration

## ⚠️ CRITICAL: Write to App Store, Not DOM

Custom actions should modify application state/stores, NOT manipulate the DOM directly. React apps are state-driven — UI updates automatically when state changes. DOM manipulation breaks the React rendering cycle.

## Quick Start (TanStack Router)

### 1. Create Router File

```typescript
// router.ts
import { createRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
```

### 2. Create Vowel Client

```typescript
// vowel.client.ts
import { Vowel, createTanStackAdapters } from '@vowel.to/client';
import { router } from './router';

function buildVowelContext() {
  const loc = router.state.location;
  return { route: { pathname: loc.pathname, pathnameLabel: loc.pathname || 'Home', search: String(loc.search) } };
}

let currentAppId: string | null = null;
let vowelInstance: Vowel | null = null;

type VowelChangeListener = (client: Vowel | null) => void;
const vowelChangeListeners = new Set<VowelChangeListener>();

function createVowelClient(appId: string): Vowel {
  const { navigationAdapter, automationAdapter } = createTanStackAdapters({
    router: router as any,
    enableAutomation: false
  });

  const vowel = new Vowel({
    appId: appId,
    instructions: `You are a helpful assistant for this application.

## CRITICAL: Write to App Store, Not DOM
When performing actions, you MUST write to the application store/state management system, NOT manipulate the DOM directly. The UI will automatically update.

## CRITICAL: Context Is Your Source of Truth
Current application state is automatically injected into the <context> section. You always have access to the latest state.

## Available Actions:
[Document your custom actions here]

Help users navigate and interact with the application by modifying state through registered actions.`,
    
    navigationAdapter,
    floatingCursor: { enabled: false },
    
    borderGlow: {
      enabled: true,
      color: 'rgba(99, 102, 241, 0.5)',
      intensity: 30,
      pulse: true
    },

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
      initialGreetingPrompt: `Welcome the user to this application. Briefly personalize using available context (route/page and user state), then ask what they want to do next.`,
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
  if (!appId) return;
  currentAppId = appId;
  vowelInstance = createVowelClient(appId);
  vowelInstance.updateContext(buildVowelContext());
  console.log('✅ Vowel client initialized with App ID:', appId);
  vowelChangeListeners.forEach(listener => listener(vowelInstance));
}

export function getVowel(): Vowel | null {
  return vowelInstance;
}

export function subscribeToVowelChanges(listener: VowelChangeListener): () => void {
  vowelChangeListeners.add(listener);
  if (vowelInstance) {
    listener(vowelInstance);
  }
  return () => vowelChangeListeners.delete(listener);
}

function registerCustomActions(vowel: Vowel) {
  vowel.registerAction('searchProducts', {
    description: 'Search for products by query string',
    parameters: {
      query: { type: 'string', description: 'Search query to filter products' }
    }
  }, async ({ query }) => {
    productStore.setSearchQuery(query)
    return { success: true }
  })
}
```

### 3. Integrate in App

```typescript
// App.tsx
import { useEffect, useState } from 'react';
import { RouterProvider } from '@tanstack/react-router';
import { VowelProvider } from '@vowel.to/client/react';
import { router } from './router';
import { getVowel, setAppId, subscribeToVowelChanges, type VowelClientType } from './vowel.client';

function useVowelInit() {
  useEffect(() => {
    const appId = import.meta.env.VITE_VOWEL_APP_ID;
    if (appId) setAppId(appId);
  }, []);
}

function VowelInit() {
  useVowelInit();
  return null;
}

function AppLoading() {
  return <div className="min-h-screen flex items-center justify-center">Loading…</div>;
}

function AppContent() {
  const [vowel, setVowel] = useState<VowelClientType>(getVowel());
  const appId = import.meta.env.VITE_VOWEL_APP_ID;

  useEffect(() => {
    const unsubscribe = subscribeToVowelChanges((client) => setVowel(client));
    return () => unsubscribe();
  }, []);

  const vowelReady = vowel !== null || !appId;
  if (!vowelReady) return <AppLoading />;

  return (
    <VowelProvider client={vowel ?? null}>
      <RouterProvider router={router} />
    </VowelProvider>
  );
}

function App() {
  return (
    <>
      <VowelInit />
      <AppContent />
    </>
  );
}
```

### 4. Add Voice UI to Root Route

```typescript
// routes/__root.tsx
import { createRootRoute, Outlet } from '@tanstack/react-router';
import { VowelAgent } from '@vowel.to/client/react';
import { VowelStateSync } from './vowel.state';

function RootComponent() {
  return (
    <div className="min-h-screen">
      <VowelStateSync />
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

## Router Adapter Options

For detailed setup instructions for other routers, see **references/router-adapters.md**:
- **TanStack Router** — Automatic route discovery (recommended)
- **Next.js** — App Router and Pages Router support
- **React Router** — v6+ with hooks
- **Generic/Custom** — Works with any routing solution

## State Management Integration

Create a hook that automatically syncs state to the AI's context via `useSyncContext`:

```typescript
// hooks/useAppStateSync.ts
import { useMemo } from 'react'
import { useSnapshot } from 'valtio'
import { useSyncContext } from '@vowel.to/client/react'
import { cartStore, productStore } from '@/store'

export function useAppStateSync() {
  const cart = useSnapshot(cartStore)
  const products = useSnapshot(productStore)

  const context = useMemo(() => ({
    cart: {
      items: cart.items,
      itemCount: cart.items.length,
      total: cart.total
    },
    products: {
      searchQuery: products.searchQuery,
      categoryFilter: products.categoryFilter
    }
  }), [cart, products])

  useSyncContext(context)
}
```

For detailed state management patterns (Valtio, Zustand, Redux), see **references/state-management.md**.

## Context-Ready Initialization

**Initialize the Vowel client only after app context (stores, localStorage) is ready.** See **references/initialization-context-ready.md** for full patterns:

1. Call `setAppId` from `useEffect` after App mounts, not at module load
2. Push `buildVowelContext()` immediately after creating the client
3. Show loading gate until client exists before rendering `VowelProvider`
4. Sync listener immediately on subscribe if client already exists
5. Mount initializer outside loading gate to avoid deadlocks

**Note:** A fallback action for initial context is not needed. Context is injected into the token request before the session starts.

## Voice UI Components

```typescript
import { useVowel } from '@vowel.to/client/react';

function MyComponent() {
  const { state, toggleSession, notifyEvent, client } = useVowel();

  const handleOrderComplete = async () => {
    await notifyEvent('Your order has been placed successfully!', {
      orderId: '12345',
      total: 99.99
    });
  };

  return (
    <div>
      <button onClick={toggleSession}>
        {state.isConnected ? 'Stop' : 'Start'} Voice Assistant
      </button>
      
      {state.isConnected && (
        <div>
          {state.isUserSpeaking && <span>🎤 Listening...</span>}
          {state.isAISpeaking && <span>🗣️ Speaking...</span>}
        </div>
      )}
    </div>
  );
}
```

Alternative: use `VowelMicrophone` instead of `VowelAgent` for a compact mic button.

## Enabling Automation (If Required)

If the user explicitly requests DOM automation:
1. Set `enableAutomation: true` in the adapter factory
2. Add `automationAdapter` to `new Vowel({ ... })`
3. Set `floatingCursor: { enabled: true }`
4. Update `VowelAgent` with `enableFloatingCursor={true}`

## System Instructions Template

```typescript
instructions: `You are a helpful assistant for this application.

## CRITICAL: Write to App Store, Not DOM
**⚠️ MOST IMPORTANT RULE**: When performing actions, you MUST write to the application store/state management system, NOT manipulate the DOM directly.

## CRITICAL: Context Is Your Source of Truth
Current application state is automatically provided in the <context> section. You always have access to the latest state.

## Available Routes:
- Dashboard (/): Overview and statistics
- Products (/products): Product catalog

## Available Actions:
- searchProducts: Search for products. Parameters: query (search term).
- addToCart: Add product to cart. Parameters: productId, quantity (optional).

Help users interact with the application by modifying state through registered actions.`
```

## Troubleshooting (React-Specific)

1. **Client is null / Provider not mounting**
   - `VowelProvider` must receive client via **`useState`** + subscription, not module-level variable
   - Call `setAppId()` from `useEffect` after App mounts, not at module load
   - Check for startup deadlock: loading gate hides the init component
   - **Next.js:** Use **`NEXT_PUBLIC_VOWEL_APP_ID`** (not `VOWEL_APP_ID` alone)

2. **`Cannot access 'router' before initialization`**
   - Move router creation to dedicated `router.ts`
   - Import from `router.ts` in both `main/App` and `vowel.client.ts`
   - Remove circular imports

3. **AI has wrong/empty state on first turn**
   - Push `updateContext(buildVowelContext())` after creating client
   - Context is injected into the token request before session starts

4. **Next.js mic not working**
   - Confirm `NEXT_PUBLIC_VOWEL_APP_ID` is set (not only `VOWEL_APP_ID`)
   - Use `import { Vowel } from '@vowel.to/client'`, not `window.Vowel`

## Reference Files

- **references/router-adapters.md** — Complete router setup guide for all supported routers
- **references/state-management.md** — State management integration patterns (Valtio, Zustand, Redux)
- **references/initialization-context-ready.md** — Context-ready initialization, loading gate, buildVowelContext
- **references/custom-actions.md** — Custom action design and best practices
- **references/languages-and-vad.md** — Supported languages and VAD mode reference
- **references/connection-paradigms.md** — Connection model reference
- **references/platform-overview.md** — Platform architecture overview
