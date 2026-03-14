---
name: vowel-react
description: Initialize vowel.to voice agent in React applications (React, Next.js, TanStack Router, React Router) with complete setup including adapters, providers, and custom actions. Use when setting up voice agent integration, configuring navigation adapters, implementing custom voice actions, or integrating state management with voice AI. Covers context-ready initialization (deferred setAppId, loading gate, buildVowelContext, getGameState fallback). The skill emphasizes writing to app stores rather than DOM manipulation, with automation harness disabled by default.
---

# Vowel React Integration

Initialize a vowel.to voice agent in a React application with proper navigation, state management, and custom actions.

## What is Vowel?

**vowel** (lowercase) is a SaaS platform that adds AI-powered voice agents to web applications. The `@vowel.to/client` package provides real-time voice interaction via Gemini Live API, OpenAI Realtime API, or vowel-prime. Key capabilities: **smart navigation** (voice-controlled routing), **custom actions** (business logic via voice), and optional **page automation** (DOM interaction). For React apps, prefer state-driven custom actions over DOM automation.

**Languages:** Of 99+ Whisper languages (client VAD), only those Inworld TTS can speak are supported (12: en, es, fr, de, it, pt, ko, zh, ja, nl, pl, ru). AssemblyAI (server VAD) supports 6. **VAD:** `client_vad` (default), `server_vad`, `semantic_vad`, `disabled`. **Connection paradigms:** appId, developer-managed tokens, fixed API keys, direct WebSocket, sidecar. See **references/platform-overview.md**, **references/languages-and-vad.md**, **references/connection-paradigms.md**.

## Overview

This skill provides complete guidance for integrating vowel.to voice agents into React applications. It covers:

- Installation and client setup for all major React routers
- Navigation adapter configuration (TanStack Router, Next.js, React Router, custom)
- **Context-ready initialization** - ensure stores are loaded before client init, push initial context
- State management integration with automatic context syncing
- Custom action design and registration
- Voice UI components and configuration

## Core Principles

### ⚠️ CRITICAL: Write to App Store, Not DOM

**MOST IMPORTANT:** Custom actions should modify application state/stores, NOT manipulate the DOM directly. This aligns with React's state-driven architecture.

**Why this matters:**
- React applications are state-driven - UI automatically updates when state changes
- DOM manipulation breaks the React rendering cycle and causes inconsistencies
- State changes ensure proper data flow and persistence
- Writing to the store keeps your app predictable and maintainable

### ⚠️ CRITICAL: Automation Harness Disabled by Default

The DOM automation adapter and floating cursor feature should be **disabled by default**. Only enable them if the user explicitly requests DOM automation capabilities.

**Why this matters:**
- Most React apps should use state-driven actions, not DOM manipulation
- Reduces visual distractions (no floating cursor)
- Simpler voice interface focused on navigation and state management
- DOM automation should be opt-in, not opt-out

**When to enable automation:**
- User explicitly requests voice-controlled page interaction
- Need to interact with third-party widgets not under your control
- Legacy systems where state management isn't available

### ⚠️ CRITICAL: Initial Greeting + Captions Enabled by Default

Always configure an app-specific `initialGreetingPrompt` and enable captions by default.

**Why this matters:**
- The first response should feel native to the app's domain and current page
- Captions improve accessibility and make voice interactions easier to follow
- A concrete greeting prompt reduces generic/awkward session starts

### ⚠️ CRITICAL: Router Initialization Order (Prevent Circular Import Runtime Failures)

For TanStack Router integrations, keep router creation in a dedicated `router.ts` module and import that shared instance in both `main/App` and `vowel.client.ts`.

**Prevent this runtime error:**  
`vowel.client.ts:44 Uncaught ReferenceError: Cannot access 'router' before initialization`

**Required pattern:**
- `router.ts`: defines and exports `router`
- `vowel.client.ts`: imports `{ router }` from `router.ts`
- `main.tsx` / `App.tsx`: imports `{ router }` from `router.ts`
- Never define `createRouter(...)` in `main.tsx`/`App.tsx` if `vowel.client.ts` depends on that router
- Never import `vowel.client.ts` from `router.ts`

