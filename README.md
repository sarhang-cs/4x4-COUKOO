# 4X4 COUKOO

Interactive 3D driving world by **Sarhang Salah / SARHANG IO**.

## Release v1.14.0 — Clean Rebuild

This source release keeps one runtime architecture:

- **Low / Medium / High** graphics are selected before the 3D world loads.
- **Auto / 30 / 45 / 60 / 90 / 120 / 120+ FPS** are shown only when the browser can currently present those rates.
- Device information is read only from browser-exposed APIs. Values that the browser hides, such as an exact chipset or physical panel refresh rate, are explicitly reported as unavailable rather than guessed.
- Seasons, rain, snow, thunder, lightning and ground-fire effects use the restored archive runtime assets only.
- High uses full PNG/GLB assets and lossless music; Medium uses full PNG/GLB plus MP3; Low uses the existing lightweight runtime variants.

## Commands

```bash
npm install
npm run test
npm run verify
npm run build
npm run release-check
```

## Deployment

Vercel reads `vercel.json` and runs `npm run build`. The generated output is `dist/`.
