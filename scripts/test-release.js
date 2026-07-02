import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const staticRoot = join(root, 'static')
const failures = []
const assert = (condition, message) => { if(!condition) failures.push(message) }

for(const asset of [
    'areas/areas.glb',
    'vehicle/default.glb',
    'vehicle/default-compressed.glb',
    'vehicle/oldSchool.glb',
    'vehicle/oldSchool-compressed.glb',
    'terrain/terrain.png',
    'terrain/terrain.ktx',
    'sounds/rain/soundjay_rain-on-leaves_main-01.mp3',
    'sounds/thunder/near/Lightning-Streak-with-Thunder-Crash_TTX028903.mp3',
    'sounds/fire/Fire Burning.mp3',
    'sounds/musics/high/Baguira.wav',
    'sounds/musics/high/Boy.wav',
    'sounds/musics/high/Sudo.wav',
])
    assert(existsSync(join(staticRoot, asset)), `Required quality/weather asset is missing: ${asset}`)

const areaPath = join(staticRoot, 'areas/areas.glb')
if(existsSync(areaPath))
{
    const header = readFileSync(areaPath).subarray(0, 4).toString('utf8')
    assert(header === 'glTF', 'areas.glb has an invalid GLB header')
}

const worker = readFileSync(join(staticRoot, 'sw.js'), 'utf8')
assert(worker.includes('4x4-coukoo-v1.14.1'), 'Service-worker cache version is not 1.14.1')

const source = (file) => readFileSync(join(root, file), 'utf8')
assert(source('sources/Game/VisualEffects.js').includes("dataset.weatherSource = 'archive-world'"), 'Archive-only weather rendering is not enabled')
assert(source('sources/Game/World/RainLines.js').includes('this.count = Math.pow(2, 11)'), 'Original archive rain system is missing')
assert(source('sources/Game/World/Lightnings.js').includes('this.game.weather.clouds.value'), 'Original archive lightning system is missing')
assert(source('sources/Game/Save.js').includes('AUTO') === false, 'Save settings must store primitive FPS values only')

const phaseFiles = readdirSync(join(root, 'scripts')).filter((name) => /^test-phase/i.test(name))
assert(phaseFiles.length === 0, `Legacy phase test scripts remain: ${phaseFiles.join(', ')}`)

if(failures.length)
{
    console.error('Release test failed:\n')
    for(const message of failures) console.error(`- ${message}`)
    process.exit(1)
}

console.log('Release runtime tests passed: quality assets, archive weather/audio, service worker, and cleanup checks are valid.')
