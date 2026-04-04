# Framework Exclusions & Workarounds

## Excluded Frameworks

The following documentation frameworks are **not natively compatible** with vowel voice integration:

| Framework | Tech Stack | Reason for Exclusion |
|-----------|-----------|---------------------|
| MkDocs | Python | Pure static HTML generator with no JavaScript runtime for dynamic voice components |
| Sphinx | Python | reStructuredText-focused, static HTML output only |
| mdBook | Rust | Rust-based static site generator for book-style docs, no JavaScript interactivity |
| Hugo | Go | Go templating engine producing static HTML, no client-side JavaScript framework |

## Why These Are Excluded

### Static HTML Generators

These frameworks generate **pure static HTML** at build time with no JavaScript runtime:

- **No DOM manipulation**: Voice agents require a live DOM to interact with elements
- **No JavaScript execution**: Static generators output HTML/CSS only
- **No real-time interactivity**: Voice navigation requires dynamic page updates
- **Build-time only**: Content is frozen at build time, no runtime capabilities

## Future Workaround: vowel-webcomponent

While these frameworks don't support vowel natively, you could potentially add voice integration using `vowel-webcomponent` with the following approaches:

### Option 1: Custom HTML Injection

Inject the vowel web component into the generated HTML templates:

**For MkDocs/Material:**
```html
<!-- In your custom mkdocs theme or extra_javascript -->
<script type="module" src="https://unpkg.com/@vowel.to/webcomponent@latest"></script>
<vowel-voice-widget id="vowel-widget"></vowel-voice-widget>

<script>
  // Initialize after page load
  document.addEventListener('DOMContentLoaded', () => {
    const widget = document.getElementById('vowel-widget');
    // Configure with your appId or JWT
    widget.setAttribute('app-id', 'your-app-id');
    // Or use JWT mode for self-hosted
    // widget.setAttribute('jwt', 'your-jwt-token');
  });
</script>
```

**For Hugo:**
```html
<!-- layouts/partials/vowel-widget.html -->
{{ if .Site.Params.vowel.enabled }}
<script type="module" src="https://unpkg.com/@vowel.to/webcomponent@latest"></script>
<vowel-voice-widget
  app-id="{{ .Site.Params.vowel.appId }}"
  position="bottom-right"
></vowel-voice-widget>
{{ end }}
```

### Option 2: JavaScript Plugin/Extension

Create a plugin that injects the web component:

**MkDocs Plugin Concept:**
```python
# mkdocs_vowel/plugin.py
from mkdocs.plugins import BasePlugin
from mkdocs.config import config_options

class VowelPlugin(BasePlugin):
    config_scheme = (
        ('app_id', config_options.Type(str, default='')),
        ('position', config_options.Type(str, default='bottom-right')),
    )

    def on_post_page(self, output, page, config):
        # Inject vowel widget before closing </body>
        widget_html = f'''
<script type="module" src="https://unpkg.com/@vowel.to/webcomponent@latest"></script>
<vowel-voice-widget app-id="{self.config['app_id']}"></vowel-voice-widget>
'''
        return output.replace('</body>', widget_html + '</body>')
```

### Option 3: CDN Script with Static Routes

Since these frameworks generate static HTML, you would need to manually define routes:

```javascript
// static-routes.js - include in all pages
const DOC_ROUTES = [
  { path: '/', title: 'Home' },
  { path: '/guide/installation', title: 'Installation Guide' },
  { path: '/guide/configuration', title: 'Configuration' },
  // Manually maintain this list
];

// Configure vowel web component with navigation
const widget = document.querySelector('vowel-voice-widget');
widget.addEventListener('ready', () => {
  widget.registerAction('navigate', async ({ path }) => {
    window.location.href = path;
  });
});
```

## Limitations of Static Workarounds

Even with workarounds, static generators have inherent limitations:

| Feature | Static Workaround | Full Framework Integration |
|---------|-------------------|---------------------------|
| Route auto-discovery | Manual route list | Automatic from framework router |
| SPA navigation | Full page reload | Smooth client-side transitions |
| Search integration | Limited (custom implementation) | Native framework search hooks |
| State persistence | LocalStorage only | Framework state management |
| Real-time updates | Not possible | WebSocket/ realtime capable |

## Recommendation

For production voice-enabled documentation, migrate to:

- **VitePress** (Vue) - Fast, modern, excellent developer experience
- **Docusaurus** (React) - Feature-rich, versioning, i18n support
- **Starlight** (Astro) - Lightweight, fast builds, component-friendly

These frameworks provide the JavaScript runtime necessary for full vowel integration with automatic route detection, SPA navigation, and dynamic interactivity.

## See Also

- [`vowel-webcomponent`](../../vowel-webcomponent/SKILL.md) - Framework-agnostic web component skill
- [Framework Comparison](./doc-frameorks.md) - Full documentation framework comparison
- [voweldocs SKILL](./SKILL.md) - Main voweldocs integration guide
