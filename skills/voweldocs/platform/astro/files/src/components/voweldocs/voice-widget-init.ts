/*
 * Skill reference copy for the packaged Astro/Starlight VowelDocs integration.
 *
 * This is the canonical VowelDocs bootstrap file and should be treated as the
 * source of truth for:
 * - the branded `voweldocs` header button
 * - the credential modal and its styling/behavior
 * - localStorage config shape (`voweldoc-config`)
 * - route-map generation from docs content
 * - docs-specific custom actions
 * - Astro `astro:page-load` / `astro:after-swap` handling
 * - audio-host wiring and playback recovery
 *
 * Copy this file rather than re-synthesizing it. Then adapt only project-
 * specific strings, canonical site values, and docs-branding prompt text.
 * If a generated integration is missing this file, importing the wrong Vowel
 * APIs, or moving its responsibilities into another file, the reconstruction is
 * incomplete and needs a second pass.
 */

/**
 * Global Voice Widget Initializer for voweldocs
 *
 * This script runs on all pages and:
 * 1. Injects the configuration dialog and trigger button
 * 2. Checks localStorage for existing voweldocs configuration
 * 3. Initializes the Vowel voice widget if configuration exists
 * 4. Listens for configuration changes from the dialog
 *
 * This script is automatically loaded on all pages via astro.config.mjs head config.
 */

import { navigate as astroClientNavigate } from 'astro:transitions/client';

import { cleanupVoiceAgent, initializeVoiceAgent, resumeVoiceAgentPlayback } from './voice-agent-react';

// ==========================================
// TYPE DEFINITIONS (self-contained)
// ==========================================

type ConfigMode = 'hosted' | 'selfhosted';

interface HostedConfig {
  appId: string;
}

interface SelfHostedConfig {
  appId?: string;
  url?: string;
  jwt?: string;
}

interface StoredCredentials {
  mode: ConfigMode;
  hosted?: HostedConfig;
  selfHosted?: SelfHostedConfig;
  timestamp: number;
}

interface VowelConfig {
  appId?: string;
  language: string;
  initialGreetingPrompt: string;
  _voiceConfig: {
    provider?: 'vowel-prime';
    vowelPrimeConfig?: { environment: 'staging' };
    llmProvider?: 'groq';
    model?: string;
    voice?: string;
    token?: string;
    turnDetection?: {
      mode: 'server_vad';
    };
    systemPrompt?: string;
  };
  _caption: {
    enabled: boolean;
    position: string;
    maxWidth: string;
    showRole: boolean;
    showOnMobile: boolean;
    showStreaming: boolean;
  };
  borderGlow: {
    enabled: boolean;
    color: string;
    intensity: number;
    pulse: boolean;
  };
  floatingCursor: { enabled: boolean };
}

