# Phase 2 — Mobile Performance & Delivery Optimization

## Delivered

- Production now selects Draco-compressed GLB and KTX2 texture assets by default.
- The production build removes duplicate uncompressed variants, legacy font files, and source-only readme files from `dist`.
- Resource loading is concurrency-limited according to device capacity and connection quality to avoid decoding/network spikes on mobile.
- Adaptive resolution now works on mobile and uses a capped pixel-ratio baseline, allowing real downscaling on high-DPR phones.
- Rendering pauses while the browser tab/app is hidden and safely resumes when it becomes visible.
- Low-quality mobile profile is leaner: smaller render-pixel budget, lower bloom/shadow cost, and adaptive recovery.
- Google font loading uses `display=swap`; only WOFF2 is requested in production.

## Verification

```bash
npm test
npm run verify
npm run build
npm run release-check
```
