import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const fail = (message) => { console.error(`✗ ${message}`); process.exitCode = 1 }
const source = (relative) => readFileSync(join(root, relative), 'utf8')

for(const relative of [
    'sources/Game/Weather.js',
    'sources/Game/Cycles/YearCycles.js',
    'sources/Game/Options.js',
    'sources/Game/World/Lightnings.js',
    'sources/Game/World/Trees.js',
    'sources/Game/World/Leaves.js',
    'sources/Game/Fog.js',
    'sources/Game/Ligthing.js',
    'sources/index.html',
    'sources/Game/Save.js',
    'static/sw.js',
])
{
    if(!existsSync(join(root, relative)))
        fail(`Missing phase 16 environment source: ${relative}`)
}

const weather = source('sources/Game/Weather.js')
for(const marker of [
    "SEASON_MODES",
    "WEATHER_MODES",
    "setSeasonMode",
    "setWeatherMode",
    "getAutoSeasonKey",
    "WEATHER_PRESETS",
    "environmentChange",
    "seasonal cloud value",
])
{
    if(!weather.includes(marker))
        fail(`Season/weather controller marker is missing: ${marker}`)
}

const years = source('sources/Game/Cycles/YearCycles.js')
if(!years.includes('12 * 60'))
    fail('Season cycle is not configured as an in-game 12-minute year')

const options = source('sources/Game/Options.js')
for(const marker of [ 'setEnvironment()', 'Choose season', 'Choose weather', 'Apply season', 'Apply weather' ])
{
    if(!options.includes(marker))
        fail(`Environment settings marker is missing: ${marker}`)
}

const html = source('sources/index.html')
for(const marker of [ 'js-season-toggle', 'js-weather-toggle' ])
{
    if(!html.includes(marker))
        fail(`Environment settings control is missing: ${marker}`)
}

const save = source('sources/Game/Save.js')
for(const marker of [ "seasonMode: 'auto'", "weatherMode: 'auto'", 'toSeasonMode', 'toWeatherMode' ])
{
    if(!save.includes(marker))
        fail(`Environment save marker is missing: ${marker}`)
}

const lightning = source('sources/Game/World/Lightnings.js')
if(!lightning.includes('Math.min(0.16, intensity * 0.16)'))
    fail('Storm lightning strike rate was not stabilised')

const worker = source('static/sw.js')
if(!worker.includes('4x4-coukoo-v1.13.6'))
    fail('Service-worker cache version was not bumped for v1.13.6')

const packageJson = JSON.parse(source('package.json'))
if(packageJson.version !== '1.13.6')
    fail(`Expected package version 1.13.6, found ${packageJson.version}`)
if(!packageJson.scripts?.['test:phase16'])
    fail('Phase 16 test script is missing')

if(process.exitCode)
    process.exit(process.exitCode)

console.log('Phase 16 seasonal weather, rain, snow, and lightning tests passed.')
