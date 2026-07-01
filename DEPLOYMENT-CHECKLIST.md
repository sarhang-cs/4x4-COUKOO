# Deploy checklist — Unified Quality v1.13.1

1. Upload the **deploy ZIP** contents to a static host, or use it as the `gh-pages` branch root.
2. For GitHub Pages, select the branch/folder that contains `index.html` as the Pages source.
3. Open the game once while online so the service worker can install.
4. In Settings, test the graphics profiles:
   - **Low ↔ Medium/High**: one reload is expected; it switches between KTX/Draco and full PNG/GLB assets.
   - **High ↔ Medium**: no world reload is expected; renderer and music source switch in place.
   - **High**: start the jukebox after the intro interaction to play WAV masters.
5. Test Low on a phone, Medium on an average device, and High on a strong desktop/high-end device.
6. If you replace this release later, make sure the service-worker cache version is bumped so installed users receive the update.
