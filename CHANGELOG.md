# Changelog

## v1.7.0 — Final Release Cleanup & QA

- Removed 20 disconnected legacy landing-title nodes and 10 meshes from `static/areas/areas.glb`.
- Reduced `areas.glb` from 3,660,596 bytes to 3,599,388 bytes while preserving the active scene graph, 7 physical `SARHANG` title meshes, and the Kurdistan flag anchor.
- Added the `release-check` script and a release audit for source, build output, sound count, GLB integrity, and lazy-chunk boundaries.
- Consolidated release documentation.

## v1.6.0 — Desktop High / Ultra Quality

- Added adaptive Balanced / High / Ultra desktop rendering under the single visible High setting.
- Preserved Mobile High and Low behavior.
