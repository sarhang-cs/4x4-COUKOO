<a id="top"></a>

<div align="center">

# 4X4 COUKOO

## Phase 9 — Daily Rewards, Sharing & Controller Reliability

- Added a save-backed seven-day daily reward streak in the Garage.
- Added Circuit personal-best / daily-best tracking and offline result sharing.
- Improved controller lifecycle support: connected status and safe action release on disconnect.
- Documented the optional trusted backend needed for official live leaderboard submissions.


### Interactive 3D Driving World

**Developer: Sarhang Salah · SARHANG IO · 2026 · v1.11.0**

<img src="./static/readme/4x4-coukoo-cover.png" alt="4X4 COUKOO cover artwork" width="100%" />

<br />

<img src="./static/readme/4x4-coukoo-ui.png" alt="4X4 COUKOO gameplay interface preview" width="100%" />

<br />

[![Vite](https://img.shields.io/badge/Vite-7.3.6-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vite.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-WebGL%20%2F%20WebGPU-000000?style=for-the-badge&logo=three.js&logoColor=white)](https://threejs.org/)
[![Rapier](https://img.shields.io/badge/Physics-Rapier-1F2937?style=for-the-badge)](https://rapier.rs/)
[![License](https://img.shields.io/badge/License-MIT-16A34A?style=for-the-badge)](./LICENSE)

</div>

---

## Overview

**4X4 COUKOO** is an interactive browser-based 3D driving world created and maintained by **Sarhang Salah** under **SARHANG IO**. The experience combines vehicle movement, world exploration, physics interactions, day-and-night lighting, ambient effects, touch controls, and game-style interface systems in one stylized environment.

The game is designed for mobile, tablet, and desktop browsers. It uses WebGPU when available and selects a lightweight WebGL compatibility path when WebGPU is unavailable.

## Screenshots

| Gameplay world | In-game interface |
| --- | --- |
| <img src="./static/readme/4x4-coukoo-cover.png" alt="4X4 COUKOO world screenshot" width="100%" /> | <img src="./static/readme/4x4-coukoo-ui.png" alt="4X4 COUKOO menu and interface screenshot" width="100%" /> |



## Phase 9 — Daily Rewards, Sharing & Controller Reliability

- Added a seven-day daily reward streak, saved on the device and available in the Garage.
- Added saved Circuit personal-best / daily-best tracking and an offline result modal.
- Added native Web Share with safe clipboard fallback for Circuit results.
- Added controller connection-status UX and safe release of held inputs when a controller disconnects.
- The static site client supports an optional live leaderboard WebSocket. The trusted server contract is documented in [`LEADERBOARD-SERVER.md`](./LEADERBOARD-SERVER.md).

## Phase 7 Visual Polish & Dynamic Atmosphere

- Added screen-space visual polish for rain, snow, dusk/night tint, dust, lightning atmosphere, and boost-speed motion.
- Added an Auto / On / Off Visual Effects setting that persists through the existing versioned device save.
- Auto enables the effects on Medium and High, while Low prioritizes frame pacing by keeping the optional overlay stack disabled.
- Added automated Phase 7 regression coverage.

## v1.8.5 Guided Startup & Recovery

- Added a polished branded loading screen with accessible progress, staged status text, and a mobile-data hint.
- Added a WebGL preflight before the runtime begins, so unsupported devices receive a clear explanation instead of a blank page.
- Startup now waits for the game initialization promise, classifies resource-load failures, and provides a one-tap reload action.
- Added an automated Phase 3 test for the loading shell, safe text rendering, device checks, and error recovery wiring.

## v1.8.0 Mobile Performance & Delivery Optimization

- Production builds use compressed KTX2 textures and Draco GLB models where the validated scene permits them.
- The deployment output removes duplicate uncompressed asset variants, legacy font formats, and source-only readme files.
- Mobile and Low profiles include adaptive resolution, balanced render budgets, and safer texture/shadow limits.
- Large resource batches use a device-aware loading queue; the renderer pauses while the page is hidden.

## v1.7.0 Release Cleanup & QA

- Removed only the disconnected legacy landing-title model data from `areas.glb`; the active **SARHANG** title, its physical colliders, and the Kurdistan flag anchor are preserved.
- Added a repeatable `npm run release-check` gate that verifies source integrity, performs a production build, then checks the release output and critical asset inventory.
- The release package contains no `node_modules` or generated `dist` directory. Vercel and Termux generate these from the locked dependency set.
- The remaining Vite `engine-three` size message is an advisory for the required renderer cache chunk, not a runtime error. It remains visible rather than being hidden.

## 2026 Visual Quality Update

- **High** keeps the full visual stack: depth-of-field, bloom, neon glow, dynamic lighting, water blur, rich shadows, and all motion effects.
- On desktop, High now selects a hidden **Balanced / High / Ultra** profile from CPU cores, reported memory, GPU limits and actual frame time. The menu remains only **High / Low**.
- Premium desktop hardware starts with a higher internal render scale, then automatically steps up or down in small increments to protect smooth frame pacing.
- Ultra-capable desktop hardware receives a larger render-pixel budget, 4K shadow maps, 7-mip bloom, denser depth-of-field sampling, 16× texture filtering and AgX tone mapping for stronger neon highlight detail.
- **Low** preserves the same world and visual language, while reducing only render scale, shadow resolution, bloom passes, and depth-of-field cost for smoother mobile play.
- The browser's animation loop follows the display cadence; the adaptive governor uses observed frame time instead of assuming a fixed refresh rate.
- WebGL fallback is selected directly when WebGPU is unavailable, preventing an unnecessary WebGPU initialization attempt.
- The guarded Three.js WebGL uniform-buffer fix remains applied at install time for dynamic node buffers.
- Vehicle steering remains tighter at low speed and progressively stabilized at higher speed.
- The Kurdistan flag keeps its optimized cloth mesh, bright emissive fabric treatment, and GLB-authored anchor beside the final `G`.

## Gameplay Features

- Drive an off-road vehicle through a stylized 3D island.
- Explore landmarks, interactive points, map locations, and environmental details.
- Use touch controls, keyboard and mouse, or a compatible gamepad.
- Open map, garage, achievements, profile, settings, messages, and information panels.
- Experience time-of-day changes, fog, wind, water, lighting, particles, sound, and world interactions.
- Interact with the physical **SARHANG** title landmark and Kurdistan flag landmark.
- Use graphics, audio, camera, vibration, and control options for different devices.

## Technical Stack

| Layer | Technology |
| --- | --- |
| 3D rendering | Three.js with WebGL / WebGPU renderer support |
| Physics | Rapier 3D |
| Build tool | Vite |
| Language | Modern JavaScript modules |
| Animation | GSAP |
| Audio | Howler.js |
| Styling | Stylus |
| Assets | GLB, KTX, PNG, WebP, SVG, WOFF |

## Controls

### Mobile and tablet

| Action | Input |
| --- | --- |
| Drive | On-screen touch controls |
| Camera and zoom | Touch gestures |
| Interact | Nearby interaction prompt |
| Open menus | Interface buttons |

### Keyboard and mouse

| Action | Input |
| --- | --- |
| Drive | `W A S D` or arrow keys |
| Camera | Mouse |
| Interact | `E` or `Enter` |
| Open map | `M` |
| Open menu | `Esc` |

## Run Locally

```bash
git clone https://github.com/sarhang-cs/4x4-COUKOO.git
cd 4x4-COUKOO
npm install
npm run dev
```

Open the local address shown by Vite, usually:

```text
http://localhost:5173
```

## Production Build

```bash
npm run build
npm run preview
```

## PWA and Production Launch

The production build is installable as a Progressive Web App. In the game, open **Options → Install app** to install it on supported browsers, or use **Share → Add to Home Screen** on iPhone and iPad.

For absolute canonical and social-preview URLs, set this before the final build:

```bash
VITE_SITE_URL=https://your-public-domain.example
```

When it is blank, the build uses portable relative paths and remains compatible with GitHub Pages repository URLs. See `DEPLOYMENT-CHECKLIST.md` for the final hosting checklist.

## Deploy on Vercel

Use these values when importing the repository:

```text
Framework Preset: Vite
Install Command: npm install --no-audit --no-fund
Build Command: npm run build
Output Directory: dist
Node.js Version: 22.12+ (Node 24 is also supported)
```

## Project Structure

```text
4x4-COUKOO/
├── scripts/                 Build utilities
├── sources/                 Core game source
│   ├── Game/                Gameplay, physics, rendering, UI, and world systems
│   ├── data/                Game data and content definitions
│   ├── style/               Stylus stylesheets
│   ├── index.html           Application shell and share metadata
│   └── index.js             Application entry point
├── static/                  Models, textures, sounds, fonts, icons, and images
│   └── readme/              GitHub README screenshots
├── package.json             Dependencies and scripts
├── vite.config.js           Vite configuration
├── LICENSE                  MIT license text
└── README.md                Project documentation
```

## Performance Notes

- The first visit can take longer because the game loads 3D models, textures, audio, and shaders.
- A modern browser with hardware acceleration enabled is recommended.
- Mobile WebGL fallback uses a direct rendering path and a reduced pixel ratio to keep frame time stable.
- Use the in-game quality settings on lower-end devices.
- Close unused browser tabs to keep more memory available on mobile devices.

## Game Loop

#### 0

- Time
- Inputs

#### 1

- Player:pre-physics (Inputs)

#### 2

- PhysicalVehicle:pre-physics (Player:pre-physics)

#### 3

- Physics

#### 4

- PhysicsWireframe (Physics)
- Objects (Physics)

#### 5

- PhysicalVehicle:post-physics (Player:pre-physics)

#### 6

- Player:post-physics (Physics, PhysicalVehicle:post-physics)

#### 7

- View (Inputs, Player:post-physics)

#### 8

- Intro
- DayCycles
- YearCycles
- Weather (DayCycles, YearCycles)
- Zones (Player:post-physics)
- VisualVehicle (PhysicalVehicle:post-physics, Inputs, Player:post-physics, View)

#### 9

- Wind (Weather)
- Lighting (DayCycles, View)
- Tornado (DayCycles, PhysicalVehicle)
- InteractivePoints (Player:post-physics)
- Tracks (VisualVehicle)

#### 10

- Area++ (View, PhysicalVehicle:post-physics, Player:post-physics, Wind)
- Foliage (VisualVehicle, View)
- Fog (View)
- Reveal (DayCycles)
- Terrain (Tracks)
- Trails (PhysicalVehicle)
- Floor (View)
- Grass (View, Wind)
- Leaves (View, PhysicalVehicle)
- Lightnings (View, Weather)
- RainLines (View, Weather, Reveal)
- Snow (View, Weather, Reveal, Tracks)
- VisualTornado (Tornado)
- WaterSurface (Weather, View)
- Benches (Objects)
- Bricks (Objects)
- ExplosiveCrates (Objects)
- Fences (Objects)
- Lanterns (Objects)
- Whispers (Player)

#### 13

- InstancedGroup (Objects, [SpecificObjects])

#### 14

- Audio (View, Objects)
- Notifications
- Title (PhysicalVehicle:post-physics)

#### 998

- Rendering


## License

**4X4 COUKOO** is distributed under the MIT License. See [LICENSE](./LICENSE).

## Developer

**Sarhang Salah**  
SARHANG IO  
GitHub: [@sarhang-cs](https://github.com/sarhang-cs)  
Email: [sarhang.pasha123@gmail.com](mailto:sarhang.pasha123@gmail.com)

## Social Links

| Platform | Link |
| --- | --- |
| Facebook | [facebook.com/sarhang721](https://www.facebook.com/sarhang721) |
| Instagram | [instagram.com/sarhang.io](https://www.instagram.com/sarhang.io) |
| YouTube | [youtube.com/@gamepixel1](https://youtube.com/@gamepixel1) |
| Discord | [discord.gg/5JrmtR8wQS](https://discord.gg/5JrmtR8wQS) |
| Twitch | [twitch.tv/sarhangpasha1](https://twitch.tv/sarhangpasha1) |
| TikTok | [tiktok.com/@sarhang.io](https://www.tiktok.com/@sarhang.io) |
| Telegram | [t.me/sarhang_salah](https://t.me/sarhang_salah) |
| WhatsApp | [wa.me/9647501504608](https://wa.me/9647501504608) |
| X | [x.com/PashaSarha1818](https://x.com/PashaSarha1818) |
| Snapchat | [snapchat.com/add/sc.sarhang](https://www.snapchat.com/add/sc.sarhang) |
| LinkedIn | [linkedin.com/in/sarhang-pasha-8a9501351](https://www.linkedin.com/in/sarhang-pasha-8a9501351) |
| GitHub | [github.com/sarhang-cs](https://github.com/sarhang-cs) |
| Behance | [behance.net/sarhangsalah](https://www.behance.net/sarhangsalah) |
| Pinterest | [pin.it/3ejIOES6j](https://pin.it/3ejIOES6j) |

---

<div align="center">

**4X4 COUKOO** · **SARHANG IO** · Drive · Explore · Discover · 2026

[Back to top](#top)

</div>

## Rendering Compatibility

- Mobile browsers use the WebGL fallback directly when WebGPU is unavailable, avoiding experimental WebGPU initialisation noise.
- WebGL fallback uploads dynamic uniform buffers safely at their exact size, preventing repeated GL uniform-buffer warnings.
- Audio objects are created only after the first start interaction, following browser autoplay requirements.

## Production bundle architecture

The production build uses real code splitting rather than suppressing Vite's bundle advisory:

- The HTML bootstrap dynamically imports the 3D game runtime.
- Three.js is emitted as a dedicated long-lived `engine-three` cache chunk.
- Rapier physics remains a dynamic `engine-physics` chunk while world assets load.
- Tweakpane debug tooling loads only with `#debug`.
- The MessagePack codec loads only when `VITE_SERVER_URL` is enabled.
- Motion, camera, audio, input, text and random utilities use stable vendor chunks.

`chunkSizeWarningLimit` is set to 1500 kB only after this split, matching the required Three.js WebGPU engine chunk. The build will warn again if a chunk grows beyond that intentional engine budget.

## Phase 5 settings
The Options panel now includes persistent High / Medium / Low graphics presets, master volume, Auto/60/30 FPS selection, shadow mode, vibration, and full-screen display controls. Run `npm test` to include all Phase 1–5 checks.

## Phase 6 — UX, Tutorial, and Pause
- A first-drive tutorial appears once after the opening reveal, with touch, keyboard, and gamepad guidance.
- The Controls panel includes a replay-tutorial action.
- Press `P` or gamepad `Start` for a real Pause menu; it freezes game-time and audio safely.
