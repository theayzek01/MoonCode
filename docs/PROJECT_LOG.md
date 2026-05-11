# Mooncli Project Log

## [2026-05-03]
### Added
- **Discord Integration**: Added `/discord` command and tools to manage Discord servers via `discord.js`.
- **Dynamic UI Feedback**: Loading spinner now shows contextual messages like "Thinking...", "Writing code...", etc.
- **Settings Update**: Added `discordToken` to global settings.
- **Version Bump**: Bumping to `0.72.2` for release.

### Fixed
- TypeScript build errors in `discord.ts`.
- Security: Discord token is now stored in settings instead of being hardcoded.

### Operations
- Installed `discord.js`.
- Built the project successfully.
- Ran `npm audit fix` to secure dependencies.