const STORAGE_KEY = 'voweldoc-config';
const DOC_FILE_MODULES = import.meta.glob('../../content/docs/**/*.mdx', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

type DocsRoute = {
  path: string;
  title: string;
  category?: string;
  description?: string;
};

/**
 * Get configuration from localStorage
 */
function getStoredConfig(): StoredCredentials | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

/**
 * Extract URL from JWT payload
 */
function extractUrlFromJwt(jwt: string): string | null {
  try {
    const parts = jwt.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    return payload.url || payload.endpoint || payload.rtu || null;
  } catch {
    return null;
  }
}

/**
 * System prompt for the documentation AI assistant.
 * This AI facilitates natural conversations and proactively navigates users to relevant guides.
 */
const DOCS_SYSTEM_PROMPT = `You are a helpful documentation assistant for emdash CMS. Your role is to facilitate natural, conversational discussions with users about how to use emdash, rather than just acting as a librarian who retrieves articles.

CRITICAL - ALWAYS FOLLOW THIS EXACT ORDER:
1. When a user asks "how do I..." or asks about any topic on another page, YOU MUST use the built-in navigate tool FIRST - before saying anything to the user.
2. If you do not know the exact path yet, use listRoutes first, then call navigate with the exact URL returned by listRoutes.
3. Never use search or searchDocs to find pages.
4. Never talk first and navigate later - this feels disjointed to the user.

Example of correct behavior:
- User: "How do I create a plugin?"
- You: [IMMEDIATELY call listRoutes if needed, then call navigate with the exact documentation path]
- After navigation succeeds: "I've taken you to the plugin guide. Here's how to create a plugin..."

Example of WRONG behavior:
- User: "How do I create a plugin?"
- You: "Let me help you with that" or "Here's how to create a plugin..." [without navigating first]

Always stay on the most relevant page for the user's current need. If they ask about a different topic, navigate there immediately before responding.

Be conversational, friendly, and proactive. Don't just list documentation pages - actually help them understand and accomplish their goals.`;

/**
 * Navigate using Astro's client-side router to avoid page refresh.
 * This preserves the voice agent session during navigation.
 * Falls back to standard navigation if Astro router is not available.
 */
async function astroNavigate(path: string): Promise<boolean> {
  try {
    const targetUrl = new URL(path, window.location.origin);
    const targetPath = `${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`;

    await astroClientNavigate(targetPath);
    console.log('[voweldocs] Navigating via astro:transitions/client navigate():', targetPath);
    return true;
  } catch (error) {
    console.error('[voweldocs] Navigation failed:', error);
    return false;
  }
}

function toTitleCase(value: string): string {
  return value
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function toAbsoluteDocsUrl(path: string): string {
  return new URL(path, window.location.origin).href;
}

function extractFrontmatterField(source: string, field: string): string | undefined {
  const match = source.match(new RegExp(`^${field}:\\s*(.+)$`, 'm'));
  if (!match) return undefined;

  return match[1].trim().replace(/^['"]|['"]$/g, '');
}

function buildDocsRouteManifest(): DocsRoute[] {
  const routes = Object.entries(DOC_FILE_MODULES).map(([filePath, source]) => {
    const relativePath = filePath
      .replace('../../content/docs/', '')
      .replace(/^.*\/src\/content\/docs\//, '')
      .replace(/\.mdx$/, '');

    const segments = relativePath.split('/');
    const slugSegments = [...segments];
    const lastSegment = slugSegments[slugSegments.length - 1];

    if (lastSegment === 'index') {
      slugSegments.pop();
    }

    const path = slugSegments.length === 0 ? '/' : `/${slugSegments.join('/')}/`;
    const category =
      slugSegments.length <= 1 ? 'Getting Started' : toTitleCase(slugSegments[0]);
    const title =
      extractFrontmatterField(source, 'title') ??
      (lastSegment === 'index' && slugSegments.length > 0
        ? toTitleCase(slugSegments[slugSegments.length - 1])
        : toTitleCase(lastSegment));
    const description = extractFrontmatterField(source, 'description');

    return {
      path,
      title,
      category,
      description,
    };
  });

  return routes.sort((a, b) => a.path.localeCompare(b.path));
}

const DOCS_ROUTE_MANIFEST = buildDocsRouteManifest();

/**
 * Build voice configuration from stored credentials
 */
function buildVoiceConfig(credentials: StoredCredentials): VowelConfig {
  const baseConfig = {
    language: 'en-US',
    initialGreetingPrompt: `Welcome the user to the emdash docs by saying "Welcome to the emdash docs. How can I help?"`,
    _voiceConfig: {
      provider: 'vowel-prime' as const,
      vowelPrimeConfig: { environment: 'staging' as const },
      llmProvider: 'groq' as const,
      model: 'openai/gpt-oss-120b',
      voice: 'Timothy',
      turnDetection: {
        mode: 'server_vad' as const,
      },
      systemPrompt: DOCS_SYSTEM_PROMPT,
    },
    _caption: {
      enabled: true,
      position: 'top-center',
      maxWidth: '600px',
      showRole: true,
      showOnMobile: true,
      showStreaming: true,
    },
    borderGlow: {
      enabled: true,
      color: 'rgba(99, 102, 241, 0.5)',
      intensity: 30,
      pulse: true,
    },
    floatingCursor: { enabled: false },
  };

  if (credentials.mode === 'hosted' && credentials.hosted) {
    return {
      ...baseConfig,
      appId: credentials.hosted.appId,
    };
  }

  if (credentials.mode === 'selfhosted' && credentials.selfHosted) {
    if (credentials.selfHosted.jwt) {
      return {
        ...baseConfig,
        appId: credentials.selfHosted.appId,
        _voiceConfig: {
          ...baseConfig._voiceConfig,
          token: credentials.selfHosted.jwt,
        },
      };
    }
    if (credentials.selfHosted.appId) {
      return {
        ...baseConfig,
        appId: credentials.selfHosted.appId,
      };
    }
  }

  throw new Error('Invalid credentials configuration');
}

function getBootstrapAppId(credentials: StoredCredentials): string | null {
  const modeScopedAppId =
    credentials.mode === 'hosted'
      ? credentials.hosted?.appId
      : credentials.selfHosted?.appId;

  if (modeScopedAppId && modeScopedAppId.trim()) {
    return modeScopedAppId;
  }

  const fallbackAppId = credentials.hosted?.appId || credentials.selfHosted?.appId;
  return fallbackAppId?.trim() ? fallbackAppId : null;
}

/**
 * Extract all documentation routes dynamically from the Starlight sidebar
 * This ensures the voice agent always knows about the current site structure
 */
function extractRoutesFromSidebar(): DocsRoute[] {
  if (DOCS_ROUTE_MANIFEST.length > 0) {
    return DOCS_ROUTE_MANIFEST;
  }

  const routes: { path: string; title: string; category?: string }[] = [];

  // Get all sidebar links
  const sidebarLinks = document.querySelectorAll('.sidebar-content a[href], #starlight__sidebar a[href], nav.sidebar a[href]');

  sidebarLinks.forEach(link => {
    const href = link.getAttribute('href');
    const title = link.textContent?.trim();

    if (href && title && !href.startsWith('#') && !href.startsWith('http')) {
      // Determine category from parent group
      let category: string | undefined;
      const parentGroup = link.closest('.group, .sidebar-group, [data-category]');
      if (parentGroup) {
        const categoryLabel = parentGroup.querySelector('h2, h3, .group-label, .category-label');
        category = categoryLabel?.textContent?.trim();
      }

      // Normalize path
      let normalizedPath = href;
      if (!normalizedPath.startsWith('/')) {
        normalizedPath = '/' + normalizedPath;
      }
      if (!normalizedPath.endsWith('/') && !normalizedPath.includes('#')) {
        normalizedPath += '/';
      }

      routes.push({ path: normalizedPath, title, category });
    }
  });

  // Fallback: if no routes found from sidebar, extract from main content links
  if (routes.length === 0) {
    const mainLinks = document.querySelectorAll('main a[href^="/"]');
    mainLinks.forEach(link => {
      const href = link.getAttribute('href');
      const title = link.textContent?.trim();
      if (href && title && !href.startsWith('#')) {
        routes.push({ path: href, title });
      }
    });
  }

  // Add home route if not present
  const hasHome = routes.some(r => r.path === '/' || r.path === '/index/' || r.path === '/introduction/');
  if (!hasHome) {
    routes.unshift({ path: '/introduction/', title: 'Introduction', category: 'Getting Started' });
  }

  return routes;
}

/**
 * Get the current documentation structure organized by category
 */
function getDocsStructure(): { category: string; pages: { path: string; title: string }[] }[] {
  const routes = extractRoutesFromSidebar();
  const byCategory = new Map<string, { path: string; title: string }[]>();

  routes.forEach(route => {
    const category = route.category || 'Other';
    if (!byCategory.has(category)) {
      byCategory.set(category, []);
    }
    byCategory.get(category)!.push({ path: route.path, title: route.title });
  });

  return Array.from(byCategory.entries()).map(([category, pages]) => ({
    category,
    pages,
  }));
}

/**
 * Extract all headings (H2, H3) from the current page for section navigation
 */
function extractPageHeadings(): { id: string; text: string; level: number }[] {
  const headings: { id: string; text: string; level: number }[] = [];

  // Get all H2 and H3 headings from the main content area
  const mainContent = document.querySelector('main, .content, article, [class*="content"]');
  const headingElements = mainContent?.querySelectorAll('h2, h3') ||
    document.querySelectorAll('main h2, main h3, article h2, article h3');

  headingElements.forEach(heading => {
    // Get the ID from the heading itself or from a parent/anchor
    let id = heading.id;
    if (!id) {
      // Check for anchor link inside the heading (Starlight pattern)
      const anchor = heading.querySelector('a[href^="#"]');
      if (anchor) {
        const href = anchor.getAttribute('href');
        id = href?.replace('#', '') || '';
      }
    }

    // Skip if still no ID
    if (!id) return;

    const text = heading.textContent?.trim().replace(/\s+/g, ' ') || '';
    const level = heading.tagName === 'H2' ? 2 : 3;

    headings.push({ id, text, level });
  });

  return headings;
}

/**
 * Find a heading by query (fuzzy match)
 */
function findHeading(query: string): { id: string; text: string; level: number } | null {
  const headings = extractPageHeadings();
  const normalizedQuery = query.toLowerCase().trim();

  // Exact text match
  const exactMatch = headings.find(h => h.text.toLowerCase() === normalizedQuery);
  if (exactMatch) return exactMatch;

  // Partial match
  const partialMatch = headings.find(h => h.text.toLowerCase().includes(normalizedQuery));
  if (partialMatch) return partialMatch;

  // First few words match
  const wordsMatch = headings.find(h => {
    const headingWords = h.text.toLowerCase().split(' ').slice(0, 3).join(' ');
    return headingWords.includes(normalizedQuery) || normalizedQuery.includes(headingWords);
  });
  if (wordsMatch) return wordsMatch;

  return null;
}

/**
 * Extract page content for summarization
 * Returns structured content that can be used for voice reading
 */
function extractPageContent(): {
  title: string;
  headings: { id: string; text: string; level: number }[];
  summary: string;
  sections: { heading: string; content: string }[];
} {
  const title = document.querySelector('h1')?.textContent?.trim() ||
    document.title?.replace(' | EmDash Docs', '') ||
    'Unknown page';

  const headings = extractPageHeadings();

  // Get main content text (first few paragraphs for summary)
  const mainContent = document.querySelector('main, .content, article') || document.body;
  const paragraphs = mainContent.querySelectorAll('p');
  const summaryParagraphs: string[] = [];

  let charCount = 0;
  const maxChars = 800; // Keep summary concise for voice

  Array.from(paragraphs).forEach(p => {
    if (charCount >= maxChars) return;
    const text = p.textContent?.trim();
    if (text && text.length > 20) { // Skip very short paragraphs
      summaryParagraphs.push(text);
      charCount += text.length;
    }
  });

  const summary = summaryParagraphs.join(' ').substring(0, maxChars);

  // Extract sections with their content
  const sections: { heading: string; content: string }[] = [];
  const sectionElements = mainContent.querySelectorAll('section, [class*="section"]');

  sectionElements.forEach(section => {
    const sectionHeading = section.querySelector('h2, h3')?.textContent?.trim();
    if (sectionHeading) {
      const sectionContent = Array.from(section.querySelectorAll('p'))
        .map(p => p.textContent?.trim())
        .filter(Boolean)
        .join(' ')
        .substring(0, 300);

      sections.push({ heading: sectionHeading, content: sectionContent });
    }
  });

  return { title, headings, summary, sections };
}

/**
 * Register documentation actions on the widget
 */
function registerDocsActions(target: { registerAction: Function }): void {
  // Navigate to specific heading/section
  target.registerAction(
    'navigateToHeading',
    {
      description: 'Scroll to and highlight a specific section or heading on the current page. Use when the user wants to jump to a particular topic within the current document.',
      parameters: {
        headingQuery: {
          type: 'string',
          description: 'The heading text or topic to navigate to (e.g., "Installation", "Configuration options", "API reference")',
        },
      },
    },
    async ({ headingQuery }: { headingQuery: string }) => {
      const heading = findHeading(headingQuery);

      if (heading) {
        // Navigate to the heading anchor
        window.location.hash = heading.id;

        // Also scroll to ensure it's visible (in case hash navigation is delayed)
        const element = document.getElementById(heading.id);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          // Add temporary highlight
          element.classList.add('voweldocs-highlight');
          setTimeout(() => element.classList.remove('voweldocs-highlight'), 3000);
        }

        return {
          success: true,
          message: `Jumped to section: "${heading.text}"`,
          heading,
        };
      }

      // List available headings
      const allHeadings = extractPageHeadings();
      const suggestions = allHeadings
        .filter(h => h.text.toLowerCase().includes(headingQuery.toLowerCase().slice(0, 3)))
        .slice(0, 5);

      return {
        success: false,
        message: `Section "${headingQuery}" not found on this page. ${suggestions.length > 0 ? `Similar sections: ${suggestions.map(h => `"${h.text}"`).join(', ')}` : 'Ask for "list headings" to see available sections.'}`,
        availableHeadings: allHeadings.slice(0, 10),
      };
    }
  );

  // Get current page info
  target.registerAction(
    'getCurrentPage',
    {
      description: 'Get information about the current documentation page including title, path, and available sections.',
      parameters: {},
    },
    async () => {
      const title = document.querySelector('h1')?.textContent?.trim() ||
        document.title?.replace(' | EmDash Docs', '') ||
        'Unknown page';
      const path = window.location.pathname;
      const headings = extractPageHeadings();

      return {
        success: true,
        title,
        path,
        headings: headings.slice(0, 10),
        headingCount: headings.length,
        message: `You are currently on "${title}" at ${path}. This page has ${headings.length} sections.`,
      };
    }
  );

  // List available headings on current page
  target.registerAction(
    'listHeadings',
    {
      description: 'List all available sections (headings) on the current page that can be navigated to.',
      parameters: {},
    },
    async () => {
      const headings = extractPageHeadings();

      if (headings.length === 0) {
        return {
          success: true,
          headings: [],
          message: 'No sections available on this page.',
        };
      }

      const h2Headings = headings.filter(h => h.level === 2);
      const h3Headings = headings.filter(h => h.level === 3);

      return {
        success: true,
        headings: headings.slice(0, 15),
        summary: {
          total: headings.length,
          h2: h2Headings.length,
          h3: h3Headings.length,
        },
        message: `This page has ${headings.length} sections: ${h2Headings.map(h => `"${h.text}"`).join(', ')}${h3Headings.length > 0 ? `, and ${h3Headings.length} subsections.` : '.'}`,
      };
    }
  );

  // ==========================================================================
  // Discovery Actions
  // ==========================================================================

  // List available sections/categories with actual pages
  target.registerAction(
    'listSections',
    {
      description: 'List available documentation categories and their pages. Use to show users what documentation is available.',
      parameters: {
        category: {
          type: 'string',
          description: 'Category filter such as "guides", "plugins", "reference", or "deployment". Use "none" to include all categories.',
        },
        pageMode: {
          type: 'string',
          description: 'Use "pages" to include page listings or "none" to return only category summaries.',
          enum: ['pages', 'none'],
        },
      },
    },
    async ({ category, pageMode }: { category: string; pageMode: 'pages' | 'none' }) => {
      const structure = getDocsStructure();
      const normalizedCategory = category.trim().toLowerCase();
      const includePages = pageMode === 'pages';

      if (normalizedCategory !== 'none') {
        const matchedCategory = structure.find(
          s => s.category.toLowerCase().includes(normalizedCategory)
        );

        if (matchedCategory) {
          return {
            success: true,
            category: matchedCategory.category,
            pages: includePages ? matchedCategory.pages.slice(0, 10) : undefined,
            pageCount: matchedCategory.pages.length,
            message: `${matchedCategory.category} has ${matchedCategory.pages.length} pages${includePages ? `: ${matchedCategory.pages.slice(0, 5).map(p => `"${p.title}"`).join(', ')}${matchedCategory.pages.length > 5 ? ' and more.' : '.'}` : '.'}`,
          };
        }

        return {
          success: false,
          message: `Category "${category}" not found. Available categories: ${structure.map(s => s.category).join(', ')}`,
          availableCategories: structure.map(s => s.category),
        };
      }

      // Return all categories
      const categories = structure.map(s => ({
        name: s.category,
        pageCount: s.pages.length,
        samplePages: includePages ? s.pages.slice(0, 3).map(p => p.title) : undefined,
      }));

      return {
        success: true,
        categories,
        totalPages: structure.reduce((sum, s) => sum + s.pages.length, 0),
        message: `Documentation has ${structure.length} categories with ${structure.reduce((sum, s) => sum + s.pages.length, 0)} total pages: ${structure.map(s => `${s.category} (${s.pages.length} pages)`).join(', ')}.`,
      };
    }
  );

  // ==========================================================================
  // Content Actions
  // ==========================================================================

  // Summarize current page for voice reading
  target.registerAction(
    'summarizePage',
    {
      description: 'Get a summary of the current page content for voice reading. Returns the page title, main points, and a brief summary.',
      parameters: {
        detail: {
          type: 'string',
          description: 'Level of detail. Use "none" for the default summary, or choose "brief", "medium", or "full".',
          enum: ['none', 'brief', 'medium', 'full'],
        },
      },
    },
    async ({ detail }: { detail: 'none' | 'brief' | 'medium' | 'full' }) => {
      const content = extractPageContent();
      const headings = extractPageHeadings();
      const effectiveDetail = detail === 'none' ? 'brief' : detail;

      let summaryText: string;
      let maxChars: number;

      switch (effectiveDetail) {
        case 'full':
          maxChars = 2000;
          break;
        case 'medium':
          maxChars = 1200;
          break;
        case 'brief':
        default:
          maxChars = 500;
      }

      summaryText = content.summary.substring(0, maxChars);
      if (content.summary.length > maxChars) {
        summaryText += '...';
      }

      const mainPoints = headings
        .filter(h => h.level === 2)
        .slice(0, 5)
        .map(h => h.text);

      return {
        success: true,
        title: content.title,
        summary: summaryText,
        mainPoints,
        sectionCount: headings.filter(h => h.level === 2).length,
        message: `Here's a summary of "${content.title}": ${summaryText} Main topics covered: ${mainPoints.join(', ')}.`,
      };
    }
  );

  // Read specific section
  target.registerAction(
    'readSection',
    {
      description: 'Extract and return the content of a specific section by heading name for voice reading.',
      parameters: {
        sectionName: {
          type: 'string',
          description: 'The heading name or topic of the section to read (e.g., "Installation", "API Usage")',
        },
      },
    },
    async ({ sectionName }: { sectionName: string }) => {
      const heading = findHeading(sectionName);

      if (!heading) {
        const allHeadings = extractPageHeadings();
        return {
          success: false,
          message: `Section "${sectionName}" not found. Available sections: ${allHeadings.filter(h => h.level === 2).slice(0, 5).map(h => `"${h.text}"`).join(', ')}`,
          availableSections: allHeadings.filter(h => h.level === 2).slice(0, 10),
        };
      }

      // Find the content between this heading and the next
      const element = document.getElementById(heading.id);
      if (!element) {
        return {
          success: false,
          message: `Could not find content for section "${heading.text}".`,
        };
      }

      // Get content until next heading of same or higher level
      let content = '';
      let current: Element | null = element.nextElementSibling;

      while (current && !['H2', 'H3'].includes(current.tagName)) {
        if (current.tagName === 'P' || current.tagName === 'LI') {
          content += current.textContent?.trim() + ' ';
        }
        current = current.nextElementSibling;
      }

      content = content.trim().substring(0, 1000);

      return {
        success: true,
        section: heading.text,
        content: content || 'No text content found in this section.',
        message: `Reading section "${heading.text}": ${content || 'This section appears to contain code examples or other non-text content.'}`,
      };
    }
  );

  // ==========================================================================
  // Utility Actions
  // ==========================================================================

  // Go back/forward in browser history
  target.registerAction(
    'browserHistory',
    {
      description: 'Navigate browser history backward or forward. Use when user says "go back", "previous page", or "forward".',
      parameters: {
        direction: {
          type: 'string',
          description: 'Direction to navigate: "back" or "forward"',
        },
      },
    },
    async ({ direction }: { direction: 'back' | 'forward' }) => {
      if (direction === 'back') {
        window.history.back();
        return { success: true, message: 'Going back to the previous page.' };
      } else if (direction === 'forward') {
        window.history.forward();
        return { success: true, message: 'Going forward to the next page.' };
      }
      return { success: false, message: 'Invalid direction. Use "back" or "forward".' };
    }
  );
}

/**
 * Get or create the persistent widget host element.
 * Uses Astro's transition:persist mechanism to survive page navigations.
 */
function getOrCreateWidgetHost(): HTMLElement {
  // Check if host already exists
  let host = document.getElementById('voweldocs-widget-host');
  if (host) {
    (window as any).__vowelAudioHost = host;
    return host;
  }

  // Create the host element with Astro transition persistence attributes
  host = document.createElement('div');
  host.id = 'voweldocs-widget-host';
  // Astro transition:persist directive - keeps element alive during navigation
  host.setAttribute('transition:persist', '');
  // Data attribute for Astro to identify this as a persistent element
  host.setAttribute('data-astro-transition-persist', 'voweldocs-widget-host');
  // Style to ensure it stays fixed and visible across all pages
  host.style.cssText = `
    position: fixed;
    z-index: 9999;
    pointer-events: none;
    inset: 0;
    display: flex;
    align-items: flex-end;
    justify-content: flex-end;
    padding: 1.5rem;
  `;

  // Append to body so it survives header swaps
  document.body.appendChild(host);
  (window as any).__vowelAudioHost = host;
  console.log('[voweldocs] Created persistent widget host with transition:persist');
  return host;
}

function buildVoiceContext(): Record<string, unknown> {
  const title = document.querySelector('h1')?.textContent?.trim() ||
    document.title?.replace(' | EmDash Docs', '') ||
    'Unknown page';

  return {
    page: {
      title,
      path: window.location.pathname,
      headings: extractPageHeadings().slice(0, 15),
      summary: extractPageContent().summary,
    },
    docs: {
      categories: getDocsStructure().map((section) => section.category),
    },
  };
}

/**
 * Initialize the voice agent with stored configuration
 */
async function initializeVoiceWidget(): Promise<void> {
  const config = getStoredConfig();
  if (!config) {
    console.log('[voweldocs] No configuration found. Use the voice button to configure.');
    return;
  }

  try {
    const voiceConfig = buildVoiceConfig(config);
    console.log('[voweldocs] Voice config built:', { 
      hasAppId: !!(voiceConfig as any).appId, 
      hasToken: !!voiceConfig._voiceConfig?.token,
      provider: voiceConfig._voiceConfig?.provider 
    });

    const widgetHost = getOrCreateWidgetHost();

    await initializeVoiceAgent({
      host: widgetHost,
      config: voiceConfig,
      configKey: JSON.stringify(config),
      registerActions: registerDocsActions,
      navigate: astroNavigate,
      getCurrentPath: () => window.location.pathname,
      getRoutes: () =>
        extractRoutesFromSidebar().map((route) => ({
          path: toAbsoluteDocsUrl(route.path),
          description: route.description ?? `${route.title} in ${route.category}. URL: ${toAbsoluteDocsUrl(route.path)}`,
          metadata: {
            title: route.title,
            category: route.category,
            url: toAbsoluteDocsUrl(route.path),
          },
        })),
      getContext: buildVoiceContext,
      context: buildVoiceContext(),
    });

    console.log('[voweldocs] Voice agent initialization complete');
  } catch (error) {
    console.error('[voweldocs] Failed to initialize voice agent:', error);
    // Show error in UI if button exists
    const btn = document.getElementById('voweldocs-config-btn');
    if (btn) {
      btn.style.borderColor = '#ef4444';
      btn.title = `Voice agent failed to load: ${(error as Error).message}`;
    }
  }
}

/**
 * Clean up the voice widget
 */
function cleanupVoiceWidget(): void {
  void cleanupVoiceAgent();
}

function ensureConfigButtonStyles(): void {
  if (document.getElementById('voweldocs-config-styles')) return;

  const style = document.createElement('style');
  style.id = 'voweldocs-config-styles';
  // Astro transition:persist - keeps styles during navigation
  style.setAttribute('transition:persist', '');
  style.setAttribute('data-astro-transition-persist', 'voweldocs-config-styles');
  style.textContent = `
    /* Highlight animation for section navigation */
    @keyframes voweldocs-pulse-highlight {
      0%, 100% {
        background-color: rgba(99, 102, 241, 0.1);
        box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4);
      }
      50% {
        background-color: rgba(99, 102, 241, 0.2);
        box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.2);
      }
    }

    .voweldocs-highlight {
      animation: voweldocs-pulse-highlight 2s ease-in-out;
      border-radius: 4px;
      transition: background-color 0.3s ease;
    }

    /* Ensure smooth scrolling for navigation */
    html {
      scroll-behavior: smooth;
    }

    #voweldocs-widget-host > * {
      pointer-events: auto;
    }

    /* Pulse animation for config button */
    @keyframes voweldocs-glow-pulse {
      0%, 100% {
        box-shadow: 0 0 4px rgba(99, 102, 241, 0.5), 0 0 8px rgba(99, 102, 241, 0.35), 0 0 12px rgba(99, 102, 241, 0.2);
      }
      50% {
        box-shadow: 0 0 6px rgba(99, 102, 241, 0.7), 0 0 12px rgba(99, 102, 241, 0.5), 0 0 18px rgba(99, 102, 241, 0.3);
      }
    }
    .voweldocs-header-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.35rem 0.6rem;
      background: transparent;
      border: 1px solid var(--sl-color-gray-5, #e2e8f0);
      border-radius: 0.4rem;
      color: var(--sl-color-text, #334155);
      font-size: 0.75rem;
      cursor: pointer;
      transition: all 0.2s ease;
      font-family: 'Courier New', monospace;
      font-weight: 500;
      line-height: 1;
      white-space: nowrap;
      margin-right: 0.5rem;
      animation: voweldocs-glow-pulse 3s ease-in-out infinite;
    }
    .voweldocs-header-btn:hover {
      background: var(--sl-color-gray-6, #f1f5f9);
      border-color: var(--sl-color-gray-4, #cbd5e1);
      animation: none;
      box-shadow: 0 0 8px rgba(99, 102, 241, 0.6), 0 0 16px rgba(99, 102, 241, 0.4), 0 0 24px rgba(99, 102, 241, 0.25);
    }
    .voweldocs-header-btn.has-config {
      color: var(--sl-color-accent, #3b82f6);
      border-color: var(--sl-color-accent, #3b82f6);
    }
    .voweldocs-header-btn svg {
      flex-shrink: 0;
    }
    .voweldocs-header-btn .voweldocs-checkmark {
      display: none;
      stroke: #8b5cf6;
    }
    .voweldocs-header-btn.has-config .voweldocs-checkmark {
      display: inline-flex;
    }
    :root[data-theme="dark"] .voweldocs-header-btn {
      border-color: var(--sl-color-gray-5, #334155);
      color: var(--sl-color-text, #94a3b8);
    }
    :root[data-theme="dark"] .voweldocs-header-btn:hover {
      background: var(--sl-color-gray-6, #1e293b);
      border-color: var(--sl-color-gray-4, #475569);
    }
  `;
  document.head.appendChild(style);
}

// Listen for configuration changes from the dialog
window.addEventListener('voweldocs:config-saved', () => {
  console.log('[voweldocs] Configuration saved, initializing...');
  cleanupVoiceWidget();
  initializeVoiceWidget();
});

window.addEventListener('voweldocs:config-cleared', () => {
  console.log('[voweldocs] Configuration cleared, cleaning up...');
  cleanupVoiceWidget();
});

// ==========================================
// CONFIG DIALOG INJECTION
// ==========================================

/**
 * Inject the voice configuration button into the Starlight header's right-group
 * This places it in the navigation bar alongside theme select and social icons.
 * Uses retry logic to handle Astro's client-side navigation timing.
 */
function injectConfigButton(attempt = 0): void {
  // Check if already injected (idempotent)
  if (document.getElementById('voweldocs-config-btn')) {
    console.log('[voweldocs] Config button already exists, skipping injection');
    return;
  }

  // Starlight header structure: .header > .title-wrapper, .sl-flex (search), .right-group
  // The right-group contains: .social-icons, ThemeSelect, LanguageSelect
  // We want to insert the button at the START of right-group (before social icons)
  const rightGroup = document.querySelector('.right-group');
  const socialIcons = document.querySelector('.social-icons');
  const header = document.querySelector('.header') || document.querySelector('header');

  // If header elements not found and we haven't exceeded max retries, try again
  const maxAttempts = 10;
  const retryDelay = 50; // ms

  if (!rightGroup && !header) {
    if (attempt < maxAttempts) {
      console.log(`[voweldocs] Header not ready yet, retrying injection (attempt ${attempt + 1}/${maxAttempts})...`);
      setTimeout(() => injectConfigButton(attempt + 1), retryDelay);
    } else {
      console.warn('[voweldocs] Could not find header to inject config button after max retries');
    }
    return;
  }

  ensureConfigButtonStyles();

  // Create the button
  const btn = document.createElement('button');
  btn.id = 'voweldocs-config-btn';
  btn.className = 'voweldocs-header-btn';
  btn.setAttribute('aria-label', 'Talk to the EmDash CMS docs');
  btn.setAttribute('title', 'Talk to the EmDash CMS docs');
  btn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
      <line x1="12" x2="12" y1="19" y2="22"/>
    </svg>
    <span>voweldocs</span>
    <svg class="voweldocs-checkmark" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  `;

  // Update button state based on config
  if (getStoredConfig()) {
    btn.classList.add('has-config');
  }

  // Click handler
  btn.addEventListener('click', openConfigModal);

  // Insert into right-group at the beginning (before social icons)
  if (rightGroup) {
    // Insert as first child of right-group, before social icons
    rightGroup.insertBefore(btn, rightGroup.firstChild);
    console.log('[voweldocs] Config button injected into .right-group');
  } else if (socialIcons && socialIcons.parentElement) {
    // Insert before the social icons container
    socialIcons.parentElement.insertBefore(btn, socialIcons);
    console.log('[voweldocs] Config button injected before social icons');
  } else if (header) {
    // Fallback: append to header
    header.appendChild(btn);
    console.log('[voweldocs] Config button injected into header (fallback)');
  }
}

/**
 * Force re-injection of the config button (for use after Astro page transitions)
 */
function forceReinjectButton(): void {
  // Remove existing button if present
  const existingBtn = document.getElementById('voweldocs-config-btn');
  if (existingBtn) {
    existingBtn.remove();
    console.log('[voweldocs] Removed existing config button for re-injection');
  }
  // Inject fresh
  injectConfigButton(0);
}

/**
 * Create and open the configuration modal
 */
function openConfigModal(): void {
  // Check if modal already exists
  let modal = document.getElementById('voweldocs-modal') as HTMLDialogElement | null;

  if (!modal) {
    // Create modal HTML with Astro transition persistence
    modal = document.createElement('dialog');
    modal.id = 'voweldocs-modal';
    modal.className = 'voweldocs-modal';
    // Astro transition:persist - keeps modal state during navigation
    modal.setAttribute('transition:persist', '');
    modal.setAttribute('data-astro-transition-persist', 'voweldocs-modal');
    modal.innerHTML = `
      <div class="voweldocs-modal-content">
        <header class="voweldocs-modal-header">
          <h2>Configure <span style="font-family: 'Courier New', monospace;">voweldocs</span></h2>
          <button type="button" class="voweldocs-close-btn" aria-label="Close">&times;</button>
        </header>

        <div class="voweldocs-modal-body">
          <p class="voweldocs-description">
            Enter your vowel credentials to enable voice navigation.
            Get credentials from <a href="https://vowel.to" target="_blank" rel="noopener">vowel.to</a> or your self-hosted instance.
          </p>

          <div class="voweldocs-mode-toggle" role="tablist">
            <button type="button" class="voweldocs-mode-btn active" data-mode="hosted">Hosted (SaaS)</button>
            <button type="button" class="voweldocs-mode-btn" data-mode="selfhosted">Self-Hosted</button>
          </div>

          <form id="voweldocs-hosted-form" class="voweldocs-form active">
            <div class="voweldocs-form-group">
              <label for="voweldocs-hosted-appid">App ID</label>
              <div class="voweldocs-password-wrapper">
                <input type="password" id="voweldocs-hosted-appid" placeholder="your-app-id" required>
                <button type="button" class="voweldocs-toggle-visibility" aria-label="Show App ID" aria-pressed="false">
                  <svg class="eye-open" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                  <svg class="eye-closed" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: none;">
                    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/>
                    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/>
                    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/>
                    <line x1="2" x2="22" y1="2" y2="22"/>
                  </svg>
                </button>
              </div>
              <span class="voweldocs-hint">Your vowel application ID</span>
            </div>
            <div class="voweldocs-form-actions">
              <button type="submit" class="voweldocs-btn-primary">Save & Enable</button>
              <button type="button" class="voweldocs-btn-danger voweldocs-remove-btn" style="display:none">Remove</button>
            </div>
          </form>

          <form id="voweldocs-selfhosted-form" class="voweldocs-form">
            <!-- JWT Mode Section: shown by default or when PUBLIC_VOWEL_USE_JWT is not 'false' -->
            <div id="voweldocs-jwt-section" class="voweldocs-mode-section">
              <div class="voweldocs-form-group">
                <label for="voweldocs-self-jwt">JWT Token</label>
                <textarea id="voweldocs-self-jwt" rows="3" placeholder="eyJhbGciOiJIUzI1NiIs..."></textarea>
                <span class="voweldocs-hint">Server-signed JWT token. URL is auto-detected from the payload.</span>
              </div>
              <div class="voweldocs-form-group voweldocs-readonly-field" id="voweldocs-jwt-url-group" style="display:none;">
                <label>Detected Realtime URL</label>
                <div class="voweldocs-readonly-value"><code id="voweldocs-jwt-url">-</code></div>
                <span class="voweldocs-hint">Extracted from JWT payload</span>
              </div>
            </div>

            <!-- AppID + URL Mode Section: shown when PUBLIC_VOWEL_USE_JWT is 'false' -->
            <div id="voweldocs-appurl-section" class="voweldocs-mode-section" style="display:none;">
              <div class="voweldocs-form-group">
                <label for="voweldocs-self-appid">App ID</label>
                <div class="voweldocs-password-wrapper">
                  <input type="password" id="voweldocs-self-appid" placeholder="your-app-id">
                  <button type="button" class="voweldocs-toggle-visibility" aria-label="Show App ID" aria-pressed="false">
                    <svg class="eye-open" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                    <svg class="eye-closed" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: none;">
                      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/>
                      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/>
                      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/>
                      <line x1="2" x2="22" y1="2" y2="22"/>
                    </svg>
                  </button>
                </div>
                <span class="voweldocs-hint">Your self-hosted application ID</span>
              </div>
              <div class="voweldocs-form-group">
                <label for="voweldocs-self-url">Realtime URL</label>
                <input type="url" id="voweldocs-self-url" placeholder="wss://your-instance.com/realtime">
                <span class="voweldocs-hint">Your self-hosted realtime endpoint</span>
              </div>
            </div>

            <div class="voweldocs-form-actions">
              <button type="submit" class="voweldocs-btn-primary">Save & Enable</button>
              <button type="button" class="voweldocs-btn-danger voweldocs-remove-btn" style="display:none">Remove</button>
            </div>
          </form>

          <div id="voweldocs-message" class="voweldocs-message" role="status"></div>
        </div>

        <footer class="voweldocs-modal-footer">
          <button type="button" class="voweldocs-btn-secondary" id="voweldocs-clear-all" style="display:none">Clear All</button>
          <span class="voweldocs-footer-hint">Credentials stored locally in browser</span>
        </footer>
      </div>
    `;

    // Add modal styles - centered horizontally and vertically using modern dialog centering
    // with Astro transition persistence so they survive page navigation
    const modalStyle = document.createElement('style');
    modalStyle.id = 'voweldocs-modal-styles';
    modalStyle.setAttribute('transition:persist', '');
    modalStyle.setAttribute('data-astro-transition-persist', 'voweldocs-modal-styles');
    modalStyle.textContent = `
      .voweldocs-modal {
        padding: 0;
        border: none;
        border-radius: 12px;
        background: var(--sl-color-bg, white);
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        max-width: 480px;
        width: 90%;
        /* Center the dialog using the recommended approach for top-layer dialogs */
        margin: auto;
        inset: 0;
        position: fixed;
        max-height: 85vh;
        overflow: hidden;
      }
      .voweldocs-modal::backdrop {
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(4px);
      }
      .voweldocs-modal-content {
        display: flex;
        flex-direction: column;
        max-height: 80vh;
      }
      .voweldocs-modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1.25rem 1.5rem;
        border-bottom: 1px solid var(--sl-color-gray-5, #e2e8f0);
      }
      .voweldocs-modal-header h2 {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 600;
        color: var(--sl-color-text, #1e293b);
      }
      .voweldocs-close-btn {
        background: none;
        border: none;
        color: var(--sl-color-gray-3, #64748b);
        cursor: pointer;
        padding: 0.25rem 0.5rem;
        font-size: 1.5rem;
        border-radius: 4px;
        transition: all 0.2s;
      }
      .voweldocs-close-btn:hover {
        color: var(--sl-color-text, #1e293b);
        background: var(--sl-color-gray-6, #f1f5f9);
      }
      .voweldocs-modal-body {
        padding: 1.5rem;
        overflow-y: auto;
      }
      .voweldocs-description {
        margin: 0 0 1.25rem;
        font-size: 0.875rem;
        line-height: 1.5;
        color: var(--sl-color-gray-2, #475569);
      }
      .voweldocs-description a {
        color: var(--sl-color-accent, #3b82f6);
        text-decoration: none;
      }
      .voweldocs-description a:hover {
        text-decoration: underline;
      }
      .voweldocs-mode-toggle {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 1.25rem;
        background: var(--sl-color-gray-6, #f1f5f9);
        padding: 0.25rem;
        border-radius: 8px;
      }
      .voweldocs-mode-btn {
        flex: 1;
        padding: 0.625rem 1rem;
        border: none;
        background: transparent;
        color: var(--sl-color-gray-2, #475569);
        font-size: 0.875rem;
        font-weight: 500;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s;
      }
      .voweldocs-mode-btn.active {
        background: var(--sl-color-bg, white);
        color: var(--sl-color-accent, #3b82f6);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      }
      .voweldocs-form {
        display: none;
      }
      .voweldocs-form.active {
        display: block;
      }
      .voweldocs-form-group {
        margin-bottom: 1rem;
      }
      .voweldocs-form-group label {
        display: block;
        font-size: 0.875rem;
        font-weight: 500;
        color: var(--sl-color-text, #1e293b);
        margin-bottom: 0.375rem;
      }
      .voweldocs-form-group input,
      .voweldocs-form-group textarea {
        width: 100%;
        padding: 0.625rem 0.875rem;
        border: 1px solid var(--sl-color-gray-5, #e2e8f0);
        border-radius: 6px;
        background: var(--sl-color-bg, white);
        color: var(--sl-color-text, #1e293b);
        font-size: 0.875rem;
        transition: border-color 0.2s, box-shadow 0.2s;
        font-family: inherit;
        box-sizing: border-box;
      }
      .voweldocs-form-group input:focus,
      .voweldocs-form-group textarea:focus {
        outline: none;
        border-color: var(--sl-color-accent, #3b82f6);
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
      }
      .voweldocs-form-group textarea {
        resize: vertical;
        font-family: 'Courier New', monospace;
        font-size: 0.8125rem;
      }
      .voweldocs-hint {
        display: block;
        margin-top: 0.375rem;
        font-size: 0.75rem;
        color: var(--sl-color-gray-3, #64748b);
      }
      .voweldocs-password-wrapper {
        position: relative;
        display: flex;
        align-items: center;
      }
      .voweldocs-password-wrapper input {
        padding-right: 2.75rem;
        width: 100%;
      }
      .voweldocs-toggle-visibility {
        position: absolute;
        right: 0.5rem;
        top: 50%;
        transform: translateY(-50%);
        background: transparent;
        border: none;
        padding: 0.375rem;
        cursor: pointer;
        color: var(--sl-color-gray-3, #64748b);
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: all 0.2s;
      }
      .voweldocs-toggle-visibility:hover {
        color: var(--sl-color-text, #1e293b);
        background: var(--sl-color-gray-6, #f1f5f9);
      }
      .voweldocs-form-actions {
        margin-top: 1.25rem;
        display: flex;
        gap: 0.75rem;
      }
      .voweldocs-btn-primary {
        flex: 1;
        padding: 0.75rem 1rem;
        background: var(--sl-color-accent, #3b82f6);
        color: white;
        border: none;
        border-radius: 6px;
        font-size: 0.875rem;
        font-weight: 600;
        cursor: pointer;
        transition: opacity 0.2s;
      }
      .voweldocs-btn-primary:hover {
        opacity: 0.9;
      }
      .voweldocs-btn-danger {
        padding: 0.75rem 1rem;
        background: transparent;
        color: #ef4444;
        border: 1px solid #ef4444;
        border-radius: 6px;
        font-size: 0.875rem;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.2s;
      }
      .voweldocs-btn-danger:hover {
        background: rgba(239, 68, 68, 0.1);
      }
      .voweldocs-message {
        margin-top: 1rem;
        padding: 0.75rem 1rem;
        border-radius: 6px;
        font-size: 0.875rem;
        display: none;
      }
      .voweldocs-message.error {
        display: block;
        background: rgba(239, 68, 68, 0.1);
        color: #ef4444;
      }
      .voweldocs-message.success {
        display: block;
        background: rgba(34, 197, 94, 0.1);
        color: #22c55e;
      }
      .voweldocs-modal-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1rem 1.5rem;
        border-top: 1px solid var(--sl-color-gray-5, #e2e8f0);
        background: var(--sl-color-gray-6, #f1f5f9);
        border-radius: 0 0 12px 12px;
      }
      .voweldocs-btn-secondary {
        padding: 0.5rem 0.875rem;
        background: transparent;
        color: var(--sl-color-gray-3, #64748b);
        border: 1px solid var(--sl-color-gray-5, #e2e8f0);
        border-radius: 6px;
        font-size: 0.8125rem;
        cursor: pointer;
        transition: all 0.2s;
      }
      .voweldocs-btn-secondary:hover {
        color: #ef4444;
        border-color: #ef4444;
      }
      .voweldocs-footer-hint {
        font-size: 0.75rem;
        color: var(--sl-color-gray-3, #64748b);
      }
    `;
    document.head.appendChild(modalStyle);

    // Add to body
    document.body.appendChild(modal);

    // Setup event listeners
    setupModalListeners(modal);
  }

  // Load existing config
  loadModalConfig();

  // Show modal
  modal.showModal();
}

/**
 * Setup event listeners for the modal
 */
function setupModalListeners(modal: HTMLDialogElement): void {
  // Close button
  const closeBtn = modal.querySelector('.voweldocs-close-btn');
  closeBtn?.addEventListener('click', () => modal.close());

  // Click outside to close
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.close();
  });

  // Password visibility toggle
  modal.querySelectorAll('.voweldocs-toggle-visibility').forEach(btn => {
    btn.addEventListener('click', () => {
      const wrapper = btn.closest('.voweldocs-password-wrapper');
      const input = wrapper?.querySelector('input');
      const isPressed = btn.getAttribute('aria-pressed') === 'true';

      if (input) {
        input.type = isPressed ? 'password' : 'text';
      }

      btn.setAttribute('aria-pressed', (!isPressed).toString());
      const open = btn.querySelector('.eye-open') as HTMLElement;
      const closed = btn.querySelector('.eye-closed') as HTMLElement;

      if (open && closed) {
        open.style.display = isPressed ? 'block' : 'none';
        closed.style.display = isPressed ? 'none' : 'block';
      }
    });
  });

  // Mode toggle
  const modeBtns = modal.querySelectorAll('.voweldocs-mode-btn');
  modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.getAttribute('data-mode') as ConfigMode;

      // Update active state
      modeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Show/hide forms
      const hostedForm = modal.querySelector('#voweldocs-hosted-form');
      const selfhostedForm = modal.querySelector('#voweldocs-selfhosted-form');

      hostedForm?.classList.toggle('active', mode === 'hosted');
      selfhostedForm?.classList.toggle('active', mode === 'selfhosted');

      // Update UI
      updateModalUI();
    });
  });

  // Hosted form submit
  const hostedForm = modal.querySelector('#voweldocs-hosted-form') as HTMLFormElement;
  hostedForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    saveHostedConfig();
  });

  // Self-hosted form submit
  const selfhostedForm = modal.querySelector('#voweldocs-selfhosted-form') as HTMLFormElement;
  selfhostedForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    saveSelfHostedConfig();
  });

  // Remove buttons
  modal.querySelectorAll('.voweldocs-remove-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const currentMode = modal.querySelector('.voweldocs-mode-btn.active')?.getAttribute('data-mode') as ConfigMode;
      if (confirm(`Remove your ${currentMode === 'hosted' ? 'Hosted (SaaS)' : 'Self-Hosted'} configuration?`)) {
        removeModeConfig(currentMode);
      }
    });
  });

  // Clear all button
  const clearAllBtn = modal.querySelector('#voweldocs-clear-all');
  clearAllBtn?.addEventListener('click', () => {
    if (confirm('Clear all saved configuration? This will disable the voice agent.')) {
      clearAllConfig();
    }
  });
}

/**
 * Load configuration into modal forms
 */
function loadModalConfig(): void {
  const config = getStoredConfig();
  const modal = document.getElementById('voweldocs-modal');
  if (!modal) return;

  if (config) {
    if (config.mode === 'hosted' && config.hosted) {
      const input = modal.querySelector('#voweldocs-hosted-appid') as HTMLInputElement;
      if (input) input.value = config.hosted.appId || '';

      // Set hosted mode active
      const hostedBtn = modal.querySelector('[data-mode="hosted"]');
      hostedBtn?.classList.add('active');
      const selfhostedBtn = modal.querySelector('[data-mode="selfhosted"]');
      selfhostedBtn?.classList.remove('active');

      const hostedForm = modal.querySelector('#voweldocs-hosted-form');
      const selfhostedForm = modal.querySelector('#voweldocs-selfhosted-form');
      hostedForm?.classList.add('active');
      selfhostedForm?.classList.remove('active');
    } else if (config.mode === 'selfhosted' && config.selfHosted) {
      const appIdInput = modal.querySelector('#voweldocs-self-appid') as HTMLInputElement;
      const urlInput = modal.querySelector('#voweldocs-self-url') as HTMLInputElement;
      const jwtInput = modal.querySelector('#voweldocs-self-jwt') as HTMLTextAreaElement;

      if (appIdInput) appIdInput.value = config.selfHosted.appId || '';
      if (urlInput) urlInput.value = config.selfHosted.url || '';
      if (jwtInput) jwtInput.value = config.selfHosted.jwt || '';

      // Set selfhosted mode active
      const hostedBtn = modal.querySelector('[data-mode="hosted"]');
      hostedBtn?.classList.remove('active');
      const selfhostedBtn = modal.querySelector('[data-mode="selfhosted"]');
      selfhostedBtn?.classList.add('active');

      const hostedForm = modal.querySelector('#voweldocs-hosted-form');
      const selfhostedForm = modal.querySelector('#voweldocs-selfhosted-form');
      hostedForm?.classList.remove('active');
      selfhostedForm?.classList.add('active');
    }
  }

  // Setup self-hosted form display mode based on env var
  setupSelfHostedMode();

  updateModalUI();
}

/**
 * Check if JWT mode is enabled (default: true unless explicitly set to 'false')
 */
function isJwtMode(): boolean {
  // Check for env var - in browser, check for a global or window property
  // Astro public env vars use PUBLIC_ prefix
  if (typeof window !== 'undefined' && (window as any).__VOWEL_CONFIG__) {
    const useJwt = (window as any).__VOWEL_CONFIG__.PUBLIC_VOWEL_USE_JWT;
    // Handle both string "false" and boolean false
    const isJwt = useJwt !== 'false' && useJwt !== false;
    console.log('[voweldocs] JWT mode check from window.__VOWEL_CONFIG__:', useJwt, '-> isJwt:', isJwt);
    return isJwt;
  }
  // Check for the voweldocs-use-jwt meta tag from Head.astro
  const metaJwt = document.querySelector('meta[name="voweldocs-use-jwt"]');
  if (metaJwt) {
    const useJwt = metaJwt.getAttribute('content');
    const isJwt = useJwt !== 'false' && useJwt !== false;
    console.log('[voweldocs] JWT mode check from meta[name="voweldocs-use-jwt"]:', useJwt, '-> isJwt:', isJwt);
    return isJwt;
  }
  // Also check if there's a meta tag with JSON config (fallback)
  const metaConfig = document.querySelector('meta[name="vowel-config"]');
  if (metaConfig) {
    try {
      const config = JSON.parse(metaConfig.getAttribute('content') || '{}');
      if (config.PUBLIC_VOWEL_USE_JWT !== undefined) {
        const useJwt = config.PUBLIC_VOWEL_USE_JWT;
        const isJwt = useJwt !== 'false' && useJwt !== false;
        console.log('[voweldocs] JWT mode check from meta[name="vowel-config"]:', useJwt, '-> isJwt:', isJwt);
        return isJwt;
      }
    } catch {
      // Ignore parse errors
    }
  }
  console.log('[voweldocs] JWT mode check: defaulting to true (no config found)');
  // Default to JWT mode
  return true;
}

/**
 * Setup self-hosted form display mode based on env var (default: JWT mode)
 */
function setupSelfHostedMode(): void {
  const jwtSection = document.getElementById('voweldocs-jwt-section');
  const appUrlSection = document.getElementById('voweldocs-appurl-section');

  if (!jwtSection || !appUrlSection) {
    console.log('[voweldocs] setupSelfHostedMode: sections not found', { jwtSection: !!jwtSection, appUrlSection: !!appUrlSection });
    return;
  }

  const useJwt = isJwtMode();
  console.log('[voweldocs] setupSelfHostedMode: useJwt =', useJwt);

  if (useJwt) {
    // JWT mode (default): show JWT section, hide AppID+URL section completely
    jwtSection.style.display = 'block';
    appUrlSection.style.display = 'none';
    console.log('[voweldocs] Showing JWT section, hiding AppID+URL section');
  } else {
    // AppID+URL mode: hide JWT section, show AppID+URL section
    jwtSection.style.display = 'none';
    appUrlSection.style.display = 'block';
    console.log('[voweldocs] Hiding JWT section, showing AppID+URL section');
  }
}

/**
 * Update modal UI based on state
 */
function updateModalUI(): void {
  const modal = document.getElementById('voweldocs-modal');
  if (!modal) return;

  const config = getStoredConfig();
  const hasConfig = !!config;
  const currentMode = modal.querySelector('.voweldocs-mode-btn.active')?.getAttribute('data-mode');

  // Show/hide remove buttons
  const isHostedMode = currentMode === 'hosted';
  const hostedRemove = modal.querySelector('#voweldocs-hosted-form .voweldocs-remove-btn') as HTMLElement;
  const selfhostedRemove = modal.querySelector('#voweldocs-selfhosted-form .voweldocs-remove-btn') as HTMLElement;

  if (hostedRemove) {
    hostedRemove.style.display = (hasConfig && config?.mode === 'hosted') ? 'inline-block' : 'none';
  }
  if (selfhostedRemove) {
    selfhostedRemove.style.display = (hasConfig && config?.mode === 'selfhosted') ? 'inline-block' : 'none';
  }

  // Show/hide clear all
  const clearAllBtn = modal.querySelector('#voweldocs-clear-all') as HTMLElement;
  if (clearAllBtn) {
    clearAllBtn.style.display = hasConfig ? 'inline-block' : 'none';
  }
}

/**
 * Save hosted configuration
 */
function saveHostedConfig(): void {
  const modal = document.getElementById('voweldocs-modal');
  const appIdInput = modal?.querySelector('#voweldocs-hosted-appid') as HTMLInputElement;
  const appId = appIdInput?.value.trim();

  if (!appId) {
    showModalMessage('Please provide an App ID', 'error');
    return;
  }

  const config: StoredCredentials = {
    mode: 'hosted',
    hosted: { appId },
    timestamp: Date.now(),
  };

  saveConfigAndInit(config);
}

/**
 * Save self-hosted configuration
 */
function saveSelfHostedConfig(): void {
  const modal = document.getElementById('voweldocs-modal');
  const appIdInput = modal?.querySelector('#voweldocs-self-appid') as HTMLInputElement;
  const urlInput = modal?.querySelector('#voweldocs-self-url') as HTMLInputElement;
  const jwtInput = modal?.querySelector('#voweldocs-self-jwt') as HTMLTextAreaElement;

  const appId = appIdInput?.value.trim();
  const url = urlInput?.value.trim();
  const jwt = jwtInput?.value.trim();

  // Require either appId+url or jwt
  if (!jwt && !(appId && url)) {
    showModalMessage('Please provide either a JWT token, or both App ID and Realtime URL', 'error');
    return;
  }

  const config: StoredCredentials = {
    mode: 'selfhosted',
    selfHosted: jwt ? { jwt } : { appId, url },
    timestamp: Date.now(),
  };

  saveConfigAndInit(config);
}

/**
 * Save configuration and initialize
 */
function saveConfigAndInit(config: StoredCredentials): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    showModalMessage('Configuration saved! Voice agent initializing...', 'success');

    // Update button state
    const btn = document.getElementById('voweldocs-config-btn');
    btn?.classList.add('has-config');

    // Close modal after delay
    setTimeout(() => {
      const modal = document.getElementById('voweldocs-modal') as HTMLDialogElement;
      modal?.close();

      // Initialize voice widget
      window.dispatchEvent(new CustomEvent('voweldocs:config-saved'));
    }, 1500);
  } catch (error) {
    showModalMessage('Failed to save configuration. Storage may be disabled.', 'error');
    console.error('[voweldocs] Error saving config:', error);
  }
}

/**
 * Remove configuration for specific mode
 */
function removeModeConfig(modeToRemove: ConfigMode): void {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;

    const config: StoredCredentials = JSON.parse(stored);

    if (config.mode === modeToRemove) {
      localStorage.removeItem(STORAGE_KEY);
      showModalMessage('Configuration removed. Voice agent disabled.', 'success');

      // Update button state
      const btn = document.getElementById('voweldocs-config-btn');
      btn?.classList.remove('has-config');

      // Dispatch event
      window.dispatchEvent(new CustomEvent('voweldocs:config-cleared'));

      // Clear form fields
      clearFormFields();
    }

    updateModalUI();
  } catch (error) {
    console.error('[voweldocs] Error removing config:', error);
  }
}

/**
 * Clear all configuration
 */
function clearAllConfig(): void {
  localStorage.removeItem(STORAGE_KEY);
  showModalMessage('All configuration cleared. Voice agent disabled.', 'success');

  // Update button state
  const btn = document.getElementById('voweldocs-config-btn');
  btn?.classList.remove('has-config');

  // Dispatch event
  window.dispatchEvent(new CustomEvent('voweldocs:config-cleared'));

  // Clear form fields
  clearFormFields();

  // Close modal after delay
  setTimeout(() => {
    const modal = document.getElementById('voweldocs-modal') as HTMLDialogElement;
    modal?.close();
  }, 1500);
}

/**
 * Clear all form fields
 */
function clearFormFields(): void {
  const modal = document.getElementById('voweldocs-modal');
  if (!modal) return;

  const hostedInput = modal.querySelector('#voweldocs-hosted-appid') as HTMLInputElement;
  const selfAppId = modal.querySelector('#voweldocs-self-appid') as HTMLInputElement;
  const selfUrl = modal.querySelector('#voweldocs-self-url') as HTMLInputElement;
  const selfJwt = modal.querySelector('#voweldocs-self-jwt') as HTMLTextAreaElement;

  if (hostedInput) hostedInput.value = '';
  if (selfAppId) selfAppId.value = '';
  if (selfUrl) selfUrl.value = '';
  if (selfJwt) selfJwt.value = '';
}

/**
 * Show message in modal
 */
function showModalMessage(text: string, type: 'error' | 'success'): void {
  const messageEl = document.getElementById('voweldocs-message');
  if (!messageEl) return;

  messageEl.textContent = text;
  messageEl.className = `voweldocs-message ${type}`;

  setTimeout(() => {
    messageEl.textContent = '';
    messageEl.className = 'voweldocs-message';
  }, 5000);
}

// ==========================================
// INITIALIZATION
// ==========================================

/**
 * Main initialization - inject button and initialize voice if configured
 */
function initVoweldocs(): void {
  // Inject config button into header
  injectConfigButton();

  // Initialize voice widget if configured
  initializeVoiceWidget();
}

// Run on initial page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initVoweldocs);
} else {
  initVoweldocs();
}

// Handle Astro client-side navigation - force reinjection to handle DOM swaps
document.addEventListener('astro:page-load', () => {
  console.log('[voweldocs] Astro page load detected, re-injecting config button...');
  forceReinjectButton();
  initializeVoiceWidget();
  void resumeVoiceAgentPlayback();
});

// Also listen for Astro's after-swap event (fires before page-load, when content is swapped)
document.addEventListener('astro:after-swap', () => {
  console.log('[voweldocs] Astro after-swap detected, preparing for re-injection...');
  // Small delay to ensure DOM is settled
  setTimeout(() => forceReinjectButton(), 10);
  void resumeVoiceAgentPlayback();
});

// Make available globally for debugging
(window as any).voweldocs = {
  getConfig: getStoredConfig,
  reinitialize: initializeVoiceWidget,
  cleanup: cleanupVoiceWidget,
  openConfig: openConfigModal,
};