### ⚠️ CRITICAL: Context-Ready Initialization

**Initialize the Vowel client only after app context (stores, localStorage) is ready.** Do not call `setAppId` at module load.

**Why this matters:**
- App stores (userName, language, etc.) often load from localStorage on mount
- The AI needs state for the initial greeting - context may not be populated when the session starts
- `voiceConfig.language` should match the user's stored preference
- Push initial context immediately after creating the client
- If a root/layout gates rendering on readiness, the initializer for that dependency must run before or outside the gated subtree or the app can deadlock on a permanent loading screen

**Key patterns:**
1. Call `setAppId` from `useEffect` after App mounts
2. Push `buildVowelContext()` after creating the client: `vowelInstance.updateContext(buildVowelContext())`
3. Show a loading gate until client exists before rendering `VowelProvider`
4. Register a `getGameState`/`getAppState` action; instruct the AI to call it **first** for the initial greeting (context may not be synced yet)
5. Sync listener immediately on subscribe if client already exists
6. If rendering is gated on `vowelReady` (or similar), mount the initializer outside that gate so it still runs while loading
7. For optional integrations, prefer fail-open behavior: log init failure and continue rendering the app instead of blocking the entire root/layout

For complete patterns, see **references/initialization-context-ready.md**.

### ⚠️ CRITICAL: Startup Deadlock Guard

During code generation and reviews, explicitly look for bootstrap deadlocks:

- A root/layout shows a loading state until an optional client, service, or integration is "ready"
- The code that initializes that dependency only runs inside components rendered after the readiness gate passes
- Hook API assumptions accidentally skip initialization entirely (for example, treating a hook as self-starting when it requires invocation, or reading a return value that never triggers setup)

Treat this as a **startup deadlock risk**. Required response:

- Flag it during review
- Move initialization before or outside the gated subtree
- Verify readiness-gated dependencies are initialized unconditionally on mount
- For optional integrations, fail open: log init failure and keep rendering the app
- Check hook usage carefully so setup is actually invoked and subscribed as intended

Suggested review rule text:

> If a React root/layout gates rendering on X being ready, ensure the initializer for X is not mounted behind that same gate. Optional integrations must initialize before the gate or fail open instead of blocking the entire app.

## Prerequisites

