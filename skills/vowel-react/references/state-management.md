# State Management Integration

Complete guide to integrating Vowel with state management systems.

## Table of Contents

- ✅ Recommended: Sync Context Pattern
- State Management Examples (Valtio, Zustand, Redux)
- ⚠️ Advanced: Manual Context Updates
- ⚠️ DEPRECATED: getAppState Action Pattern

---

## ✅ Recommended: Sync Context Pattern

**The Sync Context Pattern automatically syncs application state to the AI's context**, making state always available without requiring action calls. This is the **recommended approach** for all integrations.

### Benefits

- ✅ State is automatically available in the `<context>` section
- ✅ No action calls needed - AI can reference context directly
- ✅ Always up-to-date - automatically refreshes when stores change
- ✅ Simpler implementation - just use a hook
- ✅ Better performance - reactive updates only when state changes
- ✅ **Aligns with "write to app store" philosophy** - state changes update automatically

### Implementation

Create a custom hook that uses `useSyncContext` from `@vowel.to/client/react`. **Also export a `buildVowelContext()` function** callable outside React for the initial context push when creating the client (see **initialization-context-ready.md**).

```typescript
// hooks/useAppStateSync.ts or vowel.state.ts
import { useMemo } from 'react'
import { useSnapshot, snapshot } from 'valtio'
import { useRouterState } from '@tanstack/react-router'  // optional - for route in context
import { useSyncContext } from '@vowel.to/client/react'
import { cartStore, getCartItemCount, getCartTotal } from '@/store/cart'
import { vehicleStore } from '@/store/vehicle'
import { wishlistStore } from '@/store/wishlist'
import { router } from './router'

function getPathnameLabel(pathname: string): string {
  if (pathname === '/') return 'Home'
  if (pathname === '/products') return 'Products'
  if (pathname === '/cart') return 'Cart'
  return pathname
}

/**
 * Build context object from current store state. Callable outside React
 * (e.g. from vowel.client setAppId for initial push). When used in React,
 * pass routeOverride from useRouterState if needed.
 */
export function buildVowelContext(routeOverride?: { pathname: string; pathnameLabel: string; search: string }) {
  const cart = snapshot(cartStore)
  const vehicle = snapshot(vehicleStore)
  const wishlist = snapshot(wishlistStore)
  const route = routeOverride ?? (() => {
    const loc = router.state.location
    return { pathname: loc.pathname, pathnameLabel: getPathnameLabel(loc.pathname), search: String(loc.search) }
  })()
  return {
    route,
    cart: { items: cart.items, itemCount: getCartItemCount(), total: getCartTotal().toFixed(2) },
    vehicle: { selectedVehicle: vehicle.selectedVehicleId ? vehicle.vehicles[vehicle.selectedVehicleId] : null },
    wishlist: { items: wishlist.wishlistItems, itemCount: wishlist.wishlistItems.length },
  }
}

/**
 * Hook that syncs all app state stores to Vowel's dynamic context
 * This automatically updates context whenever any of the stores change.
 */
export function useAppStateSync() {
  const cart = useSnapshot(cartStore)
  const vehicle = useSnapshot(vehicleStore)
  const wishlist = useSnapshot(wishlistStore)
  const { location } = useRouterState()

  const context = useMemo(
    () => buildVowelContext({
      pathname: location.pathname,
      pathnameLabel: getPathnameLabel(location.pathname),
      search: String(location.search),
    }),
    [cart, vehicle, wishlist, location.pathname, location.search]
  )

  useSyncContext(context)
}
```

### Usage in App

Use it in your app (inside `VowelProvider`):

```typescript
// App.tsx or main component
import { VowelProvider } from '@vowel.to/client/react'
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

### System Instructions for Sync Context Pattern

Update your system instructions to reference the context section:

```typescript
instructions: `You are a helpful assistant for this application.

## CRITICAL: Write to App Store, Not DOM
**⚠️ MOST IMPORTANT RULE**: When performing actions, you MUST write to the application store/state management system, NOT manipulate the DOM directly. Always use registered actions that modify the app store. The UI will automatically update to reflect state changes.

**Why this matters:**
- React applications are state-driven - DOM manipulation breaks the React rendering cycle
- State changes automatically trigger UI updates
- Direct DOM manipulation causes inconsistencies between state and UI
- Writing to the store ensures proper data flow and persistence

**How to follow this rule:**
1. Use registered actions that modify the app store (e.g., addToCart, updateQuantity, setFilter)
2. Check context to see current state before making changes
3. Trust that UI will update automatically after state changes
4. NEVER use automation/DOM actions like click() or type() unless explicitly required by user

## CRITICAL: Always Refer to Context for Information
**⚠️ IMPORTANT**: Before answering ANY question or performing ANY action, ALWAYS check the <context> section for current information. Never rely on memory or assumptions. The context contains the most up-to-date state of the application.

**When to use context:**
- User asks "what's in my cart?" → Check context.cart
- User asks "what vehicle is selected?" → Check context.vehicle.selectedVehicle
- User wants to add to cart → Check context.cart first to see what's already there
- ANY question about current state → Check context first

**The context is always accurate and up-to-date** - it's automatically refreshed whenever the user makes changes. Trust the context as your single source of truth.

## Current Application State:
The current state of the application (cart, vehicle, wishlist, etc.) is automatically provided in the <context> section. You always have access to the latest state - no need to call any actions to read it.

## Available Actions:
[List your custom actions here - these should modify the app store]

## How to Use:
- To navigate: Say "go to products" or "show me cart"
- To modify state: Use registered actions that write to the app store
- To check state: Reference context directly (e.g., context.cart, context.user)
- **DO NOT use DOM manipulation** unless explicitly required by user

Help users interact with the application by modifying state through registered actions.`
```

### Key Instruction Elements

1. **Write to App Store Priority** - Emphasize that actions should modify state, not DOM
2. **Context Reference** - Instruct AI to check `<context>` section for current state
3. **State Availability** - Explain that state is automatically synced and always current
4. **Action Guidelines** - List actions that modify the app store
5. **DOM Automation Caveat** - Clarify that DOM manipulation should only be used if explicitly requested

---

## State Management Examples

### Valtio (Proxy-based State)

```typescript
import { useSnapshot } from 'valtio'
import { useSyncContext } from '@vowel.to/client/react'
import { cartStore, vehicleStore } from '@/store'

