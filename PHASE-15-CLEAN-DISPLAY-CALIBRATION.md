# Phase 15 — Clean Display Calibration and Unified FPS Options

## Why this patch exists
The prior cadence probe sampled `requestAnimationFrame` while the full 3D world was rendering. A GPU-heavy world can make a 90 Hz or 120 Hz phone look like 30 Hz, which produced false FPS options and inconsistent Auto labels.

## Fixes
- Briefly pauses only the renderer animation loop during the display calibration test.
- Measures clean browser `requestAnimationFrame` cadence, then restores the exact rendering loop.
- Performs the calibration fresh on every launch; no old FPS result is reused.
- Adds a tap action to **Device profile** for a manual fresh calibration.
- Adds Auto FPS as the default saved setting.
- All graphics presets now expose every real FPS option supported by the current browser/display: 30, 45, 60, 90, 120, and 120+ only when actually observed.
- Graphics presets change real render budgets, pixel budget, bloom and shadow cost at higher FPS targets.
- Keeps simulation time-based: physics, timers, controls, audio and networking do not speed up or slow down with render FPS.
- Refreshes Graphics and Frame rate rows after device calibration so they cannot disagree.
- Bumps PWA cache to v1.13.5.

## Browser limitation
Web browsers may intentionally hide an exact hardware model, true RAM capacity and physical panel refresh rate. The game uses browser-reported capabilities plus a fresh clean cadence measurement. If the browser itself is currently limited to 60 Hz or 30 Hz, the game does not offer higher modes because it cannot present them reliably.
