import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const dist = join(root, 'dist')
const failures = []
const assert = (condition, message) => { if(!condition) failures.push(message) }

const walk = (directory, files = []) =>
{
    for(const entry of readdirSync(directory, { withFileTypes: true }))
    {
        const path = join(directory, entry.name)
        if(entry.isDirectory()) walk(path, files)
        else files.push(path)
    }
    return files
}

for(const file of [ 'index.html', 'manifest.webmanifest', 'sw.js', 'offline.html' ])
    assert(existsSync(join(dist, file)), `Missing production file: ${file}`)

if(existsSync(dist))
{
    const files = walk(dist)
    const forbiddenRuntime = /(?:^|\/)(?:[^/]*bruno[^/]*|[^/]+\.(?:blend1?|psd|band|pur|mp4))$/i
    for(const file of files)
        assert(!forbiddenRuntime.test(file.replaceAll('\\', '/')), `Forbidden source-only file reached dist: ${file}`)

    for(const asset of [
        'areas/areas.glb',
        'vehicle/default.glb',
        'vehicle/default-compressed.glb',
        'terrain/terrain.png',
        'terrain/terrain.ktx',
        'sounds/rain/soundjay_rain-on-leaves_main-01.mp3',
        'sounds/thunder/near/Lightning-Streak-with-Thunder-Crash_TTX028903.mp3',
        'sounds/fire/Fire Burning.mp3',
        'sounds/musics/high/Baguira.wav',
    ])
        assert(existsSync(join(dist, asset)), `Missing production runtime asset: ${asset}`)

    const worker = readFileSync(join(dist, 'sw.js'), 'utf8')
    assert(worker.includes('4x4-coukoo-v1.14.0'), 'Production service worker cache version is stale')
}

if(failures.length)
{
    console.error('Release audit failed:\n')
    for(const message of failures) console.error(`- ${message}`)
    process.exit(1)
}

console.log('Release audit passed: production shell, archive assets, and source-only exclusions verified.')
