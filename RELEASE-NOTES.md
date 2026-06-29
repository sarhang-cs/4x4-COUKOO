# 4X4 COUKOO v1.5.0 — Renderer Root Fix

This release performs the renderer-stability stage only.

- Pins Three.js to `0.185.0`.
- Replaces the old all-frame UBO upload workaround with a capacity guard.
- The guard re-uploads a uniform buffer only when its byte length grows; otherwise Three.js keeps its partial WebGL updates.
- No assets, audio, gameplay, UI, vehicle physics, flag work, or High/Low profiles were removed.
- Uses the public npm registry and Node `24.x` for Vercel.

Validated before packaging:

```bash
npm install --offline --no-audit --no-fund
npm run verify
npm run build
```

The build completes. Vite still reports the `engine-three` chunk as larger than 1500 kB; it is a non-blocking build advisory and is intentionally left visible for the later engine-loading refactor.
