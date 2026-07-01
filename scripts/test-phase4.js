import assert from 'node:assert/strict'
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

const save = read('sources/Game/Save.js')
const game = read('sources/Game/Game.js')
const options = read('sources/Game/Options.js')
const html = read('sources/index.html')
const quality = read('sources/Game/Quality.js')
const audio = read('sources/Game/Audio.js')
const player = read('sources/Game/Player.js')
const achievements = read('sources/Game/Achievements.js')
const inputFlag = read('sources/Game/InputFlag.js')
const server = read('sources/Game/Server.js')
const pkg = JSON.parse(read('package.json'))

check(existsSync(resolve(root, 'sources/Game/Save.js')), 'Save module is missing')
check(/4x4-coukoo-save-v1/.test(save), 'Versioned save key is missing')
check(/migrateLegacy\(\)/.test(save), 'Legacy storage migration is missing')
check(/clearProgress\(\)/.test(save), 'Progress reset is missing')
check(/exportBackup\(\)/.test(save), 'Backup export is missing')
check(/queueFlush/.test(save), 'Debounced save writes are missing')
check(/this\.save = new Save\(\)/.test(game), 'Game does not initialize Save before subsystems')
check(/setSaveSystem\(\)/.test(options), 'Options save controls are missing')
check(/js-save-export/.test(html), 'Export save button is missing')
check(/js-save-clear/.test(html), 'Clear progress button is missing')
check(/settings\.quality/.test(quality), 'Quality preference is not stored in Save')
check(/settings\.audioMuted/.test(audio), 'Audio preference is not stored in Save')
check(/progress\.distanceDriven/.test(player), 'Distance progress is not stored in Save')
check(/progress\.timePlayed/.test(player), 'Time progress is not stored in Save')
check(/progress\.achievements/.test(achievements), 'Achievements are not stored in Save')
check(/settings\.countryCode/.test(inputFlag), 'Country preference is not stored in Save')
check(/session\.uuid/.test(server), 'Multiplayer session identity is not stored in Save')
check(/test:phase4/.test(pkg.scripts.test), 'Phase 4 tests are not included in npm test')

for(const source of [ quality, audio, player, achievements, inputFlag, server ])
    check(!/localStorage\./.test(source), 'Legacy direct localStorage access remains in a migrated subsystem')

if(failures.length)
{
    console.error('\nPhase 4 test failed:\n')
    for(const failure of failures)
        console.error(`- ${failure}`)
    process.exit(1)
}

console.log('Phase 4 save-system test passed.')
