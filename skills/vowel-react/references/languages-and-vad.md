# Supported Languages and VAD Modes

## Supported Languages

### STT (Speech-to-Text) Providers

| Provider | Mode | Languages |
|----------|------|-----------|
| **Groq Whisper** | Client VAD (batch mode) | 99+ languages (OpenAI Whisper tokenizer) |
| **AssemblyAI** | Server VAD (streaming) | 6 languages: en, es, fr, de, it, pt |
| **Fennec ASR** | Server VAD (streaming) | Language detection (exact list varies) |

### TTS (Text-to-Speech) – Inworld

**Inworld TTS** is the output engine. It supports **12 languages** with native voices:

| Code | Language |
|------|----------|
| en | English |
| es | Spanish |
| fr | French |
| de | German |
| it | Italian |
| pt | Portuguese |
| ko | Korean |
| zh | Chinese |
| ja | Japanese |
| nl | Dutch |
| pl | Polish |
| ru | Russian |

### Effective Supported Languages

**Of the 99+ Whisper languages, vowel only supports those that Inworld TTS can speak.** If the user speaks a language Whisper supports but Inworld does not, the AI falls back to English voice while still switching language state.

- **Client VAD (Whisper)**: User can speak 99+ languages; AI responds in **12** (Inworld TTS). Unsupported languages fall back to English voice.
- **Server VAD (AssemblyAI)**: User can speak **6** languages; all 6 are supported by Inworld TTS.

Configure `voiceConfig.language` with an ISO 639-1 code (e.g., `en`, `es`, `zh`). For the canonical voice/language matrix, rely on **Vowel Engine** / hosted preset documentation or the `@vowel.to/client` type hints—do not hardcode a second source of truth in app code.

## STT/TTS Provider Override (Dev-Only)

For development and testing, you can override the server-resolved STT and TTS providers via `voiceConfig.stt` and `voiceConfig.tts`. These are `@internal` dev-only fields — in production, the managed preset system resolves the optimal provider stack.

```typescript
voiceConfig: {
  // ... standard config ...
  stt: { provider: 'deepgram' },      // dev override
  tts: { provider: 'deepgram' },      // dev override
}
```

**Supported STT providers:** `deepgram`, `groq-whisper`, `assemblyai`, `fennec`, `modulate`, `grok`, `mistral-voxtral-realtime`, `none` (text-only).

**Supported TTS providers:** `deepgram`, `inworld`, `grok`, `none` (text-only).

The `"none"` provider disables speech I/O — the session operates in text-only mode. Set the server preset to `text-only` for production or use the dev override for testing.

**See also:** `SttOverrideConfig` and `TtsOverrideConfig` types in `@vowel.to/client`.

## VAD (Voice Activity Detection) Modes

Turn detection controls when speech is detected and when the AI responds. Configure via `voiceConfig.turnDetection`.

### Mode Comparison

| Mode | Accuracy | Load Time | Use Case |
|------|----------|-----------|----------|
| **client_vad** (default) | High | 5–10s | Client-side ML (silero-vad). High accuracy, enables client-side interruptions. |
| **server_vad** | High | Instant | Server-side VAD (AssemblyAI/Fennec). No client processing. |
| **semantic_vad** | High | Instant | Server-side semantic VAD. Understands speech context. |
| **disabled** | N/A | Instant | No VAD. Troubleshooting, bandwidth-constrained environments. |

### Client VAD (mode: `'client_vad'`)

- Runs in the browser using ML models.
- **Adapters:** `silero-vad` (default), `simple-vad`, `smart-turn`.
- **silero-vad**: Best accuracy, ~5–10s model download.
- **simple-vad**: Energy-based, instant, lower accuracy.
- **smart-turn**: Turn-aware detection.
- Enables client-side interruptions (user can speak over AI).

```typescript
voiceConfig: {
  turnDetection: {
    mode: 'client_vad',
    clientVAD: {
      adapter: 'silero-vad',  // default
      // or 'simple-vad' | 'smart-turn'
    },
  },
}
```

### Server VAD (mode: `'server_vad'`)

- Runs on the server, integrated with streaming STT (AssemblyAI, Fennec).
- No client-side model download.
- Recommended for vowel-prime with AssemblyAI/Fennec STT.
- Set `useServerVad: true` for UI updates driven by server VAD events.

```typescript
voiceConfig: {
  turnDetection: {
    mode: 'server_vad',
    serverVAD: {
      threshold: 0.5,
      silenceDurationMs: 550,
      prefixPaddingMs: 0,
      interruptResponse: true,
    },
  },
  useServerVad: true,  // Use server VAD for UI updates
}
```

### When to Use Which

- **client_vad**: Default. Best for accuracy and client-side interruptions. Use when STT is Groq Whisper (batch).
- **server_vad**: Use with AssemblyAI/Fennec streaming STT. Faster startup, no client model.
- **semantic_vad**: When semantic understanding of speech boundaries is needed.
- **disabled**: Debugging or minimal setup.

## Source References

- Whisper languages: docs/WHISPER_LANGUAGES.md in Vowel Engine
- Inworld voices: src/config/inworld-voices.ts in Vowel Engine
- AssemblyAI languages: 6 (en, es, fr, de, it, pt)
- Client VAD types: `client/README.md` (turnDetection section)
