import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const fail = (message) => { console.error(`✗ ${message}`); process.exitCode = 1 }
const source = (relative) => readFileSync(join(root, relative), 'utf8')

for(const relative of [
    'sources/Game/Options.js',
    'sources/Game/Quality.js',
    'sources/Game/Rendering.js',
    'sources/Game/Tabs.js',
    'sources/style/options.styl',
    'sources/style/controls.styl',
])
{
    if(!existsSync(join(root, relative)))
        fail(`Missing mobile-fix source: ${relative}`)
}

const options = source('sources/Game/Options.js')
for(const marker of [
    'setSettingsPicker()',
    'Choose graphics quality',
    'Confirm and reload',
    'Choose frame-rate mode',
    'Choose shadow mode',
    'requestControlledReload',
    'setDeviceProfile()',
])
{
    if(!options.includes(marker))
        fail(`Settings confirmation flow marker is missing: ${marker}`)
}

const quality = source('sources/Game/Quality.js')
for(const marker of [
    'return QUALITY_LEVELS.MEDIUM',
    'getAvailableFpsLimits()',
    'memoryKnown',
    'supports60',
    'getDeviceDetails()',
    "const lowTextureProfile = this.device.isMobile",
    'visibilityMultiplier',
])
{
    if(!quality.includes(marker))
        fail(`Quality/device marker is missing: ${marker}`)
}

const rendering = source('sources/Game/Rendering.js')
for(const marker of [
    'performance.now()',
    'setContextRecovery()',
    'webglcontextlost',
    'Recovering the 3D renderer',
])
{
    if(!rendering.includes(marker))
        fail(`Renderer stability marker is missing: ${marker}`)
}

const worker = source('static/sw.js')
if(!/4x4-coukoo-v1\.13\.(?:[3-9]|\d{2,})/.test(worker))
    fail('Service-worker cache version was not bumped for the mobile-settings release')

const packageJson = JSON.parse(source('package.json'))
if(!/^1\.13\.(?:[3-9]|\d{2,})$/.test(packageJson.version))
    fail(`Expected a 1.13.3-or-later patch version, found ${packageJson.version}`)
if(!packageJson.scripts?.['test:phase13'])
    fail('Phase 13 test script is missing')

if(process.exitCode)
    process.exit(process.exitCode)

console.log('Phase 13 mobile settings, quality, and renderer-stability tests passed.')
