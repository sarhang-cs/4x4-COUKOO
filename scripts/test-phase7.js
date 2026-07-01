import { existsSync, readFileSync } from 'node:fs'
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
const effects = read('sources/Game/VisualEffects.js')
const save = read('sources/Game/Save.js')
const options = read('sources/Game/Options.js')
const html = read('sources/index.html')
const styles = read('sources/style/index.styl')
const visualStyles = read('sources/style/visualEffects.styl')
const pkg = JSON.parse(read('package.json'))

check(existsSync(resolve(root, 'sources/Game/VisualEffects.js')), 'Visual effects controller is missing')
check(existsSync(resolve(root, 'sources/style/visualEffects.styl')), 'Visual effects styles are missing')
check(/this\.visualEffects = new VisualEffects\(\)/.test(game), 'Game does not initialize VisualEffects')
check(/js-drive-vfx/.test(html), 'Visual-effects overlay shell is missing')
check(/js-visual-effects-toggle/.test(html), 'Visual-effects option toggle is missing')
check(/setVisualEffects\(\)/.test(options), 'Options visual-effects control is missing')
check(/settings\.visualEffects/.test(save), 'Visual-effects preference is not stored in Save')
check(/toVisualEffectsMode/.test(save), 'Visual-effects preference is not normalized')
check(/getNightStrength\(\)/.test(effects), 'Night-cycle visual response is missing')
check(/game\.weather/.test(effects), 'Weather-driven visual response is missing')
check(/physicalVehicle/.test(effects), 'Vehicle-speed visual response is missing')
check(/isEnabled\(\)/.test(effects) && /cycleMode\(\)/.test(effects), 'Visual-effects mode controls are missing')
check(/visualEffects\.styl/.test(styles), 'Visual-effects styles are not imported')
check(/drive-vfx-rain/.test(visualStyles) && /drive-vfx-speed/.test(visualStyles), 'Rain and speed visual layers are missing')
check(/test:phase7/.test(pkg.scripts.test), 'Phase 7 tests are not included in npm test')

if(failures.length)
{
    console.error('\nPhase 7 test failed:\n')
    for(const failure of failures)
        console.error(`- ${failure}`)
    process.exit(1)
}

console.log('Phase 7 visual-effects test passed.')
