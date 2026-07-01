import { existsSync, readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const read = (path) => readFileSync(resolve(root, path), 'utf8')
const failures = []
const assert = (condition, message) =>
{
    if(!condition)
        failures.push(message)
}

const productionEnv = read('.env.production')
const game = read('sources/Game/Game.js')
const konami = read('sources/Game/KonamiCode.js')
const quality = read('sources/Game/Quality.js')
const rendering = read('sources/Game/Rendering.js')
const loader = read('sources/Game/ResourcesLoader.js')
const vite = read('vite.config.js')
const fonts = read('sources/style/fonts.styl')

assert(/VITE_COMPRESSED=1/.test(productionEnv), 'Production must enable compressed assets')
assert(/areas\/areas\.glb/.test(game), 'Areas model must use the validated landing-scene GLB')
assert(/getAssetProfile\(\)\.modelSuffix/.test(konami), 'Konami vehicle must use the unified quality asset profile')
assert(/getConcurrency\(\)/.test(loader), 'ResourcesLoader concurrency guard is missing')
assert(/adaptiveResolution: true/.test(quality), 'Quality profiles must support adaptive resolution')
assert(/baselinePixelRatio/.test(rendering), 'Adaptive pixel-ratio baseline is missing')
assert(/setVisibilityHandling/.test(rendering), 'Background rendering pause handler is missing')
assert(/pruneProductionVariants/.test(vite) && /keepQualityVariants/.test(vite), 'Production quality-variant preservation is missing')
assert(!/\.woff'\)|\.ttf'\)/.test(fonts), 'Legacy font formats should not be requested')

for(const file of [
    'static/areas/areas.glb',
    'static/vehicle/default-compressed.glb',
    'static/vehicle/oldSchool-compressed.glb',
    'static/terrain/terrain-compressed.glb',
])
{
    const path = resolve(root, file)
    assert(existsSync(path), `${file} is missing`)
    if(existsSync(path))
        assert(statSync(path).size > 0, `${file} is empty`)
}

if(failures.length)
{
    console.error('\nPhase 2 test failed:\n')
    for(const failure of failures)
        console.error(`- ${failure}`)
    process.exit(1)
}

console.log('Phase 2 performance test passed.')
