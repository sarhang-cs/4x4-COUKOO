<a id="top"></a>

<div align="center">

# 4X4 COUKOO

### Interactive 3D Driving World

**Developer: Sarhang Salah · SARHANG IO · 2026 · v1.14.0**

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

**4X4 COUKOO** is an interactive browser-based 3D driving world created by **Sarhang Salah** under **SARHANG IO**. It combines off-road driving, physics interactions, stylized exploration, real-time lighting, weather, seasons, touch controls, keyboard controls, controller support, saved progress, missions, garage rewards, and installable PWA delivery in one world.

The project is designed for **mobile, tablet, and desktop**. It uses the browser's best supported renderer path and keeps a WebGL compatibility path when WebGPU is unavailable.

## Screenshots

| Driving world | Game interface |
| --- | --- |
| <img src="./static/readme/4x4-coukoo-cover.png" alt="4X4 COUKOO world screenshot" width="100%" /> | <img src="./static/readme/4x4-coukoo-ui.png" alt="4X4 COUKOO menu and settings screenshot" width="100%" /> |

## v1.14.0 — Clean Rebuild

This release consolidates the project into one maintained runtime architecture.

- One project structure, one release audit, one verification command, and one test command.
- The **Low / Medium / High** system remains a single game, not three separate projects.
- Graphics changes load the correct runtime asset profile through a controlled restart.
- The FPS system supports **Auto / 30 / 45 / 60 / 90 / 120 / 120+**.
- Only FPS modes that the active browser can currently present are shown in Settings.
- `Auto` selects a recommended render target from the selected graphics preset, measured browser cadence, and available browser capability information.
- Rendering, physics, timers, audio, input, saves, and server timing remain time-based. A render cap does not make gameplay run slower or faster.
- The project ZIP intentionally excludes `node_modules` and generated `dist`; Vercel or local npm commands create them from the lockfile.

## Graphics Quality Profiles

| Profile | Runtime asset profile | Intended use |
| --- | --- | --- |
| **Low** | Lightweight Phase 10 model path and stable mobile rendering | Battery-friendly and constrained devices |
| **Medium** | Full PNG and GLB world with balanced renderer settings | Recommended starting profile for most devices |
| **High** | Full-detail world, stronger shadows, larger visibility budget, full effects, lossless music | Strong mobile devices and desktop hardware |

Each profile changes real rendering settings such as render scale, render-pixel budget, texture filtering, shadows, bloom, visibility budget, and post-processing cost. The available FPS menu is filtered to the display/browser capability at that moment.

## Device Capability Profile

The in-game **Device profile** is intentionally truthful. It can show only the information exposed by the current browser, such as:

- Browser-reported device model, when available
- Logical CPU core count
- Browser-reported RAM, when available
- GPU / WebGL renderer information, when exposed
- Screen resolution and device pixel ratio
- Browser storage estimate, when exposed
- Measured `requestAnimationFrame` cadence

Browsers do not provide a universal, reliable API for exact chipset names, exact physical panel refresh rate, total physical RAM, or all storage details. When the browser hides a value, the game reports it as unavailable instead of guessing.

## Dynamic Seasons and Weather

The world includes the restored runtime weather and season systems:

- **Spring** — fresh world colours and wetter ambience
- **Summer** — bright, clearer environment
- **Autumn** — warmer foliage colours and stronger falling-leaf ambience
- **Winter** — colder tone and snow-capable conditions
- **Rain** — 3D rain and archive-provided rain audio
- **Storm** — rain, thunder, lightning, ground impact, and archive-provided fire effect
- **Snow** — snow conditions using the existing runtime assets

Weather and season effects use the validated archive/runtime assets included with the project. Source-only files such as design files, editor backups, and unrelated portfolio resources are not part of the production runtime.

## Gameplay Features

- Drive an off-road vehicle through a stylized 3D island.
- Explore landmarks, interactive points, maps, secrets, and environmental details.
- Use touch controls, keyboard and mouse, or a compatible gamepad.
- Play missions, collect coins, unlock garage content, and claim daily rewards.
- Track Circuit personal bests and share local results.
- Save quality, audio, controls, progression, missions, vehicles, and rewards on the device.
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

Open the local Vite address, usually:

```text
http://localhost:5173
```

## Quality Assurance

```bash
npm run verify
npm run test
npm run build
npm run release-check
```

`release-check` verifies the source structure, runs the test suite, builds production output, and audits the release files.

## Production Build

```bash
npm run build
npm run preview
```

## PWA and Offline Play

The production build is installable as a Progressive Web App.

- Android / Chromium browsers: use **Install app** from the in-game options or browser menu.
- iPhone / iPad: use **Share → Add to Home Screen**.
- Offline support is handled by the service worker after the required assets have been cached.

Set the production site URL before a final canonical/social build when needed:

```bash
VITE_SITE_URL=https://your-public-domain.example
```

## Deploy on Vercel

Use these values when importing the repository:

```text
Framework Preset: Vite
Install Command: npm install --no-audit --no-fund
Build Command: npm run build
Output Directory: dist
Node.js Version: 22.12+ (Node 24 is also supported)
```

See [`DEPLOYMENT-CHECKLIST.md`](./DEPLOYMENT-CHECKLIST.md) for launch checks.

## Project Structure

```text
4x4-COUKOO/
├── scripts/                 Verification, test, build, and release-audit utilities
├── sources/                 Core game source
│   ├── Game/                Gameplay, physics, rendering, UI, audio, and world systems
│   ├── data/                Game data and content definitions
│   ├── style/               Stylus stylesheets
│   ├── index.html           Application shell and social metadata
│   └── index.js             Application entry point
├── static/                  Models, textures, sounds, fonts, icons, and images
│   └── readme/              GitHub README screenshots
├── package.json             Dependencies and npm scripts
├── vite.config.js           Vite configuration
├── vercel.json              Vercel deployment configuration
├── LICENSE                  MIT license text
└── README.md                Project documentation
```

## Performance Notes

- The first visit can take longer because the browser must load models, textures, audio, and shaders.
- A modern browser with hardware acceleration enabled is recommended.
- Browser refresh capability can be reduced by battery saver, browser policy, thermal state, or the current display mode. The game measures browser cadence instead of assuming an advertised device refresh rate.
- Use **Auto** first. Change Low / Medium / High before choosing a manual FPS target.
- Close unused tabs on mobile devices when testing High mode.

## Optional Live Leaderboard

The client contains a contract for a future live leaderboard, but official shared rankings require a separate trusted backend for validation and anti-cheat rules. See [`LEADERBOARD-SERVER.md`](./LEADERBOARD-SERVER.md).

## License

This project is released under the [MIT License](./LICENSE).

<p align="right"><a href="#top">Back to top ↑</a></p>
