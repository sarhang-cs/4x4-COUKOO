# 4X4 COUKOO — Code Split Release

This release adds real Vite/Rollup code splitting without removing game features.

## What changed

- Dynamic boot entry for the 3D game runtime.
- `manualChunks` for Three.js, Rapier, motion, camera, audio, input, random and text runtime libraries.
- Debug tools load only with `#debug`.
- Multiplayer MessagePack codec loads only when `VITE_SERVER_URL` is configured.
- Native `crypto.randomUUID()` replaces the unused `uuid` bundle dependency.

## Validated production output

- Bootstrap entry: 2.68 kB
- Game runtime: 464.84 kB
- Three.js WebGPU engine: 1,484.14 kB
- Debug tools: 422.28 kB, loaded only with `#debug`
- Rapier JavaScript: 179.52 kB, dynamically loaded while resources load
- Rapier WASM: 1,698.49 kB, fetched only with the physics chunk

`npm run verify` and `npm run build` passed before this archive was created.
