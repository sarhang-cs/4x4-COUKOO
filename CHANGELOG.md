# Changelog

## v1.14.0 — Clean Rebuild

- Consolidated legacy phase checks into a focused release test and audit system.
- Removed historical patch manifests, phase notes and redundant verification scripts from the project root.
- Refactored browser/device capability reporting so it uses only browser-exposed facts and clearly labels unavailable hardware details.
- Consolidated FPS capability logic: every quality preset can select any browser-supported frame rate; Auto selects a quality-aware target.
- Preserved archive-only seasons, rain, lightning, ground-fire effects and original audio assets.
- Rebuilt PWA cache version and production validation workflow.
