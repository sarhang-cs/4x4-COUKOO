# 4X4 COUKOO — Phase 6 Changelog

## UX, Tutorial, and Pause Menu

### Guided first drive
- Added a four-step first-drive tutorial after the opening reveal.
- Tutorial guidance adapts its control hint for keyboard, touch, and gamepad players.
- Players can continue, skip, or replay the tutorial from the Controls panel.
- Completion is stored in the existing device save so it only appears automatically once.

### Real pause state
- Added a dedicated Pause menu with Resume, Map, Settings, Reset World, and Quick Menu actions.
- Press `P` on keyboard or `Start` on a gamepad to pause or resume.
- Pause sets the game-time scale to zero, clears held inputs, and suspends audio safely.
- Resume restores the correct wandering or racing input mode.

### Reliability and accessibility
- Added focus handling, semantic dialogs, keyboard/gamepad tutorial navigation, and input-reset protection for stuck movement.
- Added automated Phase 6 coverage in `scripts/test-phase6.js`.
