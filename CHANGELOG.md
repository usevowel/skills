# Changelog

All notable changes to the vowel skills are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-05-10

### Changed

- **Renamed `getGameState` to `getAppState`** across all skills and references. The fallback action for pushing initial app context is now generically named to reflect its purpose rather than a specific demo context.
- **Removed `games` store references** from context builders, system instructions, and code examples. Generalized to app state.
- **Added STT/TTS provider override documentation** to `vowel-react/references/languages-and-vad.md` with supported provider lists and usage guidance.
- **Added `stt`/`tts` dev-override config** to `voweldocs` VowelConfig type in the Astro voice widget implementation.
- **Added commented STT/TTS override defaults** to the main `vowel-react` SKILL.md voiceConfig example.

### Added

- **CHANGELOG.md** — Versioned changelog for the skills repository.

[Unreleased]: https://github.com/usevowel/skills/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/usevowel/skills/releases/tag/v1.0.0
