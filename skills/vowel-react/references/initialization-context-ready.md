# Initialization and Context-Ready Patterns

Ensure the Vowel client is initialized only after app context (stores, localStorage) is ready, and that the AI has meaningful state from the first turn.

## Why Context-Ready Matters

- **App stores may load from localStorage** - userName, language, preferences are often in localStorage. If you create the Vowel client at module load, those values may be empty.
- **Context may not be populated on first turn** - `useSyncContext` runs inside the route tree. The session can start before the first sync. The AI needs a way to get state for the initial greeting.
- **STT/TTS language** - `voiceConfig.language` should match the user's stored preference. Initialize the client after that preference is loaded.

## Pattern 1: Deferred Client Initialization

**Do NOT call `setAppId` at module load.** Call it from `useEffect` after the App mounts so stores are populated.

```typescript
// App.tsx - BAD: init at module load
setAppId(import.meta.env.VITE_VOWEL_APP_ID);  // ❌ Stores may not be loaded yet

// App.tsx - GOOD: init after mount
function useVowelInit() {
  useEffect(() => {
    const appId = import.meta.env.VITE_VOWEL_APP_ID;
    if (appId) setAppId(appId);
  }, []);
}
```

## Pattern 2: Push Initial Context After Creating Client

Immediately after creating the Vowel client, push the current state so the AI has context before the first turn.

```typescript
// vowel.client.ts
export function setAppId(appId: string) {
  if (!appId) return;
  currentAppId = appId;
  vowelInstance = createVowelClient(appId);
  /** Push initial context from stores (userName, language, games, etc.) */
  vowelInstance.updateContext(buildVowelContext());
  console.log("✅ Vowel client initialized with App ID:", appId);
  vowelChangeListeners.forEach((listener) => listener(vowelInstance));
}
```

## Pattern 3: Shared buildVowelContext (Callable Outside React)

Export a `buildVowelContext()` that can be called both inside React (with route override) and outside React (uses router.state.location).

```typescript
// vowel.state.ts
/** Route/URL state for Vowel context */
export interface RouteContext {
  pathname: string;
  pathnameLabel: string;
  search: string;
}

/**
 * Build the Vowel context object from current app and games store state.
 * Used for initial context when creating the client and for ongoing sync.
 * Callable outside React (e.g. from vowel.client when creating the client).
 *
 * @param routeOverride - Optional. When omitted, uses router.state.location.
 *   When provided, uses the given values (for VowelStateSync which has useRouterState).
 */
export function buildVowelContext(routeOverride?: RouteContext) {
  const app = snapshot(appStore);
  const games = snapshot(gamesStore);
  const route = routeOverride ?? (() => {
    const loc = router.state.location;
    return {
      pathname: loc.pathname,
      pathnameLabel: getPathnameLabel(loc.pathname),
      search: searchToString(loc.search),
    };
  })();

  return {
    route,
    ui: { currentScreen: route.pathnameLabel },
    userName: app.userName,
    language: app.language,
    games: { /* ... */ },
  };
}
```

## Pattern 4: Loading Gate Until Client Is Ready

Don't render `VowelProvider` until the client exists. Show a loading placeholder so the user doesn't see a broken state.

```typescript
// App.tsx
function AppContent() {
  const [vowel, setVowel] = useState<VowelClientType>(getVowel());
  const appId = import.meta.env.VITE_VOWEL_APP_ID;

  useEffect(() => {
    const unsubscribe = subscribeToVowelChanges((client) => setVowel(client));
    return () => unsubscribe();
  }, []);

  const vowelReady = vowel !== null || !appId;
  if (!vowelReady) {
    return <AppLoading />;
  }

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
```

## Pattern 5: getGameState / getAppState Fallback Action

The context may not be populated when the session starts (useSyncContext runs inside the route tree). Provide an action the AI can call **first** for the initial greeting.

```typescript
// vowel.client.ts - register getGameState
vowel.registerAction(
  "getGameState",
  {
    description:
      "Get the current game/screen state. Returns route, ui, userName, language, games. CALL THIS FIRST when starting a new session (initial greeting) - context may not be populated yet.",
    parameters: {},
  },
  async () => {
    const state = buildVowelContext();
    return { success: true, ...state };
  }
);
```

**System instructions:** Tell the AI to call `getGameState()` first when it speaks:

```
## CRITICAL: Initial Greeting (First Thing You Say)
When you first speak in a new session, you MUST call getGameState() FIRST. The context may not be populated yet - getGameState() reliably returns the current route, games state, userName, language, etc. Do NOT rely on context alone for the initial greeting.
```

## Pattern 6: subscribeToVowelChanges - Sync on Subscribe

When a component subscribes, immediately invoke the listener with the current client if one exists (handles race where client was created before subscription).

```typescript
export function subscribeToVowelChanges(listener: VowelChangeListener): () => void {
  vowelChangeListeners.add(listener);
  if (vowelInstance) {
    listener(vowelInstance);  // Sync immediately - handles race
  }
  return () => vowelChangeListeners.delete(listener);
}
```

## Pattern 7: Config Sync When Language/User Changes

When `language` or `userName` changes (affects STT/TTS and initial greeting), recreate the client so the next session uses the new values.

```typescript
// App.tsx
function useVowelConfigSync() {
  useEffect(() => {
    const unsubLang = subscribeKey(appStore, "language", () => syncVowelLanguage());
    const unsubName = subscribeKey(appStore, "userName", () => syncVowelLanguage());
    return () => {
      unsubLang();
      unsubName();
    };
  }, []);
}

// vowel.client.ts
export function syncVowelLanguage() {
  if (currentAppId) {
    vowelInstance = createVowelClient(currentAppId);
    vowelInstance.updateContext(buildVowelContext());
    vowelChangeListeners.forEach((listener) => listener(vowelInstance));
  }
}
```

## Pattern 8: VowelStateSync Inside Route Tree

Mount `VowelStateSync` inside the root route (inside both `RouterProvider` and `VowelProvider`) so it has access to `useRouterState` and `useSyncContext`.

```typescript
// routes/__root.tsx
function RootComponent() {
  return (
    <div className="min-h-dvh flex flex-col">
      <VowelStateSync />
      <main className="flex-1">
        <Outlet />
      </main>
      <VowelAgent position="bottom-right" enableFloatingCursor={false} />
    </div>
  );
}
```

## Summary Checklist

- [ ] Call `setAppId` from `useEffect` after App mounts, not at module load
- [ ] Push `buildVowelContext()` immediately after creating the client
- [ ] Export `buildVowelContext` callable outside React (no hooks)
- [ ] Show loading until `vowel !== null || !appId` before rendering VowelProvider
- [ ] Register `getGameState` action and instruct AI to call it FIRST for initial greeting
- [ ] Sync listener immediately on subscribe if client already exists
- [ ] Recreate client when language/userName changes (if they affect voice config)
- [ ] Mount VowelStateSync inside root route (inside RouterProvider + VowelProvider)
