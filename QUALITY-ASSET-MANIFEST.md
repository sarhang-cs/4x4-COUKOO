# High / Medium / Low asset map

This release keeps one game runtime and one settings system. Quality changes do not
switch to separate projects.

| Preset | Runtime source | Included behaviour |
| --- | --- | --- |
| High | Full archive plus Phase 10 runtime | Full PNG/GLB assets, lossless WAV playlist, maximum renderer profile, all existing season/weather/world systems |
| Medium | 4x4-COUKOO-main asset set plus Phase 10 runtime | Full PNG/GLB runtime assets, original MP3 playlist, and balanced renderer profile |
| Low | Phase 10 runtime | KTX/Draco optimized assets and the low renderer profile |

## Imported full-archive runtime assets

- `static/sounds/musics/high/Boy.wav`
- `static/sounds/musics/high/Baguira.wav`
- `static/sounds/musics/high/Sudo.wav`

## Explicitly excluded

Authoring, backup, legacy-brand, and non-runtime source files are intentionally not
shipped: Blender files, Photoshop files, GarageBand projects, preview videos,
reference boards, and Bruno-related files. These do not affect the running game.

The original and Medium archives were compared before merge. Season, weather,
world, animation, particle, texture, KTX, GLB, and normal runtime MP3 assets are
already present in the current Phase 10 runtime; only the full-archive lossless
music masters were missing as runtime assets.
