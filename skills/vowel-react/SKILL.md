---
name: vowel-react
description: Initialize vowel.to voice agent in React applications (React, Next.js, TanStack Router, React Router) with complete setup including adapters, providers, and custom actions. Use when setting up voice agent integration, configuring navigation adapters, implementing custom voice actions, or integrating state management with voice AI. The skill emphasizes writing to app stores rather than DOM manipulation, with automation harness disabled by default.
---

# Vowel React Integration

Initialize a vowel.to voice agent in a React application with proper navigation, state management, and custom actions.

## Overview

This skill provides complete guidance for integrating vowel.to voice agents into React applications. It covers:

- Installation and client setup for all major React routers
- Navigation adapter configuration (TanStack Router, Next.js, React Router, custom)
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

## Prerequisites

- React 18+ application
- TypeScript (recommended)
- A router (Next.js, TanStack Router, React Router, or custom)
- A vowel.to App ID (get one at https://vowel.to)

## Installation

```bash
# The @vowel.to/client package is currently a local development package
bun link @vowel.to/client

# Or if using npm/yarn:
npm install @vowel.to/client
# yarn add @vowel.to/client
```

## Quick Start (TanStack Router)

TanStack Router is recommended because it provides automatic route discovery.

### 0. Required Route Tree Generation Check

If the project uses TanStack file-based routing, make sure the route tree is generated before finishing. `routeTree.gen.ts` should exist (default: `src/routeTree.gen.ts`, or custom path from `tsr.config.json` `generatedRouteTree`).

Use this order:

1. If the project already has route-generation scripts, run them with the repo package manager:
   - `generate-routes`
   - `watch-routes` (for dev workflows)
2. If no script exists and route tree is missing/stale, run one-shot CLI generation:
   - bun: `bunx @tanstack/router-cli generate`
   - pnpm: `pnpm dlx @tanstack/router-cli generate`
   - yarn: `yarn dlx @tanstack/router-cli generate`
   - npm: `npx @tanstack/router-cli generate`
3. Re-run typecheck/build and verify route tree import errors are gone.

Important: prefer the project's existing package manager/scripts first. Do not switch package managers.

### 1. Create Router File

Create `router.ts` to avoid circular dependencies:

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

let currentAppId: string | null = null;
let vowelInstance: Vowel | null = null;

type VowelChangeListener = (client: Vowel | null) => void;
const vowelChangeListeners = new Set<VowelChangeListener>();

// ⚠️ CRITICAL: Automation adapter disabled by default
const { navigationAdapter, automationAdapter } = createTanStackAdapters({
  router: router as any,
  enableAutomation: false  // ❌ Disabled by default
});

function createVowelClient(appId: string): Vowel {
  const vowel = new Vowel({
    appId: appId,
    instructions: `You are a helpful assistant for this application.

## CRITICAL: Write to App Store, Not DOM
**⚠️ MOST IMPORTANT RULE**: When performing actions, you MUST write to the application store/state management system, NOT manipulate the DOM directly. Always use registered actions that modify the app store. The UI will automatically update to reflect state changes.

## CRITICAL: Always Refer to Context for Information
Before answering ANY question or performing ANY action, ALWAYS check the <context> section for current information. The context contains the most up-to-date state of the application.

## Current Application State:
The current state is automatically provided in the <context> section. You always have access to the latest state - no need to call any actions to read it.

## Available Actions:
[Document your custom actions here]

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
    
    voiceConfig: {
      provider: 'vowel-prime',
      vowelPrimeConfig: { environment: 'staging' },
      model: "google/gemini-3-flash-preview",
      voice: 'Timothy',
      language: 'en-US'
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
  // ⚠️ CRITICAL: All actions MUST be registered BEFORE startSession()!
  // ⚠️ CRITICAL: Actions should write to app store, NOT manipulate DOM!
  
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

Update `src/App.tsx`:

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

### 4. Add Voice UI to Root Route

Update `src/routes/__root.tsx`:

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
- **In your todo list, include the names of each vowel custom action you register** (e.g., addToCart, searchProducts, filterProductsByCategory) so reviewers can see the full set at a glance

**❌ DON'T:**
- Don't manipulate DOM directly (use state instead)
- Don't create navigation actions (navigationAdapter handles this)
- Don't use deeply nested JSON parameters
- Don't register too many actions (struggles above 20)

For complete action design guidance, see **references/custom-actions.md**.

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
// Enable automation in adapter creation
const { navigationAdapter, automationAdapter } = createTanStackAdapters({
  router: router as any,
  enableAutomation: true  // ✅ Enable if user explicitly requests
});
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
   - For TanStack Router: Use `getVowel()` and `subscribeToVowelChanges()` pattern
   - Check that `setAppId()` has been called

2. **Routes not working**
   - **TanStack Router**: Import router instance from `router.ts`, not using `useRouter()` hook
   - **React Router**: Verify `navigate` and `location` are from hooks
   - **Next.js**: Ensure correct import (`next/navigation` for App Router)

3. **Actions not executing**
   - Ensure actions are registered BEFORE calling `startSession()`
   - Check that action handlers return a result object
   - Look for errors in the browser console

4. **State not syncing**
   - Verify `useAppStateSync` hook is called inside `VowelProvider`
   - Check that state management hooks are reactive (useSnapshot, useStore, etc.)
   - Ensure context object is serializable

5. **Microphone not working**
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

- **references/router-adapters.md** - Complete router setup guide for all supported routers
- **references/state-management.md** - State management integration patterns (Valtio, Zustand, Redux)
- **references/custom-actions.md** - Custom action design and best practices
