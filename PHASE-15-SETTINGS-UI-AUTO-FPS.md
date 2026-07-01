# Phase 15 — Settings UI, Auto FPS, and quality/FPS linkage

## Updated behavior
- Added an **Auto** FPS mode and made it the default save value.
- FPS picker now only shows options the current browser/display cadence can really present.
- 120+ native mode remains available only when measured cadence is above 120 Hz.
- Auto now chooses the best FPS target for the currently selected graphics preset and device capability.
- Graphics picker now shows the available FPS range for each preset on the current device.
- Performance status now shows both the selected mode and the actual render target.
- Settings list layout was restyled to be more compact and visually consistent with the new picker panels.

## Changed files
- sources/Game/Save.js
- sources/Game/Quality.js
- sources/Game/Options.js
- sources/Game/Rendering.js
- sources/style/options.styl
