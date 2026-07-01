# 4X4 COUKOO — Phase 5 Changelog

## Complete Settings Suite

### Graphics presets
- Replaced the binary graphics button with three persistent presets: **High**, **Medium**, and **Low**.
- Existing saves remain compatible: the older `0 = High` and `1 = Low` values are preserved; `2 = Medium` is new.
- Medium is tuned for balanced phones, tablets, and mid-range desktops.
- Low turns off expensive shadow rendering by default and lowers texture, bloom, render-scale, and pixel-budget targets.

### Performance controls
- Added a persistent **Frame rate** control: `Auto`, `60 FPS`, and `30 FPS`.
- Frame-rate limiting skips unnecessary GPU frames while retaining the simulation update path.
- Added persistent **Shadows** modes: `Auto`, `On`, and `Off`.
- Added a live performance readout with renderer backend, graphics preset, and current render scale.

### Audio controls
- Added a persistent master volume slider from 0% to 100%.
- Kept mute behavior intact and synchronized it with accessible button state.

### Mobile & display
- Added a persistent **Vibration** switch.
- Strong vehicle impacts now use the browser vibration API when available and enabled.
- Added a Full screen control with browser capability and failure handling.

### Save compatibility
- Save schema now validates and persists `audioVolume`, `shadows`, `fpsLimit`, and `vibration`.
- Existing phase-4 save data is normalized automatically without erasing progress.

### Reliability
- Water visual output now changes safely for all three graphics presets.
- Renderer and directional lighting both react to shadow and preset changes.
- Added automated Phase 5 coverage in `scripts/test-phase5.js`.
