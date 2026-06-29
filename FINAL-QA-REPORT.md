# 4X4 COUKOO v1.7.0 — Final QA Report

## Automated checks completed

```text
npm run verify        PASS
npm run build         PASS
npm run release-check PASS
npm audit             0 vulnerabilities
```

## Targeted cleanup

`static/areas/areas.glb` was cleaned without touching the active scene:

- Removed: 20 disconnected legacy title nodes and 10 meshes.
- Preserved: 732 reachable nodes, 263 meshes, 7 physical `SARHANG` title meshes, and `refLandingFlagAnchor`.
- Size: 3,660,596 bytes → 3,599,388 bytes (61,208 bytes removed).

## Runtime asset inventory

```text
MP3 : 88
GLB : 64
KTX : 88
WAV : 0
```

The release audit fails if the MP3 count changes, if a WAV file reappears, if the landing model contains disconnected nodes, or if the production build is missing the main game/engine chunks.

## Build note

Vite still reports a size advisory for the required `engine-three` cache chunk (about 1.61 MB minified). Dynamic loading and manual chunks remain active. The advisory is not hidden and is not a runtime error.

## Post-deploy manual confirmation

Automated checks cannot inspect the browser console of the live Vercel deployment. After deployment, verify one fresh load on mobile and one on desktop: enter the world, move the vehicle, open Settings, switch Low/High, confirm sound after interaction, and check that no red console error repeats.
