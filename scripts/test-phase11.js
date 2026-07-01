import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const highMusicDirectory = join(root, 'static', 'sounds', 'musics', 'high')
const expected = [ 'Baguira.wav', 'Boy.wav', 'Sudo.wav' ]
const fail = (message) => { console.error(`✗ ${message}`); process.exitCode = 1 }

if(!existsSync(highMusicDirectory))
    fail('High lossless music directory is missing')
else
{
    const files = readdirSync(highMusicDirectory).sort()
    if(JSON.stringify(files) !== JSON.stringify(expected))
        fail(`High music files are invalid: ${files.join(', ')}`)

    for(const file of expected)
    {
        const bytes = statSync(join(highMusicDirectory, file)).size
        if(bytes < 40_000_000)
            fail(`High lossless music asset is unexpectedly small: ${file}`)
    }
}

const quality = readFileSync(join(root, 'sources', 'Game', 'Quality.js'), 'utf8')
const audio = readFileSync(join(root, 'sources', 'Game', 'Audio.js'), 'utf8')
const game = readFileSync(join(root, 'sources', 'Game', 'Game.js'), 'utf8')
const worker = readFileSync(join(root, 'static', 'sw.js'), 'utf8')
const manifest = readFileSync(join(root, 'QUALITY-ASSET-MANIFEST.md'), 'utf8')

for(const marker of [ 'getAssetProfile(level = this.level)', "musicFormat: 'wav'", "musicFormat: 'mp3'", "musicPath: 'sounds/musics/high'", "modelSuffix: '-compressed'", "textureExtension: 'png'", "textureExtension: 'ktx'", "id: 'high-full'", "id: 'medium-original'", "id: 'low-phase10'" ])
    if(!quality.includes(marker)) fail(`Quality asset profile marker is missing: ${marker}`)

for(const marker of [ 'getPlaylistPath(song)', 'refreshPlaylistQuality()', "this.game.quality.events.on(\'change\'" ])
    if(!audio.includes(marker)) fail(`Audio quality switching marker is missing: ${marker}`)

if(!game.includes('const assetProfile = this.quality.getAssetProfile()') || !game.includes('reloadForQualityAssets(assetProfile)'))
    fail('Game does not select and reload unified quality asset variants')

if(!worker.includes('mp3|wav'))
    fail('Service worker does not cache WAV after successful High playback')

for(const banned of [ '.blend', '.psd', '.band', 'bruno' ])
    if(manifest.toLowerCase().includes(`static/${banned}`))
        fail(`Source-only asset accidentally listed as shipped: ${banned}`)

if(process.exitCode)
    process.exit(process.exitCode)

console.log('Phase 11 quality-asset tests passed.')
