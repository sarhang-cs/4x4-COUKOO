import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const fail = (message) => { console.error(`✗ ${message}`); process.exitCode = 1 }
const source = (relative) => readFileSync(join(root, relative), 'utf8')

for(const relative of [
    'sources/Game/Quality.js',
    'sources/Game/Options.js',
    'sources/Game/Rendering.js',
    'sources/Game/Ligthing.js',
    'sources/Game/Fog.js',
    'sources/Game/Save.js',
    'sources/style/options.styl',
    'static/sw.js',
])
{
    if(!existsSync(join(root, relative)))
        fail(`Missing phase 15 source: ${relative}`)
}

const quality = source('sources/Game/Quality.js')
for(const marker of [
    'AUTO_FPS_LIMIT = -1',
    'Clean requestAnimationFrame display calibration',
    'renderer.setAnimationLoop(null)',
    'getFrameRateRenderPolicy',
    'Every graphics preset can use every frame rate',
    "return 'Auto (checking)'",
])
{
    if(!quality.includes(marker))
        fail(`Adaptive calibration marker is missing: ${marker}`)
}

const options = source('sources/Game/Options.js')
for(const marker of [
    "this.game.quality.events.on('deviceChange', update)",
    'Run display capability calibration',
    'Calibrating the browser cadence without 3D render load',
    'getFpsRangeLabel',
])
{
    if(!options.includes(marker))
        fail(`Settings refresh marker is missing: ${marker}`)
}

const rendering = source('sources/Game/Rendering.js')
for(const marker of [ 'getFrameRateRenderPolicy', 'maxPixelsMultiplier', 'bloomMipsDelta' ])
{
    if(!rendering.includes(marker))
        fail(`Frame-rate rendering policy marker is missing: ${marker}`)
}

const save = source('sources/Game/Save.js')
if(!save.includes('fpsLimit: -1') || !save.includes('[ -1, 30, 45, 60, 90, 120, 121 ]'))
    fail('Auto FPS save migration is missing')

const worker = source('static/sw.js')
if(!worker.includes('4x4-coukoo-v1.13.5'))
    fail('Service-worker cache version was not bumped for v1.13.5')

const packageJson = JSON.parse(source('package.json'))
if(packageJson.version !== '1.13.5')
    fail(`Expected package version 1.13.5, found ${packageJson.version}`)
if(!packageJson.scripts?.['test:phase15'])
    fail('Phase 15 test script is missing')

if(process.exitCode)
    process.exit(process.exitCode)

console.log('Phase 15 clean display calibration and Auto FPS linkage tests passed.')
