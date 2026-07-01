import 'dotenv/config'
import { existsSync, readdirSync, rmSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import wasm from 'vite-plugin-wasm'

const normalizeId = (id) => id.replace(/\\/g, '/')

const walk = (directory, files = []) =>
{
    for(const entry of readdirSync(directory, { withFileTypes: true }))
    {
        const entryPath = join(directory, entry.name)
        if(entry.isDirectory())
            walk(entryPath, files)
        else
            files.push(entryPath)
    }

    return files
}

const getSize = (path) =>
{
    const stats = statSync(path)
    if(!stats.isDirectory())
        return stats.size

    return readdirSync(path).reduce((total, name) => total + getSize(join(path, name)), 0)
}

const removeIfPresent = (path) =>
{
    if(!existsSync(path))
        return 0

    const bytes = getSize(path)
    rmSync(path, { recursive: true, force: true })
    return bytes
}

const getPublicSiteUrl = (value = '') =>
{
    try
    {
        const url = new URL(value)
        if(url.protocol !== 'https:' && url.protocol !== 'http:')
            return ''

        return url.href.replace(/\/+$/, '')
    }
    catch(error)
    {
        return ''
    }
}

const siteMetadata = (siteUrl) => ({
    name: '4x4-coukoo-site-metadata',
    transformIndexHtml(html)
    {
        const baseUrl = getPublicSiteUrl(siteUrl)
        const canonical = baseUrl ? `${baseUrl}/` : './'
        const shareImage = baseUrl ? `${baseUrl}/social/share-image.jpg` : './social/share-image.jpg'

        return html
            .replaceAll('__COUKOO_CANONICAL_URL__', canonical)
            .replaceAll('__COUKOO_SHARE_IMAGE_URL__', shareImage)
    },
})

/**
 * Production uses KTX2/Draco variants. The source folder intentionally keeps
 * authoring fallbacks, while this plugin excludes duplicate files from dist.
 */
const pruneProductionVariants = (enabled) => ({
    name: 'prune-production-variants',
    writeBundle()
    {
        if(!enabled)
            return

        const distRoot = resolve('dist')
        if(!existsSync(distRoot))
            return

        let removedFiles = 0
        let removedBytes = 0
        const remove = (path) =>
        {
            const bytes = removeIfPresent(path)
            if(bytes)
            {
                removedFiles++
                removedBytes += bytes
            }
        }

        for(const path of walk(distRoot))
        {
            const normalizedPath = normalizeId(path)
            if(normalizedPath.endsWith('.glb') && !normalizedPath.endsWith('-compressed.glb') && !normalizedPath.endsWith('/areas/areas.glb'))
            {
                const compressedPath = path.replace(/\.glb$/, '-compressed.glb')
                if(existsSync(compressedPath))
                    remove(path)
            }
            else if(path.endsWith('.png'))
            {
                const compressedPath = path.replace(/\.png$/, '.ktx')
                if(existsSync(compressedPath))
                    remove(path)
            }
        }

        // The validated landing scene currently needs the uncompressed areas GLB.
        remove(join(distRoot, 'areas/areas-compressed.glb'))

        // These are source-only documentation and legacy font formats. Modern
        // target browsers use WOFF2, and no runtime URL references these files.
        remove(join(distRoot, 'readme'))
        for(const path of walk(distRoot))
        {
            if(/\/fonts\/Pally-(Bold|Medium|Regular)\.(eot|ttf|woff)$/.test(path.replace(/\\/g, '/')) || /\/fonts\/Pally-Variable\./.test(path.replace(/\\/g, '/')) || /\/(basis|draco)\/README\.md$/.test(path.replace(/\\/g, '/')))
                remove(path)
        }

        console.log(`✓ Production asset prune: removed ${removedFiles} duplicate/source-only files (${(removedBytes / 1024 / 1024).toFixed(2)} MB)`) 
    },
})

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

export default defineConfig(({ mode }) =>
{
    const env = loadEnv(mode, process.cwd(), '')
    const compressedProduction = env.VITE_COMPRESSED === '1'

    return {
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
            siteMetadata(env.VITE_SITE_URL),
            wasm(),
            pruneProductionVariants(compressedProduction),
        ]
    }
})
