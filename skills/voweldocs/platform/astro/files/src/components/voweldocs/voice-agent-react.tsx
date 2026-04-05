// Skill reference copy for the packaged Astro/Starlight VowelDocs integration.
// Copy this file as the exact React/Vowel runtime layer.
// Preserve:
// - `new Vowel(...)` from `@vowel.to/client`
// - `VowelProvider` / `VowelAgent` from `@vowel.to/client/react`
// - the singleton runtime on `window.__voweldocsVoiceAgent`
// - in-place context updates instead of remount churn
// Adapt only the minimum needed for the target app.

import React from 'react';
import { createRoot, type Root } from 'react-dom/client';

import { Vowel, type VowelAction } from '@vowel.to/client';
import { VowelAgent, VowelProvider } from '@vowel.to/client/react';

interface VoiceAgentConfig {
  appId?: string;
  language: string;
  initialGreetingPrompt: string;
  turnDetectionPreset?: 'aggressive' | 'balanced' | 'conservative';
  _voiceConfig?: Record<string, unknown>;
  _caption?: Record<string, unknown>;
  borderGlow?: Record<string, unknown>;
  floatingCursor?: { enabled: boolean };
}

interface ActionTarget {
  registerAction: (name: string, definition: VowelAction, handler: (params: any) => Promise<any>) => void;
}

interface VoiceNavigationRoute {
  path: string;
  description: string;
  metadata?: Record<string, unknown>;
  queryParams?: string[];
}

interface VoiceNavigationAdapter {
  navigate: (path: string) => Promise<void>;
  getCurrentPath: () => string;
  getRoutes?: () => Promise<VoiceNavigationRoute[]>;
  getContext?: () => unknown;
}

interface RuntimeState {
  root: Root | null;
  client: Vowel | null;
  host: HTMLElement | null;
  configKey: string | null;
  renderedClient: Vowel | null;
}

declare global {
  interface Window {
    __voweldocsVoiceAgent?: RuntimeState;
  }
}

function getRuntimeState(): RuntimeState {
  if (!window.__voweldocsVoiceAgent) {
    window.__voweldocsVoiceAgent = {
      root: null,
      client: null,
      host: null,
      configKey: null,
      renderedClient: null,
    };
  }

  return window.__voweldocsVoiceAgent;
}

function VoiceAgentShell({ client }: { client: Vowel | null }) {
  if (!client) return null;

  return (
    <VowelProvider client={client} floatingCursor={false} clientMode="strict">
      <VowelAgent position="bottom-right" showTranscripts={false} />
    </VowelProvider>
  );
}

function ensureRoot(host: HTMLElement): Root {
  const runtime = getRuntimeState();

  if (runtime.root && runtime.host === host) {
    return runtime.root;
  }

  if (runtime.root && runtime.host && runtime.host !== host) {
    runtime.root.render(null);
    runtime.renderedClient = null;
  }

  runtime.root = createRoot(host);
  runtime.host = host;
  return runtime.root;
}

async function stopClient(client: Vowel | null) {
  if (!client) return;

  try {
    await client.stopSession();
  } catch (error) {
    console.warn('[voweldocs] Failed to stop existing Vowel client cleanly:', error);
  }
}

function createNavigationAdapter(options: {
  navigate: (path: string) => boolean | Promise<boolean>;
  getCurrentPath?: () => string;
  getRoutes?: () => VoiceNavigationRoute[];
  getContext?: () => Record<string, unknown> | null;
}): VoiceNavigationAdapter {
  return {
    async navigate(path: string) {
      const didNavigate = await options.navigate(path);

      if (!didNavigate) {
        throw new Error(`Astro navigation failed for path "${path}"`);
      }
    },
    getCurrentPath() {
      return options.getCurrentPath?.() ?? window.location.pathname;
    },
    async getRoutes() {
      return options.getRoutes?.() ?? [];
    },
    getContext() {
      return options.getContext?.() ?? null;
    },
  };
}

export async function initializeVoiceAgent(options: {
  host: HTMLElement;
  config: VoiceAgentConfig;
  configKey: string;
  registerActions: (target: ActionTarget) => void;
  navigate: (path: string) => boolean | Promise<boolean>;
  getCurrentPath?: () => string;
  getRoutes?: () => VoiceNavigationRoute[];
  getContext?: () => Record<string, unknown> | null;
  context: Record<string, unknown> | null;
}) {
  const {
    host,
    config,
    configKey,
    registerActions,
    navigate,
    getCurrentPath,
    getRoutes,
    getContext,
    context,
  } = options;
  const runtime = getRuntimeState();
  const root = ensureRoot(host);

  if (!runtime.client || runtime.configKey !== configKey) {
    await stopClient(runtime.client);

    const navigationAdapter = createNavigationAdapter({
      navigate,
      getCurrentPath,
      getRoutes,
      getContext,
    });

    const client = new Vowel({
      appId: config.appId,
      language: config.language,
      initialGreetingPrompt: config.initialGreetingPrompt,
      turnDetectionPreset: config.turnDetectionPreset,
      _voiceConfig: config._voiceConfig,
      _caption: config._caption,
      borderGlow: config.borderGlow,
      floatingCursor: config.floatingCursor ?? { enabled: false },
      navigationAdapter,
    });

    registerActions(client);

    runtime.client = client;
    runtime.configKey = configKey;
  }

  runtime.client.updateContext(context);

  if (runtime.renderedClient !== runtime.client) {
    root.render(<VoiceAgentShell client={runtime.client} />);
    runtime.renderedClient = runtime.client;
  }
}

export async function cleanupVoiceAgent() {
  const runtime = getRuntimeState();

  await stopClient(runtime.client);
  runtime.client = null;
  runtime.configKey = null;
  runtime.renderedClient = null;

  if (runtime.root) {
    runtime.root.render(null);
  }
}

export async function resumeVoiceAgentPlayback() {
  const runtime = getRuntimeState();

  if (!runtime.client) {
    return;
  }

  await runtime.client.resumePlayback();
}
