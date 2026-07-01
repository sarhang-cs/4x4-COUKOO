# 4X4 COUKOO — Phase 4: Save System

## Delivered

- Versioned local save file: `4x4-coukoo-save-v1`.
- Safe legacy migration from the previous individual browser keys.
- Saves settings, driving progress, achievements, reward selection, country flag, and server session id.
- Uses debounced writes with immediate writes for user-selected settings.
- Export a portable JSON backup from Options.
- Clear only game progress while keeping user settings.
- Handles unavailable browser storage without crashing the game.

## Validation

Run `npm test`, `npm run verify`, `npm run build`, and `npm run release-check`.
