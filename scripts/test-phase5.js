import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const read = (path) => readFileSync(resolve(root, path), 'utf8')
const failures = []
const check = (condition, message) =>
{
    if(!condition)
        failures.push(message)
}

const quality = read('sources/Game/Quality.js')
const options = read('sources/Game/Options.js')
const rendering = read('sources/Game/Rendering.js')
const audio = read('sources/Game/Audio.js')
const save = read('sources/Game/Save.js')
const haptics = read('sources/Game/Haptics.js')
const vehicle = read('sources/Game/Physics/PhysicsVehicle.js')
const lighting = read('sources/Game/Ligthing.js')
const water = read('sources/Game/World/WaterSurface.js')
const html = read('sources/index.html')
const css = read('sources/style/options.styl')
const game = read('sources/Game/Game.js')
const pkg = JSON.parse(read('package.json'))

check(existsSync(resolve(root, 'sources/Game/Haptics.js')), 'Haptics service is missing')
check(/HIGH:\s*0/.test(quality) && /LOW:\s*1/.test(quality) && /MEDIUM:\s*2/.test(quality), 'High, medium, and low presets are not defined')
check(/getNextLevel\(\)/.test(quality), 'Graphics preset cycling is missing')
check(/getShadowMode\(\)/.test(quality) && /cycleShadowMode\(\)/.test(quality), 'Shadow setting controls are missing')
check(/getFpsLimit\(\)/.test(quality) && /cycleFpsLimit\(\)/.test(quality), 'Frame-rate setting controls are missing')
check(/settings\.audioVolume/.test(audio), 'Master volume is not stored')
check(/Howler\.volume/.test(audio), 'Master volume is not applied to Howler')
check(/settings\.audioVolume/.test(save) && /settings\.shadows/.test(save) && /settings\.fpsLimit/.test(save) && /settings\.vibration/.test(save), 'New settings are not normalized in Save')
check(/shouldRender\(\)/.test(rendering) && /frameLimit/.test(rendering), 'Frame-rate limiter is not applied to rendering')
check(/shadowMap\.enabled/.test(rendering), 'Shadow preference is not applied to renderer')
check(/light\.castShadow/.test(lighting), 'Shadow preference is not applied to directional light')
check(/this\.game\.haptics\?\.impact/.test(vehicle), 'Vehicle impacts do not trigger haptics')
check(/level === 0[\s\S]*else[\s\S]*material\.outputNode = baseOutput/.test(water), 'Water does not handle medium graphics changes safely')
check(/js-audio-volume/.test(html), 'Volume control UI is missing')
check(/js-fps-toggle/.test(html), 'FPS control UI is missing')
check(/js-shadows-toggle/.test(html), 'Shadow control UI is missing')
check(/js-vibration-toggle/.test(html), 'Vibration control UI is missing')
check(/js-fullscreen-toggle/.test(html), 'Fullscreen control UI is missing')
check(/js-performance-status/.test(html), 'Performance status UI is missing')
check(/volume-control/.test(css), 'Volume control styling is missing')
check(/new Haptics\(\)/.test(game), 'Game does not initialize haptics')
check(/test:phase5/.test(pkg.scripts.test), 'Phase 5 tests are not included in npm test')

if(failures.length)
{
    console.error('\nPhase 5 test failed:\n')
    for(const failure of failures)
        console.error(`- ${failure}`)
    process.exit(1)
}

console.log('Phase 5 settings test passed.')
