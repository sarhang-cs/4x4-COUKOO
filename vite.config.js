import 'dotenv/config'
import wasm from 'vite-plugin-wasm'

const normalizeId = (id) => id.replace(/\\/g, '/')

/**
 * Deliberate cache groups:
 * - the renderer is a required startup engine and has its own long-lived chunk;
 * - Rapier, debug tools and multiplayer codec are loaded only when needed;
 * - small runtime libraries are cached independently from application changes.
 */
const manualChunks = (rawId) =>
{
    const id = normalizeId(rawId)

    if(!id.includes('/node_modules/'))
        return undefined

    if(id.includes('/node_modules/three/'))
        return 'engine-three'

    if(id.includes('/node_modules/@dimforge/rapier3d/'))
        return 'engine-physics'

    if(id.includes('/node_modules/tweakpane/') || id.includes('/node_modules/@tweakpane/'))
        return 'debug-tools'

    if(id.includes('/node_modules/@msgpack/msgpack/'))
        return 'server-codec'

    if(id.includes('/node_modules/gsap/'))
        return 'runtime-motion'

    if(id.includes('/node_modules/howler/'))
        return 'runtime-audio'

    if(id.includes('/node_modules/camera-controls/'))
        return 'runtime-camera'

    if(id.includes('/node_modules/seedrandom/'))
        return 'runtime-random'

    if(id.includes('/node_modules/emoji-regex/'))
        return 'runtime-text'

    if(id.includes('/node_modules/normalize-wheel/'))
        return 'runtime-input'

    return undefined
}

export default {
    root: 'sources/',
    envDir: '../',
    publicDir: '../static/',
    base: './',
    server:
    {
        host: true,
        open: true
    },
    build:
    {
        outDir: '../dist',
        emptyOutDir: true,
        target: 'esnext',
        sourcemap: false,
        // A WebGPU renderer is intentionally a single engine module in Three.js.
        // The threshold reflects that required engine chunk after real splitting;
        // app/runtime chunks remain far below it and are still reported normally.
        chunkSizeWarningLimit: 1500,
        rollupOptions:
        {
            output:
            {
                manualChunks,
                chunkFileNames: 'assets/[name]-[hash].js',
                entryFileNames: 'assets/[name]-[hash].js',
                assetFileNames: 'assets/[name]-[hash][extname]'
            }
        }
    },
    plugins:
    [
        wasm(),
    ]
}