- React 18+ application
- TypeScript (recommended)
- A router (Next.js, TanStack Router, React Router, or custom)
- A vowel.to App ID (get one at https://vowel.to)

## Installation

```bash
# Install @vowel.to/client and required VAD dependency
bun add @vowel.to/client @ricky0123/vad-web

# Or if using npm/yarn:
npm install @vowel.to/client @ricky0123/vad-web
# yarn add @vowel.to/client @ricky0123/vad-web
```

## Quick Start (TanStack Router)

TanStack Router is recommended because it provides automatic route discovery.

### 1. Create Router File

Create `router.ts` to avoid circular dependencies and router-before-init errors:

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

### 2. Create Vowel Client

Create `vowel.client.ts`:

```typescript
import { Vowel, createTanStackAdapters } from '@vowel.to/client';
import { router } from './router';

/** Minimal context builder - expand with app stores when using state sync. See initialization-context-ready.md */
function buildVowelContext() {
  const loc = router.state.location;
  return { route: { pathname: loc.pathname, pathnameLabel: loc.pathname || 'Home', search: String(loc.search) } };
}

let currentAppId: string | null = null;
let vowelInstance: Vowel | null = null;

type VowelChangeListener = (client: Vowel | null) => void;
const vowelChangeListeners = new Set<VowelChangeListener>();

function createVowelClient(appId: string): Vowel {
  // ⚠️ CRITICAL: Create adapters inside the factory, not at module scope.
  // This prevents router-before-init runtime errors from circular initialization.
  const { navigationAdapter, automationAdapter } = createTanStackAdapters({
    router: router as any,
    enableAutomation: false  // ❌ Disabled by default
  });

  const vowel = new Vowel({
    appId: appId,
    instructions: `You are a helpful assistant for this application.

## CRITICAL: Write to App Store, Not DOM
**⚠️ MOST IMPORTANT RULE**: When performing actions, you MUST write to the application store/state management system, NOT manipulate the DOM directly. Always use registered actions that modify the app store. The UI will automatically update to reflect state changes.

## CRITICAL: Always Refer to Context for Information
Before answering ANY question or performing ANY action, ALWAYS check the <context> section for current information. The context contains the most up-to-date state of the application.

## CRITICAL: Initial Greeting (First Thing You Say)
When you first speak in a new session, you MUST call getGameState() FIRST. The context may not be populated yet - getGameState() reliably returns the current route, games state, userName, language, etc. Do NOT rely on context alone for the initial greeting.

## Current Application State:
The current state is automatically provided in the <context> section. You always have access to the latest state - no need to call any actions to read it.

## Available Actions:
[Document your custom actions here, including getGameState for initial greeting]

Help users navigate and interact with the application by modifying state through registered actions.`,
    
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
      initialGreetingPrompt: `Welcome the user to this application. Briefly personalize using available context (route/page and user state), then ask what they want to do next.`
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

/**
 * Create the Vowel client. Call only after app state is loaded from localStorage
 * (i.e. from useEffect after App mounts, not at module load).
 * Pushes initial context from app/games stores so the AI has state immediately.
 */
export function setAppId(appId: string) {
  if (!appId) return;
  currentAppId = appId;
  vowelInstance = createVowelClient(appId);
  /** Push initial context from stores (userName, language, games, etc.) */
  vowelInstance.updateContext(buildVowelContext());
  console.log('✅ Vowel client initialized with App ID:', appId);
  vowelChangeListeners.forEach(listener => listener(vowelInstance));
}

export function getVowel(): Vowel | null {
  return vowelInstance;
}

export function subscribeToVowelChanges(listener: VowelChangeListener): () => void {
  vowelChangeListeners.add(listener);
  /** Sync with current client immediately - handles race where client was created before we subscribed */
  if (vowelInstance) {
    listener(vowelInstance);
  }
  return () => vowelChangeListeners.delete(listener);
}

function registerCustomActions(vowel: Vowel) {
  // ⚠️ CRITICAL: All actions MUST be registered BEFORE startSession()!
  // ⚠️ CRITICAL: Actions should write to app store, NOT manipulate DOM!

  // getGameState: Call FIRST for initial greeting - context may not be synced yet
  vowel.registerAction('getGameState', {
    description: 'Get current route, ui, userName, language, games. CALL THIS FIRST when starting a new session (initial greeting) - context may not be populated yet.',
    parameters: {},
  }, async () => {
    const state = buildVowelContext();
    return { success: true, ...state };
  });
  
  // ✅ Good: Action writes to app store
  vowel.registerAction('searchProducts', {
    description: 'Search for products by query string',
    parameters: {
      query: { type: 'string', description: 'Search query to filter products' }
    }
  }, async ({ query }) => {
    // Write to store - UI updates automatically
    productStore.setSearchQuery(query)
    return { success: true }
  })
  
  // ❌ Don't create navigation actions - navigationAdapter handles this automatically!
}

export type VowelClientType = Vowel | null;
```

### 3. Integrate in App

Update `src/App.tsx`. Use deferred init (setAppId in useEffect) and a loading gate until the client is ready:

```typescript
import { useEffect, useState } from 'react';
import { RouterProvider } from '@tanstack/react-router';
import { VowelProvider } from '@vowel.to/client/react';
import { router } from './router';
import { getVowel, setAppId, subscribeToVowelChanges, type VowelClientType } from './vowel.client';

/** Initialize Vowel when app ID is available, after app state is loaded from localStorage. */
function useVowelInit() {
  useEffect(() => {
    const appId = import.meta.env.VITE_VOWEL_APP_ID;
    if (appId) setAppId(appId);
  }, []);
}

/** Runs Vowel init (setAppId). Must be mounted outside the loading gate so init runs on mount. Renders nothing. */
function VowelInit() {
  useVowelInit();
  return null;
}

/** Loading placeholder until Vowel client is ready. */
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
      <VowelInit />   {/* Runs outside gate - setAppId runs on mount */}
      <AppContent />  {/* Shows loading until client ready */}
    </>
  );
}

export default App;
```

Deadlock review check for this pattern:

- If `AppContent` returns loading until `vowelReady`, `VowelInit` must stay mounted outside that gate
- Do not move `useVowelInit()` into a component that only renders after `vowelReady`
- If Vowel is optional and init fails, catch/log the error and continue rendering with `client={null}` instead of blocking the entire app
- Verify any integration hooks used here actually perform setup the way you expect; incorrect invocation style can silently skip initialization

### 4. Add Voice UI and State Sync to Root Route

Update `src/routes/__root.tsx`. Mount `VowelStateSync` inside the route tree (inside both RouterProvider and VowelProvider) so it has access to `useRouterState` and `useSyncContext`:

```typescript
import { createRootRoute, Outlet } from '@tanstack/react-router';
import { VowelAgent } from '@vowel.to/client/react';
import { VowelStateSync } from './vowel.state';  // or useAppStateSync wrapper component

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

- **TanStack Router** - Automatic route discovery (recommended)
- **Next.js** - App Router and Pages Router support
- **React Router** - v6+ with hooks
- **Generic/Custom** - Works with any routing solution

All router setups follow the same pattern: **disable automation by default**.

## State Management Integration

### Recommended: Sync Context Pattern

Create a hook that automatically syncs state to the AI's context:

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

Use it in your app:

```typescript
import { useAppStateSync } from './hooks/useAppStateSync'

function AppStateSync() {
  useAppStateSync()
  return null
}

function App() {
  return (
    <VowelProvider client={vowel}>
      <AppStateSync />
      {/* Your app content */}
    </VowelProvider>
  )
}
```

For detailed state management patterns (Valtio, Zustand, Redux), see **references/state-management.md**.

## Custom Actions Design

### ⚠️ CRITICAL: Actions Write to Store, Not DOM

Custom actions should modify application state, not manipulate the DOM:

```typescript
// ✅ Good: Action writes to app store
vowel.registerAction('addToCart', {
  description: 'Add a product to the shopping cart',
  parameters: {
    productId: { type: 'string', description: 'Product ID' },
    quantity: { type: 'number', description: 'Quantity', optional: true }
  }
}, async ({ productId, quantity = 1 }) => {
  // Write to store - UI updates automatically
  cartStore.addItem({ productId, quantity })
  return { success: true, message: `Added ${quantity} item(s) to cart` }
})

// ❌ Bad: Action manipulates DOM directly
vowel.registerAction('addToCart', {
  description: 'Add a product to the shopping cart',
  parameters: {
    productId: { type: 'string', description: 'Product ID' }
  }
}, async ({ productId }) => {
  // ❌ Don't do this - breaks React's rendering cycle
  document.querySelector('.cart-count').textContent = '5'
  return { success: true }
})
```

### Best Practices

**✅ DO:**
- Write to app store/state management system
- Create specific actions for each resource (searchProducts, searchOrders, etc.)
- Use shallow parameters (strings, numbers, booleans)
- Keep action count manageable (10-15 maximum)
- Register all actions BEFORE startSession()

**❌ DON'T:**
- Don't manipulate DOM directly (use state instead)
- Don't create navigation actions (navigationAdapter handles this)
- Don't use deeply nested JSON parameters
- Don't register too many actions (struggles above 20)

For complete action design guidance, see **references/custom-actions.md**.

## Sub-Agent / Voice Control of App Chat or AI

If the app has its own programmatically controllable chat, AI interface, or LLM integration (e.g., OpenWebUI, in-app chat, headless API), the Vowel voice agent can act as a **controller** or **orchestrator**. The user speaks to Vowel; Vowel delegates to the app's chat/AI via custom actions; the response is returned and spoken back to the user.

**Pattern:**
- User: "Ask the AI to summarize this page" → Vowel calls an action that sends the prompt to the app's chat
- App's chat/AI processes and returns a response
- Vowel speaks the response back to the user

**Implementation:**
1. **Register custom actions** that bridge to whatever is programmatically controllable (chat send API, store method, postMessage to iframe, etc.). Choose action names that fit the app's domain (e.g., `sendToAppChat`, `askEmbeddedAI`, `queryChatModel`, `sendPromptToLLM`).
2. **Action handler** should: send the user's request (or a derived prompt) to the app's chat/AI, wait for the response, and return it so the voice agent can speak it.
3. **System instructions** should tell the voice agent when to delegate: e.g., "When the user says 'ask the AI', 'tell the chat', 'send a message to the model', or similar, use the [action name] to send the request and speak back the response."
4. **State-driven**: Prefer writing to app stores or calling app APIs; avoid DOM manipulation unless the target is only controllable that way.

Support any interface that can be controlled programmatically via vowel actions. The coding agent may choose appropriate action names and parameter shapes based on the app's structure.

## System Instructions Template

Use this template for your system instructions:

```typescript
instructions: `You are a helpful assistant for this application.

## CRITICAL: Write to App Store, Not DOM
**⚠️ MOST IMPORTANT RULE**: When performing actions, you MUST write to the application store/state management system, NOT manipulate the DOM directly. Always use registered actions that modify the app store. The UI will automatically update to reflect state changes.

## CRITICAL: Always Refer to Context for Information
Before answering ANY question or performing ANY action, ALWAYS check the <context> section for current information. The context contains the most up-to-date state of the application.

## Current Application State:
The current state (cart, products, etc.) is automatically provided in the <context> section. You always have access to the latest state - no need to call any actions to read it.

## Available Routes:
- Dashboard (/): Overview and statistics
- Products (/products): Product catalog
- Cart (/cart): Shopping cart
- Profile (/profile): User profile

## Available Actions:
### Products:
- searchProducts: Search for products. Parameters: query (search term).
- filterProductsByCategory: Filter products. Parameters: categoryId.

### Cart:
- addToCart: Add product to cart. Parameters: productId, quantity (optional).
- updateCartQuantity: Update quantity. Parameters: productId, quantity.

## How to Use:
- To navigate: Say "go to products" or "show me cart"
- To search: Say "search for [query]" - Action writes to store
- To modify cart: Say "add product X to cart" - Action writes to store
- **DO NOT use DOM manipulation** unless explicitly required by user

Help users interact with the application by modifying state through registered actions.`
```

## Enabling Automation (If Required)

If the user explicitly requests DOM automation capabilities, you can enable it:

### 1. Update Adapter Creation

```typescript
function createVowelClient(appId: string): Vowel {
  // Enable automation in adapter creation
  // Keep adapter creation inside the factory to avoid router init ordering issues.
  const { navigationAdapter, automationAdapter } = createTanStackAdapters({
    router: router as any,
    enableAutomation: true  // ✅ Enable if user explicitly requests
  });

  return new Vowel({
    appId: appId,
    navigationAdapter,
    automationAdapter,
    floatingCursor: { enabled: true }
    // ... rest of config
  });
}
```

### 2. Add Automation Adapter to Vowel Config

```typescript
const vowel = new Vowel({
  appId: appId,
  navigationAdapter,
  automationAdapter,  // ✅ Enable automation adapter
  floatingCursor: { enabled: true },  // ✅ Enable floating cursor
  // ... rest of config
});
```

### 3. Update VowelAgent Component

```typescript
<VowelAgent position="bottom-right" enableFloatingCursor={true} />
```

### 4. Update System Instructions

Add guidance about when to use DOM automation vs state management:

```typescript
instructions: `...

## DOM Automation (When Explicitly Requested):
If you cannot accomplish a task through state management actions, you may use DOM automation as a last resort. However, ALWAYS prefer writing to the app store when possible.

...`
```

## Environment Variables

Add to your `.env.local` (Next.js) or `.env` (Vite/CRA):

```bash
# Next.js (requires NEXT_PUBLIC_ prefix)
NEXT_PUBLIC_VOWEL_APP_ID=your-app-id-from-vowel-platform

# Vite (requires VITE_ prefix)
VITE_VOWEL_APP_ID=your-app-id-from-vowel-platform

# Create React App (requires REACT_APP_ prefix)
REACT_APP_VOWEL_APP_ID=your-app-id-from-vowel-platform
```

## Using Vowel in Components

```typescript
import { useVowel } from '@vowel.to/client/react';

function MyComponent() {
  const { state, toggleSession, notifyEvent, client } = useVowel();

  // Programmatically notify user of events
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

## Alternative Voice UI Components

Instead of `VowelAgent`, use the lower-level `VowelMicrophone` component:

```typescript
import { VowelMicrophone } from '@vowel.to/client/react';

<VowelMicrophone 
  size="small"
  showStatus={true}
  className="custom-class"
/>
```

## Troubleshooting

### Common Issues

1. **Client is null**
   - Make sure VowelProvider has initialized the client before rendering components
   - Call `setAppId()` from `useEffect` after App mounts (not at module load)
   - Use loading gate until `vowel !== null || !appId` before rendering VowelProvider
   - For TanStack Router: Use `getVowel()` and `subscribeToVowelChanges()` pattern
   - Check that `setAppId()` has been called
   - Check for a startup deadlock: if the loading gate hides the component that calls `setAppId()`, readiness can never flip
   - For optional integrations, log init failure and continue rendering instead of leaving the root/layout blocked forever
   - Verify hook setup code is actually invoked; a mistaken assumption about a hook's return value or invocation style can skip initialization entirely

2. **Routes not working**
   - **TanStack Router**: Import router instance from `router.ts`, not using `useRouter()` hook
   - **React Router**: Verify `navigate` and `location` are from hooks
   - **Next.js**: Ensure correct import (`next/navigation` for App Router)

3. **`Cannot access 'router' before initialization` (e.g., `vowel.client.ts:44`)**
   - Move router creation to dedicated `router.ts`
   - Import router from `router.ts` in both `main/App` and `vowel.client.ts`
   - Remove circular imports between `router.ts`, `vowel.client.ts`, and route/root files
   - Do not define router in `main.tsx`/`App.tsx` when `vowel.client.ts` uses it

4. **Actions not executing**
   - Ensure actions are registered BEFORE calling `startSession()`
   - Check that action handlers return a result object
   - Look for errors in the browser console

5. **State not syncing**
   - Verify `useAppStateSync` hook is called inside `VowelProvider`
   - Check that state management hooks are reactive (useSnapshot, useStore, etc.)
   - Ensure context object is serializable

6. **AI has wrong/empty state on first turn / initial greeting**
   - Context may not be populated when session starts - `useSyncContext` runs inside route tree
   - Push initial context after creating client: `vowelInstance.updateContext(buildVowelContext())`
   - Register `getGameState` action and instruct AI to call it FIRST for initial greeting
   - See **references/initialization-context-ready.md**

7. **Microphone not working**
   - Ensure HTTPS (localhost works without HTTPS)
   - Check browser permissions for microphone access

## Key Features

- **Voice Navigation** - Navigate your app with voice commands
- **State-Driven Actions** - Modify app state through voice commands
- **Custom Actions** - Register business-specific voice commands
- **Automatic State Sync** - State is always available to AI via context
- **Framework Agnostic** - Works with any React setup
- **Automation Optional** - DOM automation disabled by default, opt-in when needed

## Reference Files

For detailed information on specific topics:

- **references/platform-overview.md** - What vowel is, key concepts (appId, tokens, adapters), connection flow, monorepo structure
- **references/languages-and-vad.md** - Supported languages (Whisper, AssemblyAI, Inworld TTS), VAD modes (client_vad, server_vad, semantic_vad)
- **references/connection-paradigms.md** - appId, developer-managed tokens, fixed API keys, direct WebSocket, sidecar pattern
- **references/initialization-context-ready.md** - Context-ready initialization, loading gate, buildVowelContext, getGameState fallback
- **references/router-adapters.md** - Complete router setup guide for all supported routers
- **references/state-management.md** - State management integration patterns (Valtio, Zustand, Redux)
- **references/custom-actions.md** - Custom action design and best practices
