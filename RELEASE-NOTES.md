# 4X4 COUKOO v1.7.0 — Final Release Cleanup & QA

## Scope

This update is a release-cleanup pass. It does not remove gameplay content, UI, physics, sound effects, world effects, or High/Low quality behavior.

## Cleanup performed

- The disconnected legacy title data was removed from `static/areas/areas.glb`.
- The active landing scene remains intact: 7 `SARHANG` physical title meshes and `refLandingFlagAnchor` are retained.
- `areas.glb` is 61,208 bytes smaller after this targeted cleanup.
- Old phase-specific documentation was consolidated into this release note and `CHANGELOG.md`.

## Release gate

```bash
npm run release-check
```

The command runs source verification, a production build, and a post-build audit.

## Known build note

Vite reports the required `engine-three` renderer chunk as slightly above its 1500 kB advisory threshold. The project uses real dynamic imports and manual chunks. The advisory remains visible; it is neither suppressed nor a runtime error.
