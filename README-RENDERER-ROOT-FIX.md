# Renderer Root Fix — v1.5.0

## Scope

This release changes only the renderer dependency and its WebGL fallback upload guard. No gameplay code, assets, sound, flag, vehicle physics, UI, or quality profile has been removed.

## Changes

- Pins `three` to `0.185.0`.
- Removes the previous broad `FULL_UPLOAD` patch that re-uploaded every uniform buffer on every frame.
- Adds a narrow capacity guard during `postinstall`:
  - tracks the allocated byte length for each WebGL uniform buffer;
  - performs a full reallocation/upload only if the JavaScript-side buffer has grown;
  - otherwise leaves Three.js's normal partial `bufferSubData` updates intact.
- Fails the install explicitly if Three.js's WebGL backend layout does not match the pinned version, instead of silently publishing without the guard.
- Keeps the public npm registry in `.npmrc` and `package-lock.json`.

## Validation performed

- `npm install --offline --no-audit --no-fund`
- `npm run verify`
- `npm run build`

## Runtime verification after deployment

Open the production site on Android and desktop. In DevTools Console, confirm that repeated `GL_INVALID_OPERATION: uniform buffer too small` messages no longer appear after driving and opening/closing the menu.
