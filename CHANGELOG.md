# 1.13.0 — Unified High / Medium / Low quality assets

- High preset uses full-archive lossless music assets.
- Medium uses the balanced original archive profile.
- Low keeps the Phase 10 optimized profile.
- One runtime and one saved quality system controls all three presets.

# Changelog

## Phase 10 — PWA, Offline Shell & Production Launch Readiness

- Added an installable PWA manifest, service worker, offline recovery page, cache versioning, and safe in-app update handling.
- Added Install App and Offline Play status controls in Options, with iOS Add to Home Screen guidance.
- Added portable canonical, Open Graph, Twitter, favicon, and manifest paths for GitHub Pages subpaths, Netlify, and Vercel.
- Added optional `VITE_SITE_URL` metadata configuration for absolute public social-preview URLs.
- Added Netlify/Vercel service-worker cache headers and Phase 10 release checks.

## Phase 9 — Daily Rewards, Sharing & Controller Reliability

- Added a seven-day daily reward streak in the Garage, stored in the versioned browser save.
- Added local Circuit run history with all-time personal best, daily best, last result, and run count.
- Added offline Circuit result feedback and native/clipboard score sharing.
- Added resilient controller connection/disconnection handling so held inputs are released safely when a controller is unplugged.
- Added a documented contract for the optional trusted WebSocket leaderboard backend.

## v1.9.0 — Guided Startup & Recovery

- Added a branded, accessible startup screen with staged load progress for the renderer, initial resources, full world batch, physics, and controls.
- Added WebGL capability preflight and a clear recovery screen for unsupported devices, timed-out launches, and missing resources.
- Exposed `Game.ready` so bootstrap failures are caught instead of leaving a blank or partially initialized page.
- Added a safe reload action and Phase 3 regression test coverage.

## v1.8.0 — Mobile Performance & Delivery Optimization

- Enabled compressed KTX2/Draco production assets and pruned 135 duplicate/source-only files from the deployment output.
- Added device- and connection-aware resource-load concurrency limits.
- Fixed adaptive mobile resolution so high-DPR phones can actually step down their active pixel ratio under load.
- Paused the renderer in hidden browser tabs/apps and resumed it safely when visible.
- Switched Google font loading to `display=swap` and deployed only the WOFF2 font format.

## v1.7.0 — Final Release Cleanup & QA

- Removed 20 disconnected legacy landing-title nodes and 10 meshes from `static/areas/areas.glb`.
- Reduced `areas.glb` from 3,660,596 bytes to 3,599,388 bytes while preserving the active scene graph, 7 physical `SARHANG` title meshes, and the Kurdistan flag anchor.
- Added the `release-check` script and a release audit for source, build output, sound count, GLB integrity, and lazy-chunk boundaries.
- Consolidated release documentation.

## v1.6.0 — Desktop High / Ultra Quality

- Added adaptive Balanced / High / Ultra desktop rendering under the single visible High setting.
- Preserved Mobile High and Low behavior.


## Phase 4 — Save System

- Added versioned, namespaced save storage with legacy migration and corruption-safe recovery.
- Persisted quality, audio, country, play time, distance, achievements, rewards, and multiplayer session identity.
- Added save status, backup export, and clear-progress controls in Options.

## Phase 5 — Complete Settings Suite
- Added High / Medium / Low graphics presets with legacy save compatibility.
- Added master volume, FPS, shadow, vibration, full-screen, and live performance controls.
- Added haptic impact feedback when supported by the browser.
- Added Phase 5 automated test coverage and save normalization.


## Phase 6 — UX, Tutorial, and Pause Menu
- Added a persistent first-drive tutorial and replay action.
- Added a real pause menu with simulation and audio suspension.
- Added keyboard, touch, and gamepad-aware UX guidance.


## Phase 7 — Visual Polish & Dynamic Atmosphere

- Added a lightweight, quality-aware cinematic overlay for night grading, rain streaks, snow, dust, storm flashes, and boost-speed motion.
- Added a three-state Visual Effects setting: Auto, On, and Off. Auto preserves the Low graphics performance budget.
- Persisted the Visual Effects preference inside the versioned device save and added automated Phase 7 regression coverage.

## Phase 8 — Missions, Coins & Garage

- Added four persisted driving missions: distance, boost, speed, and trail-run objectives.
- Added a mission coin wallet with a compact on-drive HUD and completion notifications.
- Added a Garage menu where earned coins unlock the existing Old School 4X4 visual vehicle.
- Persists mission progress, coin balance, total coins, vehicle ownership, and equipped vehicle in the versioned device save.
- Added Phase 8 regression coverage for missions, garage UI, and vehicle equip flow.


## 1.13.1 — Final quality audit

- Fixed queued High/Medium playlist asset changes during jukebox disc transitions.
- Bumped the PWA cache namespace for reliable release updates.
- Added final regression coverage for unified-quality asset behavior.

## v1.13.3 — Mobile settings and quality stability
- Confirmed Low / Medium / High selection, safer FPS and shadows reload, capability-aware device profile, sharper Medium/High distance rendering, and corrected mobile controls layout.

## v1.13.4 — Adaptive FPS, display detection and reload stability

- Added measured browser display-cadence detection and quality-aware FPS choices: 30, 45, 60, 90, 120 and native 120+ where available.
- Added fractional frame pacing for stable 45 FPS operation on 60 Hz displays.
- Kept simulation, physics, input, audio and server timing independent from the render cap.
- Restored the startup/loading screen immediately before controlled settings reloads to avoid blank canvas transitions.
- Refreshed the PWA cache version and Vercel HTML cache policy.
