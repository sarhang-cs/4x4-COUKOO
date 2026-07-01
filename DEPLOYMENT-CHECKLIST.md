# 4X4 COUKOO — Production Deployment Checklist

## 1. Publish the deploy ZIP

Extract the phase deploy ZIP so `index.html` is at the site root. This build supports GitHub Pages, Netlify, and Vercel.

## 2. Use HTTPS

PWA installation, the service worker, and offline support only activate on HTTPS (or localhost during development).

## 3. Optional: set the public URL before a final rebuild

For the strongest social preview and canonical metadata, set this in your hosting build environment or `.env.production`:

```bash
VITE_SITE_URL=https://your-public-domain.example
```

Use the exact public HTTPS origin, without a trailing slash. The game remains portable when it is blank, which is useful for GitHub Pages repository URLs.

## 4. Verify after publishing

- Open the site once online and wait for **Offline play: Ready** in Options.
- Reload once; this lets the active service worker control the page.
- Test **Install app** in Chrome/Edge Android or desktop. On iOS, use Share → Add to Home Screen.
- Open the deployed URL in a social-preview debugger to confirm the 1200 × 630 share card.
- Test one Low, Medium, and High graphics run on a real mobile device.

## 5. Updates

Deploy a new build normally. When a refreshed service worker is waiting, the game shows **Update ready**; tapping it reloads into the new version.
