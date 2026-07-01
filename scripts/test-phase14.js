import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const fail = (message) => { console.error(`✗ ${message}`); process.exitCode = 1 }
const source = (relative) => readFileSync(join(root, relative), 'utf8')

for(const relative of [
    'sources/Game/Quality.js',
    'sources/Game/Options.js',
    'sources/Game/Rendering.js',
    'sources/Game/Game.js',
    'sources/StartupScreen.js',
    'static/sw.js',
])
{
    if(!existsSync(join(root, relative)))
        fail(`Missing frame-rate source: ${relative}`)
}

const quality = source('sources/Game/Quality.js')
for(const marker of [
    'FRAME_RATE_STEPS',
    'startFrameRateProbe',
    'measureFrameRate',
    'Measured requestAnimationFrame cadence',
    'getTierFpsLimits(level = this.level)',
    'getAvailableFpsLimits(level = this.level)',
    'getFpsLabel',
    '120+ FPS',
    'normalizeFpsLimitForLevel',
])
{
    if(!quality.includes(marker))
        fail(`Frame-rate capability marker is missing: ${marker}`)
}

const options = source('sources/Game/Options.js')
for(const marker of [
    'Measured browser/display cadence',
    'getFpsDescription',
    'getAvailableFpsLimits(quality.level)',
])
{
    if(!options.includes(marker))
        fail(`FPS settings UI marker is missing: ${marker}`)
}

const rendering = source('sources/Game/Rendering.js')
for(const marker of [
    'frameAccumulator',
    'correct fractional pacing such as 45 FPS',
    'continue independently from the render cap',
])
{
    if(!rendering.includes(marker))
        fail(`Frame pacing marker is missing: ${marker}`)
}

const game = source('sources/Game/Game.js')
if(!game.includes('this.quality.startFrameRateProbe'))
    fail('Game does not start the post-load display cadence probe')
if(!game.includes('this.startupScreen?.showForReload(stage)'))
    fail('Controlled reload does not restore the startup shell')

const startup = source('sources/StartupScreen.js')
if(!startup.includes('showForReload(stage'))
    fail('Startup screen reload transition is missing')

const worker = source('static/sw.js')
if(!/4x4-coukoo-v1\.13\.(?:[5-9]|\d{2,})/.test(worker))
    fail('Service-worker cache version was not bumped for v1.13.5-or-later')

const packageJson = JSON.parse(source('package.json'))
if(!/^1\.13\.(?:[5-9]|\d{2,})$/.test(packageJson.version))
    fail(`Expected package version 1.13.5-or-later, found ${packageJson.version}`)
if(!packageJson.scripts?.['test:phase14'])
    fail('Phase 14 test script is missing')

if(process.exitCode)
    process.exit(process.exitCode)

console.log('Phase 14 adaptive frame-rate and controlled-reload tests passed.')
