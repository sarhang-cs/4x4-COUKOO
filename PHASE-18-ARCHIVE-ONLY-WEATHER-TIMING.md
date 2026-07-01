# Phase 18 — Archive-only Weather and Timed Seasons

## Archive-only weather
The full-screen CSS rain, snow and storm overlays are disabled for weather.
Rain, snow, thunder, lightning and ground impact now use only the original
runtime systems and asset files retained from `folio-2025-main.zip`.

### Verification
- `RainLines.js` SHA-256: `e681f3cd78091a5d337d9f23e1a7f09280bde98a1b29fb83113a124325a1d94e`
- `Lightnings.js` SHA-256: `ecc841c7323b6e90161db0d0b1e1f6bed7abf207c9ffb4fe38ca8b5f137d144c`
- Original rain and thunder asset checksums match the large archive.

## Seasonal timing
- Full in-game year: **40 minutes**.
- Each season: **10 minutes**.
- Stable portion: **8 minutes 30 seconds**.
- Blend into next season: **90 seconds**.
- Foliage color and falling-leaf volume now interpolate during the same blend.
