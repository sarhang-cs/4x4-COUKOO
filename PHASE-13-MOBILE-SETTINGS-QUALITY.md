# Phase 13 — Mobile Settings, Quality, and Renderer Stability

## Fixed
- Replaced immediate quality cycling with Low / Medium / High selection and an explicit confirmation reload.
- Replaced immediate frame-rate and shadow application with a controlled reload, preventing blank/black canvas transitions.
- Mobile Low uses the stable PNG texture path while retaining the lightweight compressed model profile.
- Added renderer context-loss recovery to return to the normal loading screen instead of leaving an empty canvas.
- Medium is the first-launch preset. Existing saved user selections are preserved.
- Device profile uses browser-reported capabilities (GPU/WebGL, logical CPU cores, reported RAM, screen, browser storage, browser identity) without claiming unavailable exact hardware data.
- Increased Medium and High view distance and removed depth-of-field blur from normal High world rendering.
- Reworked Controls and Options layout for mobile.
- Moved/restyled mission coins HUD.
