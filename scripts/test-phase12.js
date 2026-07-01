import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const fail = (message) => { console.error(`✗ ${message}`); process.exitCode = 1 }

const audioPath = join(root, 'sources', 'Game', 'Audio.js')
const workerPath = join(root, 'static', 'sw.js')
const gamePath = join(root, 'sources', 'Game', 'Game.js')
if(!existsSync(audioPath))
    fail('Audio runtime is missing')
else
{
    const audio = readFileSync(audioPath, 'utf8')
    for(const marker of [
        'this.playlist.qualityRefreshPending = true',
        'this.playlist.qualityRefreshPending = false',
        'if(this.playlist.qualityRefreshPending)',
        'this.refreshPlaylistQuality()',
    ])
    {
        if(!audio.includes(marker))
            fail(`Queued playlist-quality marker is missing: ${marker}`)
    }
}

if(!existsSync(gamePath))
    fail('Game resource map is missing')
else
{
    const game = readFileSync(gamePath, 'utf8')
    const templates = [ ...game.matchAll(/`([^`]*(?:\$\{compressedModelSuffix\}|\$\{compressedTextureExtension\})[^`]*)`/g) ]
        .map((match) => match[1])
        .filter((value) => value.includes('.glb') || value.includes('${compressedTextureExtension}'))
    const profiles = [
        { name: 'High', modelSuffix: '', textureExtension: 'png' },
        { name: 'Medium', modelSuffix: '', textureExtension: 'png' },
        { name: 'Low', modelSuffix: '-compressed', textureExtension: 'ktx' },
    ]

    for(const profile of profiles)
    {
        for(const template of templates)
        {
            const asset = template
                .replaceAll('${compressedModelSuffix}', profile.modelSuffix)
                .replaceAll('${compressedTextureExtension}', profile.textureExtension)
                .replaceAll('${cb}', '')
                .replace('?cb=1', '')
            if(!existsSync(join(root, 'static', asset)))
                fail(`${profile.name} runtime asset is missing: ${asset}`)
        }
    }
}

const forbiddenRuntimePattern = /(?:^|\/)(?:[^/]*bruno[^/]*|[^/]+\.(?:blend1?|psd|band|pur|mp4))$/i
const staticFiles = []
const walk = (directory) =>
{
    for(const entry of readdirSync(directory, { withFileTypes: true }))
    {
        const path = join(directory, entry.name)
        if(entry.isDirectory())
            walk(path)
        else
            staticFiles.push(path)
    }
}

walk(join(root, 'static'))
for(const file of staticFiles)
{
    const relative = file.slice(root.length + 1).replaceAll('\\', '/')
    if(forbiddenRuntimePattern.test(relative))
        fail(`Authoring-only or Bruno asset is shipped in static runtime files: ${relative}`)
}

if(!existsSync(workerPath))
    fail('Service worker is missing')
else if(!readFileSync(workerPath, 'utf8').includes("4x4-coukoo-v1.13.3"))
    fail('Service worker cache version was not bumped for the audited release')

if(process.exitCode)
    process.exit(process.exitCode)

console.log('Phase 12 final-audit regression test passed.')
