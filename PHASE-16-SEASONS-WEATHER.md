# Phase 16 — Live Seasons, Rain, Snow, Storms and Lightning

## What was fixed
The complete rain, snow, thunder and lightning runtime assets already existed in the game build. They were not visibly active in normal play because the seasonal cycle was configured as a real 365-day year and the cloud calculation ignored the season cloud baseline.

## New live environment system
- A complete in-game year takes **12 minutes** in Auto mode: spring, summer, autumn and winter each remain active for roughly three minutes.
- New **Season** setting: Auto, Spring, Summer, Autumn, Winter.
- New **Weather** setting: Auto, Clear, Rain, Storm, Snow.
- Manual Weather controls use the real world systems: 3D rain lines, snow particles/accumulation, wind, rain audio, thunder, lightning and ground-strike effects.
- Spring and autumn now produce more natural rain opportunities. Winter converts rainy conditions into snow.
- Storm lightning is limited to a readable/safe strike rate rather than attempting one explosion per second.
- Tree foliage colors and falling-leaf density now visibly change with the active season.
- Rain/storm conditions dim lighting and reduce visibility through the existing fog system.

## Runtime assets retained
- `static/sounds/rain/soundjay_rain-on-leaves_main-01.mp3`
- all `static/sounds/thunder/near/*.mp3`
- all `static/sounds/thunder/distant/*.mp3`
- terrain, foliage, snow, rain and lightning runtime models/textures

No Bruno, Blender, PSD, Band, source-preview or editing-only assets are included in this patch.
