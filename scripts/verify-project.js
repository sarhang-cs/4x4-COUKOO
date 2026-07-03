import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const sources = join(root, 'sources')
const staticRoot = join(root, 'static')
const failures = []

const fail = (message) => failures.push(message)
const assert = (condition, message) => { if(!condition) fail(message) }

const walk = (directory, files = []) =>
{
    for(const entry of readdirSync(directory, { withFileTypes: true }))
    {
        const path = join(directory, entry.name)
        if(entry.isDirectory()) walk(path, files)
        else files.push(path)
    }
    return files
}

const sourceFiles = walk(sources).filter((file) => /\.(?:js|html|styl)$/.test(file))
const staticFiles = walk(staticRoot)

for(const file of sourceFiles.filter((item) => item.endsWith('.js')))
{
    const content = readFileSync(file, 'utf8')
    for(const match of content.matchAll(/(?:import|export)\s+(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]/g))
    {
        const request = match[1]
        if(!request.startsWith('.')) continue
        const resolved = resolve(join(file, '..'), request)
        assert(existsSync(resolved), `Missing local import: ${relative(root, file)} -> ${request}`)
    }
}

const assetExists = (url, file) =>
{
    if(!url || /^(?:https?:|data:|#|\.\/style\/)/.test(url)) return
    const normalized = url.replace(/^\.\//, '').replace(/^\//, '')
    if(!/^(?:ui|fonts|favicons|social|intro|respawns|behindTheScene|palette|vehicle|terrain|areas|timeMachine)\//.test(normalized)) return
    assert(existsSync(join(staticRoot, normalized)), `Missing public asset: ${relative(root, file)} -> ${url}`)
}

for(const file of sourceFiles.filter((item) => item.endsWith('.html')))
{
    const content = readFileSync(file, 'utf8')
    for(const match of content.matchAll(/(?:src|href)=["']([^"']+)["']/g)) assetExists(match[1], file)
}
for(const file of sourceFiles.filter((item) => item.endsWith('.styl')))
{
    const content = readFileSync(file, 'utf8')
    for(const match of content.matchAll(/url\((?:['"])?([^'"\)]+)(?:['"])?\)/g)) assetExists(match[1], file)
}

const forbiddenRuntime = /(?:^|\/)(?:[^/]*bruno[^/]*|[^/]+\.(?:blend1?|psd|band|pur|mp4))$/i
for(const file of staticFiles)
    assert(!forbiddenRuntime.test(file.replaceAll('\\', '/')), `Authoring-only asset is shipped: ${relative(root, file)}`)

for(const file of [ 'README.md', 'LICENSE', 'NOTICE', 'package.json', 'package-lock.json', 'vercel.json', '.env.example' ])
    assert(existsSync(join(root, file)), `Required root file is missing: ${file}`)

for(const file of [
    'sources/Game/Quality.js',
    'sources/Game/Rendering.js',
    'sources/Game/Weather.js',
    'sources/Game/Cycles/YearCycles.js',
    'sources/Game/World/RainLines.js',
    'sources/Game/World/Lightnings.js',
    'sources/Game/Audio.js',
    'sources/Game/Viewport.js',
    'static/sw.js',
])
    assert(existsSync(join(root, file)), `Required runtime file is missing: ${file}`)

const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
assert(packageJson.name === '4x4-coukoo', 'Unexpected package name')
assert(packageJson.version === '1.15.0', `Expected version 1.15.0, found ${packageJson.version}`)
assert(packageJson.scripts?.test === 'node scripts/test-release.js', 'Project must use the consolidated release test')
assert(packageJson.scripts?.verify === 'node scripts/verify-project.js', 'Project verify script is missing')

const quality = readFileSync(join(root, 'sources/Game/Quality.js'), 'utf8')
for(const marker of [ 'createDeviceProfile()', 'refreshDeviceFacts()', 'startFrameRateProbe', 'getAvailableFpsLimits()', 'getDeviceDetails()', 'AUTO_FPS_LIMIT', 'getFrameRateRenderPolicy' ])
    assert(quality.includes(marker), `Quality capability marker is missing: ${marker}`)
assert(!quality.includes("const STORAGE_KEY = '4x4-coukoo-quality'"), 'Unused legacy quality storage key remains')
assert(quality.includes('evaluateDeviceCapability()'), 'Device capability evaluator is missing')
assert(quality.includes('syncViewportFacts()'), 'Viewport capability sync is missing')

const gameSource = readFileSync(join(root, 'sources/Game/Game.js'), 'utf8')
assert(!gameSource.includes("./Garage.js"), 'Removed Garage runtime is still imported')
assert(!gameSource.includes("./Missions.js"), 'Removed missions runtime is still imported')
assert(!gameSource.includes("./DailyRewards.js"), 'Removed daily reward runtime is still imported')

const rendering = readFileSync(join(root, 'sources/Game/Rendering.js'), 'utf8')
for(const marker of [ 'frameAccumulator', 'getFrameRateRenderPolicy', 'webglcontextlost', 'Recovering the 3D renderer' ])
    assert(rendering.includes(marker), `Renderer safety marker is missing: ${marker}`)

const weather = readFileSync(join(root, 'sources/Game/Weather.js'), 'utf8')
for(const marker of [ 'getSeasonMode()', 'getWeatherMode()', 'syncEnvironment', 'Archive rain only' ])
    assert(weather.includes(marker), `Weather marker is missing: ${marker}`)

const yearCycles = readFileSync(join(root, 'sources/Game/Cycles/YearCycles.js'), 'utf8')
for(const marker of [ 'YEAR_DURATION_SECONDS = 40 * 60', 'TRANSITION_SECONDS = 90', 'getSeasonPhase' ])
    assert(yearCycles.includes(marker), `Season timing marker is missing: ${marker}`)

const audio = readFileSync(join(root, 'sources/Game/Audio.js'), 'utf8')
for(const match of audio.matchAll(/path:\s*['"](sounds\/[^'"]+)['"]/g))
    assert(existsSync(join(staticRoot, match[1])), `Audio path is missing: ${match[1]}`)

if(failures.length)
{
    console.error('Project verification failed:\n')
    for(const message of failures) console.error(`- ${message}`)
    process.exit(1)
}

console.log(`Project verification passed: ${sourceFiles.length} source files, ${staticFiles.length} runtime files checked.`)
