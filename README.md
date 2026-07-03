<a id="top"></a>

<div align="center">

# 4X4 COUKOO

### Interactive 3D Driving World

**Developer: Sarhang Salah · SARHANG IO · 2026 · v1.15.0**

<img src="./static/readme/4x4-coukoo-cover.png" alt="4X4 COUKOO cover artwork" width="100%" />

<br />

<img src="./static/readme/4x4-coukoo-ui.png" alt="4X4 COUKOO gameplay and settings interface" width="100%" />

<br />

[![Vite](https://img.shields.io/badge/Vite-7.3.6-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vite.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-WebGL%20%2F%20WebGPU-000000?style=for-the-badge&logo=three.js&logoColor=white)](https://threejs.org/)
[![Rapier](https://img.shields.io/badge/Physics-Rapier-1F2937?style=for-the-badge)](https://rapier.rs/)
[![License](https://img.shields.io/badge/License-MIT-16A34A?style=for-the-badge)](./LICENSE)

</div>

---

## Overview

**4X4 COUKOO** is an interactive browser-based 3D driving world created by **Sarhang Salah** under **SARHANG IO**. It combines off-road driving, physics interactions, stylized exploration, real-time lighting, weather, seasons, touch controls, keyboard controls, controller support, local saves, and installable PWA delivery in one world.

The project is designed for **mobile, tablet, and desktop**. It uses the browser's best supported renderer path and keeps a WebGL compatibility path when WebGPU is unavailable.

## Screenshots

| Driving world | Game interface |
| --- | --- |
| <img src="./static/readme/4x4-coukoo-cover.png" alt="4X4 COUKOO world screenshot" width="100%" /> | <img src="./static/readme/4x4-coukoo-ui.png" alt="4X4 COUKOO menu and settings screenshot" width="100%" /> |

## v1.15.0 — Responsive UI and Runtime Cleanup

- Removed the **Coukoo Garage**, daily reward, mission-currency and on-screen coin HUD systems from the runtime and saved profile.
- Reworked the menu viewport, safe-area, touch scrolling, and settings modal behavior for Safari/iPhone, Galaxy, Redmi/Xiaomi, Vivo, tablets, and desktop browsers.
- Responsive behavior is driven by actual browser viewport and safe-area values rather than fixed phone-model dimensions.
- Added richer browser capability profiling: exposed model, device family, CPU core count, browser-reported memory, WebGL/WebGPU facts, screen/viewport state, storage, battery, and live browser frame cadence.
- Auto graphics now chooses Low, Medium, or High from observed browser capability. It does not guess a chipset or panel refresh rate when the browser hides it.
- Browser frame cadence is measured during the startup screen and reconfirmed after the world loads. FPS choices remain limited to what the active browser can actually present.
- Medium and High mobile profiles receive a larger pixel budget when observed GPU/CPU facts support it, while adaptive resolution now moves more gradually to reduce visible quality jumps.
- The original in-world start prompt artwork remains in place; only its image orientation is corrected.
- Seasons, rain, snow, thunder, lightning, ground-fire effects, and audio use the retained archive runtime assets.

## Graphics Quality Profiles

| Profile | Runtime asset profile | Intended use |
| --- | --- | --- |
| **Low** | Lightweight Phase 10 model path and stable mobile rendering | Battery-friendly and constrained devices |
| **Medium** | Full PNG and GLB world with balanced renderer settings | Recommended for balanced mobile, tablet, and desktop browsers |
| **High** | Full-detail world, stronger shadows, larger visibility budget, full effects, lossless music | Browsers with observed strong GPU/CPU capability |

Each profile changes real rendering settings such as render scale, render-pixel budget, texture filtering, shadows, bloom, visibility budget, and post-processing cost. **Auto** chooses a recommended rendering target for the selected profile; manual frame-rate options are filtered by the current browser cadence.

## Device Capability Profile

The in-game **Device profile** reports only browser-exposed values:

- Browser-reported model and device family, when available
- Logical CPU core count and browser-reported memory, when available
- WebGL renderer, GPU limits, and WebGPU API availability, when exposed
- Screen, current visual viewport, pixel ratio, color gamut, storage, and battery state when exposed
- Live `requestAnimationFrame` cadence measured during startup

Browsers do not universally reveal exact chipset names, full physical RAM, or a display panel's advertised refresh rate. When unavailable, the game reports the value as hidden rather than inventing a result.

## Dynamic Seasons and Weather

The world includes the restored runtime weather and season systems:

- **Spring** — fresh world colours and wetter ambience
- **Summer** — bright, clearer environment
- **Autumn** — warmer foliage colours and stronger falling-leaf ambience
- **Winter** — colder tone and snow-capable conditions
- **Rain** — original 3D rain and archive-provided rain audio
- **Storm** — original rain, thunder, lightning, ground impact, and archive-provided fire effect
- **Snow** — snow conditions using the existing runtime assets

## Gameplay Features

- Drive an off-road vehicle through a stylized 3D island.
- Explore landmarks, interactive points, maps, secrets, and environmental details.
- Use touch controls, keyboard and mouse, or a compatible gamepad.
- Track Circuit personal bests and share local results.
- Save quality, audio, controls, progression, achievements, Circuit data, weather, and vehicle state on the device.
- Use pause controls, replay the driving tutorial, and recover with Respawn if stuck.
- Experience day/night light changes, fog, wind, water, weather, seasons, particles, and environmental interaction.

## Controls

### Mobile and tablet

| Action | Input |
| --- | --- |
| Drive | On-screen touch controls |
| Camera and zoom | Touch gestures |
| Jump | Tap the vehicle / touch control prompt |
| Interact | Nearby interaction prompt |
| Open menus | Interface buttons |

### Keyboard and mouse

| Action | Input |
| --- | --- |
| Drive | `W A S D` or arrow keys |
| Camera | Mouse drag |
| Boost | `Shift` |
| Brake | `Ctrl` or `B` |
| Jump | `Space` |
| Interact | `Enter` |
| Map | `M` |
| Pause | `P` |
| Mute | `L` |
| Respawn | `R` |

### Gamepad

The Controls panel lists the connected controller layout dynamically. Controller input is released safely if the controller disconnects during play.

## Local Development

```bash
git clone https://github.com/sarhang-cs/4x4-COUKOO.git
cd 4x4-COUKOO
npm install
npm run dev
```

## Quality Assurance

```bash
npm run verify
npm run test
npm run build
npm run release-check
```

## PWA and Offline Play

The production build is installable as a Progressive Web App.

- Android / Chromium browsers: use **Install app** from the in-game options or browser menu.
- iPhone / iPad: use **Share → Add to Home Screen**.
- Offline support is handled by the service worker after required files have been cached.

## Deploy on Vercel

```text
Framework Preset: Vite
Install Command: npm install --no-audit --no-fund
Build Command: npm run build
Output Directory: dist
Node.js Version: 22.12+ (Node 24 is also supported)
```

See [`DEPLOYMENT-CHECKLIST.md`](./DEPLOYMENT-CHECKLIST.md) for launch checks.
