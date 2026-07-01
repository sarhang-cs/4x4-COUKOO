# 4X4 COUKOO v1.13.0
## Unified three-tier quality release

High uses the retained lossless music masters and the highest renderer profile. Medium uses the supplied balanced archive behaviour. Low keeps the existing Phase 10 optimized profile. Weather, seasons, world animation, effects, missions, saves, PWA, and all gameplay systems remain one shared runtime.

# 4X4 COUKOO — Phase 10 Release Notes

Phase 10 makes the static production build installable and safer to publish.

## Added

- **Install App** in Options: supported browsers can install 4X4 COUKOO as a full-screen app. On iPhone and iPad, the control explains the Share → Add to Home Screen route.
- **Offline Play status** in Options: shows whether the PWA app shell is active and whether the browser is currently online.
- **Offline recovery**: when a navigation request happens without a connection, users see a branded recovery page instead of a generic browser error.
- **Cache updates**: the service worker keeps app-shell and already-used runtime assets available, removes older versioned caches, and displays a safe update notification when a newer build is waiting.
- **SEO/social preview**: canonical, Open Graph, Twitter, favicon and manifest paths work under GitHub Pages project URLs as well as root-domain hosting. The included share image is 1200 × 630.

## Before final deployment

Set `VITE_SITE_URL` to your public HTTPS address before building when you want absolute canonical and social-preview URLs. Example:

```bash
VITE_SITE_URL=https://your-project.netlify.app
```

The deploy ZIP works without this variable; it falls back to portable relative URLs for GitHub Pages.

## Important behavior

- The initial 3D launch still requires an internet connection. Game assets are then cached after successful loading, subject to the browser's available storage.
- No analytics or tracking SDK is included. Adding analytics needs a separate provider, endpoint, consent decision, and privacy policy.
- The PWA install and service worker require HTTPS (GitHub Pages, Netlify, and Vercel all provide it).

## v1.13.1 — Final quality audit

- Fixed the only runtime issue found in the unified quality review: playlist quality changes are retained during a jukebox disc transition.
- Updated the PWA cache version so installed users receive this build.
