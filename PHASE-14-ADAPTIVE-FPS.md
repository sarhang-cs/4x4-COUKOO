# Phase 14 — Adaptive FPS and reload stability

## Frame-rate support

The game now supports 30, 45, 60, 90, 120 and 120+ FPS modes.

The FPS picker measures the browser's delivered `requestAnimationFrame` cadence after the world has loaded. It only shows real options that the current browser/display combination can present.

- **Low**: targets 30 / 45 FPS.
- **Medium**: targets 45 / 60 / 90 FPS.
- **High**: targets 90 / 120 FPS, plus 120+ native mode only when a measured cadence above 120 Hz is available.
- When a monitor/phone cannot meet the normal quality-tier range, the picker safely exposes only the highest actually available fallback rather than an impossible FPS target.

The render cap does not slow game simulation: physics, input, timers, audio and server work remain time-based. Render pacing uses a time accumulator so 45 FPS can be paced correctly on 60 Hz displays rather than falling to 30 FPS.

## Stability

Changing graphics, FPS, or shadows restores the same loading screen before a controlled page reload. This prevents an empty canvas from being shown while the renderer and assets restart.

Service-worker cache and Vercel HTML cache policy are refreshed for this release.

## Device data

The device profile shows browser-reported logical CPU count, available reported RAM, WebGL GPU details, browser storage, screen resolution and a measured browser display cadence. Web browsers do not provide a reliable cross-platform API for all exact physical hardware specifications, so unavailable information is clearly labeled rather than guessed.
