# Phase 10 — PWA, Offline Shell & Production Launch Readiness

- Added an installable web-app manifest that works from a GitHub Pages repository subpath as well as Netlify and Vercel roots.
- Added a root service worker with an offline shell, runtime asset caching after successful loads, safe cache versioning, and controlled app updates.
- Added an `Install app` control plus live `Offline play` status in Options, including iOS Add to Home Screen guidance.
- Added an offline recovery page instead of a generic browser failure page.
- Made canonical, Open Graph, Twitter, favicon, manifest, and share-image URLs portable under subpath hosting.
- Added `VITE_SITE_URL` build-time metadata support so a real deployed URL can generate absolute social-preview URLs.
- Added Netlify (`_headers`) and Vercel cache rules to ensure service-worker updates are never stuck behind browser caches.
- Added Phase 10 regression coverage and production release-audit checks.

## Intentional limits

- No third-party analytics SDK was added. Analytics require a chosen provider, endpoint, privacy policy, and consent strategy; the release contains no silent tracker.
- The 3D assets are cached only after the browser successfully downloads them. The app shell and offline recovery screen are available immediately after PWA activation, while complete offline driving depends on available storage and the assets that the device has already cached.
