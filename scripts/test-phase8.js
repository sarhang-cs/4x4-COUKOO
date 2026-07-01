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
const missions = read('sources/Game/Missions.js')
const garage = read('sources/Game/Garage.js')
const data = read('sources/data/missions.js')
const html = read('sources/index.html')
const styles = read('sources/style/garage.styl')
const styleIndex = read('sources/style/index.styl')
const pkg = JSON.parse(read('package.json'))

check(existsSync(resolve(root, 'sources/Game/Missions.js')), 'Mission controller is missing')
check(existsSync(resolve(root, 'sources/Game/Garage.js')), 'Garage controller is missing')
check(existsSync(resolve(root, 'sources/data/missions.js')), 'Mission data is missing')
check(/new Missions\(\)/.test(game) && /new Garage\(\)/.test(game), 'Game does not initialize missions and garage')
check(/progress\.coins/.test(save) && /progress\.missions/.test(save), 'Mission currency and progress are not persisted')
check(/progress\.vehicles/.test(save) && /progress\.activeVehicle/.test(save), 'Garage ownership and active vehicle are not persisted')
check(/boostControl/.test(data) && /trailRunner/.test(data), 'Mission list does not include driving progression')
check(/getCoins\(\)/.test(missions) && /spend\(amount\)/.test(missions), 'Mission coin wallet is incomplete')
check(/complete\(definition\)/.test(missions) && /missionCompleted/.test(missions), 'Mission completion flow is missing')
check(/oldSchool/.test(garage) && /new VisualVehicle/.test(garage), 'Garage does not equip the existing old-school vehicle model')
check(/js-mission-list/.test(html) && /js-garage-list/.test(html), 'Mission or garage menu UI is missing')
check(/js-coukoo-coins/.test(html), 'Mission coin HUD is missing')
check(/garage-content/.test(html) && /data-name=\"garage\"/.test(html), 'Garage menu navigation is missing')
check(/mission-card/.test(styles) && /garage-card/.test(styles), 'Mission and garage styles are missing')
check(/garage\.styl/.test(styleIndex), 'Garage styles are not imported')
check(/test:phase8/.test(pkg.scripts.test), 'Phase 8 tests are not included in npm test')

if(failures.length)
{
    console.error('\nPhase 8 test failed:\n')
    for(const failure of failures)
        console.error(`- ${failure}`)
    process.exit(1)
}

console.log('Phase 8 missions and garage test passed.')
