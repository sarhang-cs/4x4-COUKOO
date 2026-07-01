import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const fail = (message) => { console.error(`✗ ${message}`); process.exitCode = 1 }
const source = (relative) => readFileSync(join(root, relative), 'utf8')

for(const relative of [
    'sources/Game/Cycles/YearCycles.js',
    'sources/Game/Weather.js',
    'sources/Game/VisualEffects.js',
    'sources/Game/World/RainLines.js',
    'sources/Game/World/Lightnings.js',
    'sources/Game/World/Trees.js',
    'sources/Game/World/Leaves.js',
    'static/sw.js',
])
{
    if(!existsSync(join(root, relative)))
        fail(`Missing archive-weather source: ${relative}`)
}

const years = source('sources/Game/Cycles/YearCycles.js')
for(const marker of [ '40 * 60', 'TRANSITION_SECONDS = 90', 'getSeasonPhase', 'HOLD_RATIO' ])
{
    if(!years.includes(marker))
        fail(`Season schedule marker is missing: ${marker}`)
}

const visualEffects = source('sources/Game/VisualEffects.js')
for(const marker of [ "dataset.weatherSource = 'archive-world'", 'layer.hidden = true', 'rain: 0', 'storm: 0' ])
{
    if(!visualEffects.includes(marker))
        fail(`Archive-only weather overlay marker is missing: ${marker}`)
}

const rain = source('sources/Game/World/RainLines.js')
if(!rain.includes('this.count = Math.pow(2, 11)') || !rain.includes('this.visibleRatioBinding'))
    fail('Original archive rain-line implementation is missing')

const lightnings = source('sources/Game/World/Lightnings.js')
if(!lightnings.includes('return Math.max(0, this.game.weather.clouds.value)') || lightnings.includes('nextGroundStrikeSecond'))
    fail('Original archive lightning implementation was not restored')

const weather = source('sources/Game/Weather.js')
for(const marker of [ 'getSeasonPhase()', 'Archive cloud, wind and rain equations are kept intact', 'Archive rain only', 'Original Lightnings.js uses' ])
{
    if(!weather.includes(marker))
        fail(`Archive weather controller marker is missing: ${marker}`)
}

const worker = source('static/sw.js')
if(!worker.includes('4x4-coukoo-v1.13.8'))
    fail('Service-worker cache version was not bumped for v1.13.8')

const packageJson = JSON.parse(source('package.json'))
if(packageJson.version !== '1.13.8')
    fail(`Expected package version 1.13.8, found ${packageJson.version}`)
if(!packageJson.scripts?.['test:phase17'])
    fail('Phase 17 test script is missing')

if(process.exitCode)
    process.exit(process.exitCode)

console.log('Phase 17 archive-only weather and timed seasonal transitions tests passed.')
