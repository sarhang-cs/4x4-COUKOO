import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const read = (path) => readFileSync(resolve(root, path), 'utf8')
const failures = []
const assert = (condition, message) =>
{
    if(!condition)
        failures.push(message)
}

const index = read('sources/index.js')
const html = read('sources/index.html')
const game = read('sources/Game/Game.js')
const loader = read('sources/Game/ResourcesLoader.js')
const startup = read('sources/StartupScreen.js')
const styles = read('sources/style/index.styl')
const pkg = JSON.parse(read('package.json'))

assert(existsSync(resolve(root, 'sources/StartupScreen.js')), 'StartupScreen module is missing')
assert(existsSync(resolve(root, 'sources/style/startup.styl')), 'Startup screen styles are missing')
assert(/js-startup-screen/.test(html), 'Startup shell is missing from index.html')
assert(/js-startup-progress/.test(html), 'Accessible startup progress bar is missing')
assert(/js-startup-error/.test(html), 'Startup error screen is missing')
assert(/StartupScreen\.supportsWebGL\(\)/.test(index), 'WebGL preflight is missing')
assert(/await game\.ready/.test(index), 'Startup errors must await Game readiness')
assert(/new Game\(\{ startupScreen \}\)/.test(index), 'Game does not receive startup screen controller')
assert(/this\.ready = this\.init\(\)/.test(game), 'Game init promise is not exposed')
assert(/startupScreen\?\.setProgress/.test(game), 'Game does not report loading progress')
assert(/startupScreen\?\.hide\(\)/.test(game), 'Startup screen is not dismissed when world is ready')
assert(/RESOURCE_LOAD_FAILED/.test(loader), 'Resource loader does not classify load failures')
assert(/STARTUP_TIMEOUT/.test(startup), 'Startup timeout recovery is missing')
assert(/WEBGL_UNAVAILABLE/.test(startup), 'WebGL device error message is missing')
assert(/\.textContent/.test(startup), 'Startup status/error text must be rendered safely')
assert(/startup\.styl/.test(styles), 'Startup styles are not imported')
assert(/test:phase3/.test(pkg.scripts.test), 'Phase 3 tests are not included in npm test')

if(failures.length)
{
    console.error('\nPhase 3 test failed:\n')
    for(const failure of failures)
        console.error(`- ${failure}`)
    process.exit(1)
}

console.log('Phase 3 loading and recovery test passed.')
