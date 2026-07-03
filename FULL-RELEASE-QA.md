# 4X4 COUKOO v1.15.0 — Full Release QA

## Completed checks

- `npm ci --no-audit --no-fund` completed without install warnings.
- `npm run verify` passed.
- `npm test` passed.
- `npm run build` passed without Vite chunk-size warning.
- `npm run release-check` passed.
- `npm audit --omit=dev --audit-level=high` reported 0 vulnerabilities.

## Main cleanup

- Coukoo Garage, coin currency, daily rewards, mission runtime UI, and top HUD coin display were removed.
- Legacy saved currency/mission/garage values are removed during save normalization.
- Menu and settings panels now use visual-viewport sizing, safe-area padding, and native momentum scrolling.
- Device capability selection uses browser-exposed GPU/CPU/memory/viewport facts and live requestAnimationFrame cadence. Hidden hardware values are not invented.

## Project ZIP contents

The full project ZIP includes source, static runtime assets, documentation and lockfile. It intentionally excludes `node_modules` and generated `dist`.