export function useAppStateSync() {
  const cart = useSnapshot(cartStore)
  const vehicle = useSnapshot(vehicleStore)
  
  const context = useMemo(() => ({
    cart: { 
      items: cart.items, 
      itemCount: cart.items.length,
      total: cart.total 
    },
    vehicle: { 
      selectedVehicle: vehicle.selectedVehicle 
    }
  }), [cart, vehicle])
  
  useSyncContext(context)
}
```

### Zustand

```typescript
import { useCartStore, useUserStore } from './store'
import { useSyncContext } from '@vowel.to/client/react'

export function useAppStateSync() {
  const cart = useCartStore()
  const user = useUserStore()
  
  const context = useMemo(() => ({
    cart: { 
      items: cart.items, 
      total: cart.total 
    },
    user: { 
      name: user.name, 
      email: user.email 
    }
  }), [cart, user])
  
  useSyncContext(context)
}
```

### Redux Toolkit

```typescript
import { useSelector } from 'react-redux'
import { useSyncContext } from '@vowel.to/client/react'
import { selectCartItems, selectCartTotal } from './store/cartSlice'

export function useAppStateSync() {
  const cartItems = useSelector(selectCartItems)
  const cartTotal = useSelector(selectCartTotal)
  const user = useSelector(state => state.user)
  
  const context = useMemo(() => ({
    cart: { 
      items: cartItems, 
      total: cartTotal 
    },
    user: user
  }), [cartItems, cartTotal, user])
  
  useSyncContext(context)
}
```

---

## ⚠️ Advanced: Manual Context Updates

**⚠️ NOT RECOMMENDED:** The manual context update function provides more control, but it's **not the preferred pattern**. Use the **Sync Context Pattern** instead.

### When to Use Manual Updates

- You need to update context at specific times (e.g., after async operations)
- You want to batch multiple state changes into a single context update
- You're integrating with non-reactive state management systems
- You need fine-grained control over update timing

### Implementation

```typescript
import { useVowel } from '@vowel.to/client/react'
import { useEffect } from 'react'
import { useSnapshot } from 'valtio'
import { cartStore, vehicleStore } from '@/store'

function MyComponent() {
  const { client } = useVowel()
  const cart = useSnapshot(cartStore)
  const vehicle = useSnapshot(vehicleStore)

  const updateVowelContext = () => {
    if (!client) return

    const context = {
      cart: {
        items: cart.items,
        itemCount: cart.items.length,
        total: cart.total,
      },
      vehicle: {
        selectedVehicle: vehicle.selectedVehicle,
      },
    }

    client.updateContext(context)
  }

  // Update context after async operation
  const handleAddToCart = async (productId: string) => {
    await addToCart(productId)
    updateVowelContext()
  }

  // Update context on mount or when stores change
  useEffect(() => {
    updateVowelContext()
  }, [cart.items, vehicle.selectedVehicle])

  return (/* Your component JSX */)
}
```

---

## ⚠️ DEPRECATED: getAppState Action Pattern

**This pattern is deprecated. Use the Sync Context Pattern instead.**

The old pattern required creating a `getAppState` action and instructing the AI to call it before performing actions. This is no longer recommended because:

- Requires manual action calls by the AI
- More complex system instructions
- Potential for stale state if AI forgets to call the action
- Less efficient than automatic context syncing
- **Does NOT align with "write to app store" philosophy**

**Migration:** Use the Sync Context Pattern documented above instead.

---

## Best Practices

### ✅ DO:

- **Write to app store** - Always modify state through registered actions
- Use the Sync Context Pattern for automatic state syncing
- Keep context objects serializable (no functions, circular refs)
- Include only necessary state in context (avoid bloat)
- Use computed/derived values when helpful (e.g., `itemCount`, `total`)
- Trust that UI will update automatically after state changes

### ❌ DON'T:

- **Don't manipulate DOM directly** - Use state management instead
- Don't use the deprecated `getAppState` action pattern
- Don't include sensitive data in context (passwords, tokens)
- Don't sync massive objects (keep context lean)
- Don't forget to wrap `useSyncContext` call in a component inside `VowelProvider`
- Don't assume DOM manipulation is needed - prefer state changes
