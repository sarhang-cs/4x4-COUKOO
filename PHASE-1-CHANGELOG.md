# 4X4 COUKOO — Phase 1: Core Hardening

## Completed

- Replaced leaderboard HTML interpolation with safe DOM node creation.
- Added validation and normalization for incoming circuit leaderboard data.
- Fixed offline leaderboard refreshes when the circuit menu is closed or open.
- Limited leaderboard rendering to the expected top 10 valid scores.
- Hardened WebSocket lifecycle handling: malformed payloads are ignored, duplicate connection attempts are prevented, and reconnects recover safely after failed connection attempts.
- Made server session persistence resilient when browser storage is unavailable.
- Fixed the circuit reset timer state and duplicate interval handling.
- Replaced country search regular expressions with safe plain-text matching.
- Added Phase 1 regression tests for leaderboard normalization.

## Commands

```bash
npm install
npm run test
npm run release-check
```

## Validation completed

- `npm run test`
- `npm run verify`
- `npm run build`
- `node scripts/release-audit.js`
