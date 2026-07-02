
## v1.14.1 — UI, audio and PWA stability

- Prevented premature AudioContext setup before the first player gesture.
- Made waiting service-worker activation silent during startup to avoid repeating update prompts.
- Stabilized and enlarged the intro start-label layout on mobile.

# Changelog

## v1.14.0 — Clean Rebuild

- Consolidated legacy phase checks into a focused release test and audit system.
- Removed historical patch manifests, phase notes and redundant verification scripts from the project root.
- Refactored browser/device capability reporting so it uses only browser-exposed facts and clearly labels unavailable hardware details.
- Consolidated FPS capability logic: every quality preset can select any browser-supported frame rate; Auto selects a quality-aware target.
- Preserved archive-only seasons, rain, lightning, ground-fire effects and original audio assets.
- Rebuilt PWA cache version and production validation workflow.
