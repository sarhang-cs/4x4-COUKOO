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

const requiredFiles = [
    'sources/PwaManager.js',
    'static/manifest.webmanifest',
    'static/sw.js',
    'static/offline.html',
    'static/_headers',
]

for(const path of requiredFiles)
    check(existsSync(resolve(root, path)), `Phase 10 required file is missing: ${path}`)

const entry = read('sources/index.js')
const pwa = read('sources/PwaManager.js')
const game = read('sources/Game/Game.js')
const options = read('sources/Game/Options.js')
const html = read('sources/index.html')
const serviceWorker = read('static/sw.js')
const manifest = JSON.parse(read('static/manifest.webmanifest'))
const vite = read('vite.config.js')
const envExample = read('.env.example')
const pkg = JSON.parse(read('package.json'))

check(/new PwaManager\(\)/.test(entry), 'Bootstrap does not initialize the PWA manager')
check(/navigator\.serviceWorker\.register\('\.\/sw\.js'/.test(pwa), 'PWA manager does not register the root service worker')
check(/beforeinstallprompt/.test(pwa) && /promptInstall/.test(pwa), 'Install prompt handling is missing')
check(/SKIP_WAITING/.test(pwa) && /controllerchange/.test(pwa), 'Safe PWA update handling is missing')
check(/this\.pwa = window\.coukooPwa/.test(game), 'Game does not expose the PWA manager to settings')
check(/setPwa\(\)/.test(options) && /js-install-app/.test(options), 'Install settings controller is missing')
check(/js-offline-status/.test(options) && /offlineReady/.test(options), 'Offline status controller is missing')
check(/manifest\.webmanifest/.test(html), 'HTML does not link the install manifest')
check(/js-install-app/.test(html) && /js-offline-status/.test(html), 'PWA settings UI is missing')
check(/__COUKOO_CANONICAL_URL__/.test(html) && /__COUKOO_SHARE_IMAGE_URL__/.test(html), 'SEO metadata placeholders are missing')
check(/siteMetadata/.test(vite) && /VITE_SITE_URL/.test(vite), 'Build-time public URL metadata support is missing')
check(/VITE_SITE_URL=/.test(envExample), 'Public site URL environment documentation is missing')
check(manifest.display === 'standalone', 'Manifest must use standalone display mode')
check(manifest.start_url === './' && manifest.scope === './', 'Manifest must remain portable for GitHub Pages subpaths')
check(Array.isArray(manifest.icons) && manifest.icons.length >= 2, 'Manifest icons are incomplete')
check(/CORE_FILES/.test(serviceWorker) && /offline\.html/.test(serviceWorker), 'Offline app shell is missing from service worker')
check(/RUNTIME_CACHE/.test(serviceWorker) && /cachePut/.test(serviceWorker), 'Runtime asset cache is missing from service worker')
check(/SKIP_WAITING/.test(serviceWorker) && /clients\.claim/.test(serviceWorker), 'Service worker activation flow is incomplete')
check(/test:phase10/.test(pkg.scripts.test), 'Phase 10 tests are not included in npm test')
check(/^1\.(?:1[2-9]|[2-9]\d)\.\d+$/.test(pkg.version), 'Phase 10 package version must be 1.12.0 or later')

if(failures.length)
{
    console.error('\nPhase 10 test failed:\n')
    for(const failure of failures)
        console.error(`- ${failure}`)

    process.exit(1)
}

console.log('Phase 10 PWA, offline shell, and launch metadata test passed.')
