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
const save = read('sources/Game/Save.js')
const html = read('sources/index.html')
const garageStyles = read('sources/style/garage.styl')
const circuitStyles = read('sources/style/circuit-end.styl')
const circuit = read('sources/Game/World/Areas/CircuitArea.js')
const inputs = read('sources/Game/Inputs/Inputs.js')
const gamepad = read('sources/Game/Inputs/Gamepad.js')
const pkg = JSON.parse(read('package.json'))

for(const path of [
    'sources/Game/DailyRewards.js',
    'sources/Game/SocialShare.js',
    'sources/Game/ControllerStatus.js',
    'LEADERBOARD-SERVER.md',
])
    check(existsSync(resolve(root, path)), `Phase 9 required file is missing: ${path}`)

check(/new DailyRewards\(\)/.test(game), 'Game does not initialize daily rewards')
check(/new SocialShare\(\)/.test(game), 'Game does not initialize score sharing')
check(/new ControllerStatus\(\)/.test(game), 'Game does not initialize controller status UX')
check(/progress\.dailyReward/.test(save), 'Daily reward state is not persisted')
check(/progress\.circuit/.test(save), 'Circuit personal best state is not persisted')
check(/SAVE_VERSION = 4/.test(save), 'Save schema was not migrated to version 4')
check(/js-daily-reward/.test(html) && /js-daily-claim/.test(html), 'Daily reward Garage UI is missing')
check(/js-button-share/.test(html) && /js-circuit-personal-best/.test(html), 'Circuit sharing or personal-best UI is missing')
check(/js-controller-status/.test(html), 'Controller status UI is missing')
check(/daily-reward/.test(garageStyles) && /controller-status/.test(garageStyles), 'Daily reward or controller styles are missing')
check(/circuit-personal-best/.test(circuitStyles), 'Circuit personal-best styling is missing')
check(/recordCircuitResult/.test(circuit) && /shareCircuitRun/.test(circuit), 'Circuit result persistence or sharing hook is missing')
check(/gamepadConnection/.test(inputs), 'Input controller connection event is missing')
check(/gamepadconnected/.test(gamepad) && /gamepaddisconnected/.test(gamepad), 'Gamepad connection monitoring is missing')
check(/test:phase9/.test(pkg.scripts.test), 'Phase 9 tests are not included in npm test')
check(/^1\.(?:1[1-9]|[2-9]\d)\.\d+$/.test(pkg.version), 'Phase 9 package version must be 1.11.0 or later')

if(failures.length)
{
    console.error('\nPhase 9 test failed:\n')
    for(const failure of failures)
        console.error(`- ${failure}`)
    process.exit(1)
}

console.log('Phase 9 social progression and controller test passed.')
