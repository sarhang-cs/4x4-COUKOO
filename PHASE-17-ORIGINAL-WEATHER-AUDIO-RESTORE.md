# Phase 17 — Original Archive Weather & Audio Restore

This patch reconnects the existing runtime weather/audio implementation to the exact assets retained from `folio-2025-main.zip`. No newly generated art, model, texture, particle, or sound file is included.

## Restored archive assets
- rain ambience: `sounds/rain/soundjay_rain-on-leaves_main-01.mp3`
- near thunder: three files in `sounds/thunder/near/`
- distant thunder: two files in `sounds/thunder/distant/`
- fire sounds: original `sounds/fire/Fire Burning.mp3` and `sounds/fire/ignite-1.mp3`

## Runtime fixes
- Audio waits for each original file to finish loading before playback and unlocks the mobile audio context after user gestures or tab returns.
- Spring/autumn are wetter; winter is cold enough for the existing snow system to engage.
- Rain/storm drives the existing thunder classes; storm ground strikes use the original `Lightnings` and `Fireballs` implementation.
- No external or generated asset is added.
