# 4X4 COUKOO v1.6.0 — Desktop High / Ultra Quality

This release completes the desktop-graphics quality stage without removing any world effect, audio asset, UI feature or gameplay system.

## What changed

- High remains a single user-facing setting; desktop devices now receive an internal Balanced, High or Ultra profile after capability detection.
- High desktop rendering starts above native scale on capable devices, subject to a strict render-pixel budget so 1440p and 4K displays do not allocate excessive frame buffers.
- An adaptive-resolution governor samples real frame time every few seconds. It reduces internal scale only after sustained pressure and increases it only after sustained headroom.
- Premium desktop profiles raise bloom quality, depth-of-field sampling, shadow quality, texture anisotropy and tone-mapping exposure.
- Mobile High and Low profiles remain protected from desktop-only render scaling.

## Validation

```bash
npm run verify
npm run build
```

Both commands passed before packaging. Vite still reports the required `engine-three` chunk as slightly above the 1500 kB advisory threshold. The application chunks are truly split; the remaining warning is not hidden and will be handled only by a future engine-loading refactor.
