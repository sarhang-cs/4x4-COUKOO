import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const projectRoot = resolve(import.meta.dirname, '..')
const staticRoot = join(projectRoot, 'static')
const sourcesRoot = join(projectRoot, 'sources')
const failures = []

const assert = (condition, message) =>
{
    if(!condition)
        failures.push(message)
}

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

const sourceFiles = walk(sourcesRoot).filter((file) => /\.(js|html|styl)$/.test(file))

// Local JavaScript imports must resolve from the source tree.
for(const file of sourceFiles.filter((item) => item.endsWith('.js')))
{
    const content = readFileSync(file, 'utf8')
    const imports = content.matchAll(/(?:import|export)\s+(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]/g)

    for(const match of imports)
    {
        const importPath = match[1]
        if(!importPath.startsWith('.'))
            continue

        const resolved = resolve(join(file, '..'), importPath)
        assert(existsSync(resolved), `Missing local import: ${relative(projectRoot, file)} -> ${importPath}`)
    }
}

// Public images, fonts and icons referenced by the application must exist in static/.
const checkPublicPath = (publicPath, sourceFile) =>
{
    if(!publicPath || /^(https?:|data:|#|\.\/style\/)/.test(publicPath))
        return

    const normalized = publicPath.replace(/^\.\//, '').replace(/^\//, '')
    if(!/^(ui|fonts|favicons|social|readme|intro|respawns|behindTheScene|palette|vehicle|terrain|areas|timeMachine)\//.test(normalized))
        return

    assert(
        existsSync(join(staticRoot, normalized)),
        `Missing public asset: ${relative(projectRoot, sourceFile)} -> ${publicPath}`
    )
}

for(const file of sourceFiles.filter((item) => item.endsWith('.html')))
{
    const content = readFileSync(file, 'utf8')
    for(const match of content.matchAll(/(?:src|href)=["']([^"']+)["']/g))
        checkPublicPath(match[1], file)
}

for(const file of sourceFiles.filter((item) => item.endsWith('.styl')))
{
    const content = readFileSync(file, 'utf8')
    for(const match of content.matchAll(/url\((?:['"])?([^'"\)]+)(?:['"])?\)/g))
        checkPublicPath(match[1], file)
}

// Project identity and new Kurdistan flag assets are required.
for(const file of [ 'README.md', 'LICENSE', 'NOTICE', 'package.json', 'package-lock.json' ])
    assert(existsSync(join(projectRoot, file)), `Required root file is missing: ${file}`)

for(const file of [ 'static/ui/flags/ku.png', 'static/ui/flags/ku.webp' ])
    assert(existsSync(join(projectRoot, file)), `Required Kurdistan flag asset is missing: ${file}`)

const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8'))
assert(packageJson.name === '4x4-coukoo', 'package.json must use the 4x4-coukoo package name')
assert(packageJson.license === 'MIT', 'package.json must declare the MIT license')
assert(packageJson.dependencies.three === '0.185.0', 'package.json must pin Three.js 0.185.0 for the renderer guard')
assert(packageJson.version === '1.6.0', 'package.json must use version 1.6.0')
assert(!existsSync(join(projectRoot, 'scripts/compress.js')), 'Unused compression script must be removed')

const oldBrandPattern = new RegExp(
    [
        [ 'Br', 'uno\\s+', 'Sim', 'on' ].join(''),
        [ 'br', 'uno-s', 'imon' ].join(''),
        String.fromCharCode(98, 114, 117, 110, 111, 115, 105, 109, 111, 110),
        [ 'Fo', 'lio\\s*20', '25' ].join(''),
        [ 'MY[-\\s]?3D[-\\s]?GA', 'ME' ].join(''),
    ].join('|'),
    'i'
)
for(const file of [ ...sourceFiles, join(projectRoot, 'README.md'), join(projectRoot, 'package.json') ])
{
    const content = readFileSync(file, 'utf8')
    assert(!oldBrandPattern.test(content), `Legacy branding remains in ${relative(projectRoot, file)}`)
}

// Landing model integrity: the title is stored directly in areas.glb and must keep
// valid buffer references so Rapier can build its colliders at runtime.
const areasGlbPath = join(staticRoot, 'areas/areas.glb')
assert(existsSync(areasGlbPath), 'Landing areas GLB is missing')
if(existsSync(areasGlbPath))
{
    const glb = readFileSync(areasGlbPath)
    const jsonLength = glb.readUInt32LE(12)
    const glbJson = JSON.parse(glb.toString('utf8', 20, 20 + jsonLength))
    const binOffset = 20 + jsonLength + 8
    const binLength = glb.readUInt32LE(20 + jsonLength)

    assert(glb.toString('utf8', 0, 4) === 'glTF', 'areas.glb must be a GLB file')
    assert(binOffset + binLength === glb.length, 'areas.glb binary chunk length is invalid')

    const landing = glbJson.nodes.find((node) => node.name === 'landing')
    assert(Boolean(landing), 'areas.glb landing node is missing')

    const titleNodes = glbJson.nodes.filter((node) => /^refLettersPhysicalDynamic\d{3}$/.test(node.name ?? ''))
    assert(titleNodes.length === 7, `areas.glb must contain 7 SARHANG title meshes, found ${titleNodes.length}`)
    assert(glbJson.nodes.some((node) => node.name === 'refLandingFlagAnchor'), 'areas.glb flag anchor is missing')

    for(const [index, view] of glbJson.bufferViews.entries())
    {
        const offset = view.byteOffset ?? 0
        assert(offset + view.byteLength <= binLength, `areas.glb buffer view ${index} exceeds its binary chunk`)
    }
}


const renderingSource = readFileSync(join(sourcesRoot, 'Game/Rendering.js'), 'utf8')
assert(renderingSource.includes('canUseWebGPU()'), 'Renderer must verify WebGPU availability before initialising it')
assert(renderingSource.includes('forceWebGL: !useWebGPU'), 'Renderer must select WebGL directly when WebGPU is unavailable')
assert(renderingSource.includes('this.usePostprocessing = true'), 'Renderer must preserve post-processing in both quality modes')
assert(renderingSource.includes('profile.depthOfField'), 'Renderer must use the High/Low effects quality profile')
assert(renderingSource.includes('this.scenePassColor.add(this.bloomPass)'), 'Low quality must retain bloom effects')
assert(renderingSource.includes('applyTextureQuality()'), 'Adaptive texture quality is missing')
assert(renderingSource.includes('updateAdaptiveResolution()'), 'Desktop adaptive resolution governor is missing')
assert(renderingSource.includes('THREE.AgXToneMapping'), 'High desktop tone mapping is missing')

const qualitySource = readFileSync(join(sourcesRoot, 'Game/Quality.js'), 'utf8')
assert(qualitySource.includes("const STORAGE_KEY = '4x4-coukoo-quality'"), 'Quality preference persistence is missing')
assert(qualitySource.includes('getProfile(level = this.level)'), 'High/Low quality profiles are missing')
assert(qualitySource.includes("tier: ultraDesktop ? 'ultra'"), 'Adaptive desktop High profile is missing')
assert(qualitySource.includes('shadowMapSize: 4096'), 'Ultra desktop shadow quality is missing')
assert(qualitySource.includes('renderScaleInitial: 1.45'), 'Ultra desktop supersampling profile is missing')
assert(qualitySource.includes('adaptiveResolution: true'), 'Desktop adaptive resolution profile is missing')

const lightingSource = readFileSync(join(sourcesRoot, 'Game/Ligthing.js'), 'utf8')
assert(lightingSource.includes('applyQualityProfile()'), 'Lighting profile updates are missing')
assert(!lightingSource.includes("this.game.quality.events.on('change', () =>\n        {\n            this.mapSize"), 'Lighting must not register duplicate quality listeners')

const htmlSource = readFileSync(join(sourcesRoot, 'index.html'), 'utf8')
assert(!htmlSource.includes('rel="preload"'), 'Unused preload hints must be removed')

const vehicleSource = readFileSync(join(sourcesRoot, 'Game/Physics/PhysicsVehicle.js'), 'utf8')
assert(vehicleSource.includes('this.steeringAmplitude = 0.88'), 'Vehicle precision steering configuration is missing')

const flagSource = readFileSync(join(sourcesRoot, 'Game/World/Areas/LandingFlag.js'), 'utf8')
assert(flagSource.includes('emissiveMap: this.texture'), 'Flag cloth emissive texture is missing')
assert(flagSource.includes('segmentsX: 20'), 'Flag performance geometry configuration is missing')

const audioSource = readFileSync(join(sourcesRoot, 'Game/Audio.js'), 'utf8')
assert(audioSource.includes('item.createHowl'), 'Audio must defer Howl construction until interaction')
assert(audioSource.includes('if(!item.howl)'), 'Audio update must support deferred sound instances')

const uboPatchSource = readFileSync(join(projectRoot, 'scripts/patch-three-webgl-ubo-capacity.js'), 'utf8')
assert(uboPatchSource.includes('4X4_COUKOO_WEBGL_UBO_CAPACITY_GUARD'), 'WebGL UBO capacity guard is missing')
assert(uboPatchSource.includes('map._4x4UboByteLength'), 'Bind-group capacity tracking is missing')
assert(uboPatchSource.includes('bindingData._4x4UboByteLength'), 'Direct binding capacity tracking is missing')
assert(!existsSync(join(projectRoot, 'scripts/patch-three-webgl-ubo.js')), 'Legacy full-upload UBO patch must be removed')

const wavFiles = walk(staticRoot).filter((file) => file.endsWith('.wav'))
assert(wavFiles.length === 0, `Unused WAV assets remain: ${wavFiles.length}`)


// Bundle architecture: preserve real lazy boundaries instead of only raising
// Vite's warning threshold. These assertions keep the split strategy intact.
const viteConfigSource = readFileSync(join(projectRoot, 'vite.config.js'), 'utf8')
assert(viteConfigSource.includes('manualChunks'), 'Vite manual chunk strategy is missing')
assert(viteConfigSource.includes("return 'engine-three'"), 'Three.js engine cache chunk is missing')
assert(viteConfigSource.includes("return 'engine-physics'"), 'Rapier physics cache chunk is missing')
assert(viteConfigSource.includes("chunkSizeWarningLimit: 1500"), 'Three.js engine size threshold is missing')

const entrySource = readFileSync(join(sourcesRoot, 'index.js'), 'utf8')
assert(entrySource.includes("await import('./Game/Game.js')"), 'Game runtime must load through a dynamic import')
assert(entrySource.includes("await import('./threejs-override.js')"), 'Three override must load before the game runtime')

const debugSource = readFileSync(join(sourcesRoot, 'Game/Debug.js'), 'utf8')
assert(debugSource.includes("import('tweakpane')"), 'Debug tools must be lazy loaded')
assert(!debugSource.includes("from 'tweakpane'"), 'Debug tools must not be statically imported')

const serverSource = readFileSync(join(sourcesRoot, 'Game/Server.js'), 'utf8')
assert(serverSource.includes("import('@msgpack/msgpack')"), 'Server codec must be lazy loaded')
assert(!serverSource.includes("from 'uuid'"), 'Server must use native crypto UUIDs instead of bundling uuid')

if(failures.length)
{
    console.error('\nProject verification failed:\n')
    for(const failure of failures)
        console.error(`- ${failure}`)

    process.exit(1)
}

console.log(`Project verification passed: ${sourceFiles.length} source files checked.`)

