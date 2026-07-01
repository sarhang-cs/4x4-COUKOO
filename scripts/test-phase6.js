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

const game = read('sources/Game/Game.js')
const tutorial = read('sources/Game/Tutorial.js')
const pause = read('sources/Game/Pause.js')
const time = read('sources/Game/Time.js')
const audio = read('sources/Game/Audio.js')
const inputs = read('sources/Game/Inputs/Inputs.js')
const save = read('sources/Game/Save.js')
const html = read('sources/index.html')
const css = read('sources/style/tutorial.styl')
const closing = read('sources/Game/ClosingManager.js')
const pkg = JSON.parse(read('package.json'))

check(existsSync(resolve(root, 'sources/Game/Tutorial.js')), 'Tutorial service is missing')
check(existsSync(resolve(root, 'sources/Game/Pause.js')), 'Pause service is missing')
check(/new Tutorial\(\)/.test(game) && /new Pause\(\)/.test(game), 'Game does not initialize tutorial and pause services')
check(/progress\.tutorialCompleted/.test(save), 'Tutorial completion is not persisted in Save')
check(/resetActiveActions\(\)/.test(inputs), 'Input reset guard is missing')
check(/pause\(\)/.test(time) && /resume\(\)/.test(time) && /ticker\.scale = 0/.test(time), 'Simulation pause support is missing from Time')
check(/Howler\.ctx\?\.suspend/.test(audio) && /Howler\.ctx\?\.resume/.test(audio), 'Audio pause and resume support is missing')
check(/Keyboard\.KeyP/.test(pause) && /Gamepad\.start/.test(pause), 'Pause controls do not support keyboard and gamepad')
check(/this\.game\.time\.pause\(\)/.test(pause) && /this\.game\.time\.resume\(\)/.test(pause), 'Pause menu does not stop and resume the simulation')
check(/tutorialNext/.test(tutorial) && /tutorialSkip/.test(tutorial), 'Tutorial keyboard/gamepad navigation is missing')
check(/js-tutorial/.test(html) && /js-pause/.test(html), 'Tutorial or pause overlay markup is missing')
check(/js-tutorial-open/.test(html), 'Tutorial replay action is missing from controls')
check(/tutorial-progress/.test(css) && /pause-actions/.test(css), 'Tutorial and pause styling is missing')
check(!/name: 'pause'/.test(closing), 'Legacy Gamepad-only pause action still conflicts with the pause menu')
check(/test:phase6/.test(pkg.scripts.test), 'Phase 6 tests are not included in npm test')

if(failures.length)
{
    console.error('\nPhase 6 test failed:\n')
    for(const failure of failures)
        console.error(`- ${failure}`)
    process.exit(1)
}

console.log('Phase 6 UX tutorial and pause test passed.')
