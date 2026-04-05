// Skill reference copy for the packaged Astro/Starlight VowelDocs integration.
// Copy this file as the starting point for `astro.config.mjs`, then adapt only
// project-specific values such as `site`, branding/sidebar content, and repo URLs.
// Preserve the React dedupe/alias pattern and the custom Head/PageFrame wiring.

import starlight from "@astrojs/starlight";
// @ts-check
import { defineConfig } from "astro/config";
import { fileURLToPath } from "node:url";

// Get env var with fallback - checks process.env first (Node.js runtime)
const PUBLIC_VOWEL_USE_JWT = process.env.PUBLIC_VOWEL_USE_JWT ?? 'true';
console.log('[astro-config] PUBLIC_VOWEL_USE_JWT =', PUBLIC_VOWEL_USE_JWT);

const reactPath = fileURLToPath(new URL("./node_modules/react/index.js", import.meta.url));
const reactJsxRuntimePath = fileURLToPath(
	new URL("./node_modules/react/jsx-runtime.js", import.meta.url)
);
const reactJsxDevRuntimePath = fileURLToPath(
	new URL("./node_modules/react/jsx-dev-runtime.js", import.meta.url)
);
const reactDomPath = fileURLToPath(new URL("./node_modules/react-dom/index.js", import.meta.url));
const reactDomClientPath = fileURLToPath(
	new URL("./node_modules/react-dom/client.js", import.meta.url)
);

// https://astro.build/config
export default defineConfig({
	site: "http://localhost:4321",
	vite: {
		resolve: {
			alias: [
				{ find: /^react\/jsx-dev-runtime$/, replacement: reactJsxDevRuntimePath },
				{ find: /^react\/jsx-runtime$/, replacement: reactJsxRuntimePath },
				{ find: /^react-dom\/client$/, replacement: reactDomClientPath },
				{ find: /^react-dom$/, replacement: reactDomPath },
				{ find: /^react$/, replacement: reactPath },
			],
			dedupe: ["react", "react-dom"],
			preserveSymlinks: false,
		},
	},
	integrations: [
		starlight({
			title: "EmDash",
			tagline: "The Astro-native CMS",
			logo: {
				light: "./src/assets/logo-light.svg",
				dark: "./src/assets/logo-dark.svg",
				replacesTitle: true,
			},
			social: [
				{
					icon: "github",
					label: "GitHub",
					href: "https://github.com/withastro/emdash",
				},
				{
					icon: "discord",
					label: "Discord",
					href: "https://astro.build/chat",
				},
			],
			editLink: {
				baseUrl: "https://github.com/withastro/emdash/edit/main/docs/",
			},
			customCss: ["./src/styles/custom.css"],
			components: {
				Head: "./src/components/starlight/Head.astro",
				PageFrame: "./src/components/starlight/PageFrame.astro",
			},
			sidebar: [
				{
					label: "Start Here",
					items: [
						{ label: "Introduction", slug: "introduction" },
						{ label: "Getting Started", slug: "getting-started" },
						{ label: "Why EmDash?", slug: "why-emdash" },
					],
				},
				{
					label: "Coming From...",
					items: [
						{
							label: "EmDash for WordPress Developers",
							slug: "coming-from/wordpress",
						},
						{
							label: "Astro for WordPress Developers",
							slug: "coming-from/astro-for-wp-devs",
						},
						{
							label: "EmDash for Astro Developers",
							slug: "coming-from/astro",
						},
					],
				},
				{
					label: "Guides",
					items: [
						{ label: "Create a Blog", slug: "guides/create-a-blog" },
						{
							label: "Working with Content",
							slug: "guides/working-with-content",
						},
						{ label: "Querying Content", slug: "guides/querying-content" },
						{ label: "Media Library", slug: "guides/media-library" },
						{ label: "Taxonomies", slug: "guides/taxonomies" },
						{ label: "Navigation Menus", slug: "guides/menus" },
						{ label: "Widget Areas", slug: "guides/widgets" },
						{ label: "Page Layouts", slug: "guides/page-layouts" },
						{ label: "Sections", slug: "guides/sections" },
						{ label: "Site Settings", slug: "guides/site-settings" },
						{ label: "Authentication", slug: "guides/authentication" },
						{ label: "AI Tools", slug: "guides/ai-tools" },
						{ label: "Vowel Voice Agent", slug: "guides/vowel-voice-agent" },
						{ label: "x402 Payments", slug: "guides/x402-payments" },
						{ label: "Preview Mode", slug: "guides/preview" },
						{
							label: "Internationalization (i18n)",
							slug: "guides/internationalization",
						},
					],
				},
				{
					label: "Plugins",
					items: [
						{ label: "Plugin Overview", slug: "plugins/overview" },
						{ label: "Creating Plugins", slug: "plugins/creating-plugins" },
						{ label: "Plugin Hooks", slug: "plugins/hooks" },
						{ label: "Plugin Storage", slug: "plugins/storage" },
						{ label: "Plugin Settings", slug: "plugins/settings" },
						{ label: "Admin UI Extensions", slug: "plugins/admin-ui" },
						{ label: "Block Kit", slug: "plugins/block-kit" },
						{ label: "API Routes", slug: "plugins/api-routes" },
						{ label: "Sandbox & Security", slug: "plugins/sandbox" },
						{ label: "Publishing Plugins", slug: "plugins/publishing" },
						{ label: "Installing Plugins", slug: "plugins/installing" },
					],
				},
				{
					label: "Contributing",
					collapsed: true,
					items: [{ label: "Contributor Guide", slug: "contributing" }],
				},

				{
					label: "Themes",
					items: [
						{ label: "Themes Overview", slug: "themes/overview" },
						{
							label: "Creating Themes",
							slug: "themes/creating-themes",
						},
						{ label: "Seed File Format", slug: "themes/seed-files" },
						{
							label: "Porting WordPress Themes",
							slug: "themes/porting-wp-themes",
						},
					],
				},
				{
					label: "Migration",
					items: [
						{
							label: "Migrate from WordPress",
							slug: "migration/from-wordpress",
						},
						{ label: "Content Import", slug: "migration/content-import" },
						{
							label: "Porting WordPress Plugins",
							slug: "migration/porting-plugins",
						},
					],
				},
				{
					label: "Deployment",
					items: [
						{ label: "Deploy to Cloudflare", slug: "deployment/cloudflare" },
						{ label: "Deploy to Node.js", slug: "deployment/nodejs" },
						{ label: "Database Options", slug: "deployment/database" },
						{ label: "Storage Options", slug: "deployment/storage" },
					],
				},
				{
					label: "Concepts",
					collapsed: true,
					items: [
						{ label: "Architecture", slug: "concepts/architecture" },
						{ label: "Collections", slug: "concepts/collections" },
						{ label: "Content Model", slug: "concepts/content-model" },
						{ label: "The Admin Panel", slug: "concepts/admin-panel" },
					],
				},
				{
					label: "Reference",
					collapsed: true,
					items: [
						{ label: "Configuration", slug: "reference/configuration" },
						{ label: "CLI Commands", slug: "reference/cli" },
						{ label: "API Reference", slug: "reference/api" },
						{ label: "Field Types", slug: "reference/field-types" },
						{ label: "Hook Reference", slug: "reference/hooks" },
						{ label: "REST API", slug: "reference/rest-api" },
						{ label: "MCP Server", slug: "reference/mcp-server" },
					],
				},
			],
		}),
	],
});
