import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

const projectRoot = resolve(import.meta.dirname, '..')
const staticRoot = join(projectRoot, 'static')
const distRoot = join(projectRoot, 'dist')
const failures = []

const assert = (condition, message) =>
{
    if(!condition)
        failures.push(message)
}

const walk = (directory, files = []) =>
{
    for(const entry of readdirSync(directory, { withFileTypes: true }))
    {
        const entryPath = join(directory, entry.name)
        if(entry.isDirectory())
            walk(entryPath, files)
        else
            files.push(entryPath)
    }

    return files
}

const parseGlb = (path) =>
{
    const bytes = readFileSync(path)
    assert(bytes.toString('utf8', 0, 4) === 'glTF', 'areas.glb has an invalid magic header')
    assert(bytes.readUInt32LE(4) === 2, 'areas.glb must use GLB version 2')
    assert(bytes.readUInt32LE(8) === bytes.length, 'areas.glb total length does not match file length')

    const jsonLength = bytes.readUInt32LE(12)
    assert(bytes.toString('utf8', 16, 20) === 'JSON', 'areas.glb JSON chunk is missing')
    const json = JSON.parse(bytes.toString('utf8', 20, 20 + jsonLength))
    const binHeaderOffset = 20 + jsonLength
    const binLength = bytes.readUInt32LE(binHeaderOffset)
    assert(bytes.toString('utf8', binHeaderOffset + 4, binHeaderOffset + 8) === 'BIN\u0000', 'areas.glb BIN chunk is missing')
    assert(binHeaderOffset + 8 + binLength === bytes.length, 'areas.glb BIN chunk length is invalid')

    return { bytes, json, binLength }
}

const areasPath = join(staticRoot, 'areas', 'areas.glb')
assert(existsSync(areasPath), 'areas.glb is missing')

let areasBytes = 0
let areasJson = null
if(existsSync(areasPath))
{
    const result = parseGlb(areasPath)
    areasBytes = result.bytes.length
    areasJson = result.json

    const roots = areasJson.scenes?.[areasJson.scene ?? 0]?.nodes ?? []
    const reachable = new Set()
    const queue = [ ...roots ]
    while(queue.length)
    {
        const nodeIndex = queue.pop()
        if(reachable.has(nodeIndex))
            continue

        reachable.add(nodeIndex)
        queue.push(...(areasJson.nodes[nodeIndex].children ?? []))
    }

    assert(reachable.size === areasJson.nodes.length, `areas.glb has ${areasJson.nodes.length - reachable.size} disconnected node(s)`)
    assert(areasJson.nodes.length === 732, `areas.glb should contain 732 nodes, found ${areasJson.nodes.length}`)
    assert(areasJson.meshes.length === 263, `areas.glb should contain 263 meshes, found ${areasJson.meshes.length}`)
    assert(!areasJson.nodes.some((node) => /^refLettersPhysicalDynamic\./.test(node.name ?? '')), 'Legacy landing-title nodes remain in areas.glb')

    const landing = areasJson.nodes.find((node) => node.name === 'landing')
    assert(Boolean(landing), 'Landing node is missing')
    const landingChildren = (landing?.children ?? []).map((index) => areasJson.nodes[index]?.name)
    assert(landingChildren.includes('refLandingFlagAnchor'), 'Landing flag anchor is not attached to the landing scene')
    assert(landingChildren.filter((name) => /^refLettersPhysicalDynamic\d{3}$/.test(name ?? '')).length === 7, 'Landing scene must keep 7 SARHANG title meshes')

    for(const [ index, view ] of areasJson.bufferViews.entries())
    {
        const offset = view.byteOffset ?? 0
        assert(offset + view.byteLength <= result.binLength, `areas.glb buffer view ${index} exceeds the BIN chunk`)
    }
}

const staticFiles = walk(staticRoot)
const forbiddenRuntimePattern = /(?:^|\/)(?:[^/]*bruno[^/]*|[^/]+\.(?:blend1?|psd|band|pur|mp4))$/i
for(const file of staticFiles)
    assert(!forbiddenRuntimePattern.test(file.replace(`${projectRoot}/`, '').replaceAll('\\', '/')), `Authoring-only or Bruno asset is shipped: ${file}`)
const audioFiles = staticFiles.filter((file) => file.endsWith('.mp3'))
const wavFiles = staticFiles.filter((file) => file.endsWith('.wav'))
const glbFiles = staticFiles.filter((file) => file.endsWith('.glb'))
const ktxFiles = staticFiles.filter((file) => file.endsWith('.ktx'))
assert(audioFiles.length === 88, `Expected 88 MP3 files, found ${audioFiles.length}`)
const highWavNames = wavFiles.map((file) => file.replace(`${staticRoot}/sounds/musics/high/`, '')).sort()
assert(JSON.stringify(highWavNames) === JSON.stringify([ 'Baguira.wav', 'Boy.wav', 'Sudo.wav' ]), `Expected three High lossless WAV files, found: ${highWavNames.join(', ') || 'none'}`)
assert(wavFiles.every((file) => file.startsWith(join(staticRoot, 'sounds', 'musics', 'high'))), 'WAV files must only exist in the High music directory')
assert(glbFiles.length > 0, 'No GLB assets were found')
assert(ktxFiles.length > 0, 'No KTX assets were found')

assert(existsSync(join(distRoot, 'index.html')), 'Production dist/index.html is missing')
assert(existsSync(join(distRoot, 'manifest.webmanifest')), 'Production PWA manifest is missing')
assert(existsSync(join(distRoot, 'sw.js')), 'Production service worker is missing')
assert(existsSync(join(distRoot, 'offline.html')), 'Production offline fallback is missing')
const distIndex = existsSync(join(distRoot, 'index.html')) ? readFileSync(join(distRoot, 'index.html'), 'utf8') : ''
assert(!distIndex.includes('__COUKOO_'), 'Production metadata still contains unresolved URL placeholders')
assert(distIndex.includes('manifest.webmanifest'), 'Production HTML does not link the web app manifest')
const distFiles = existsSync(distRoot) ? walk(distRoot) : []
for(const file of distFiles)
    assert(!forbiddenRuntimePattern.test(file.replace(`${distRoot}/`, '').replaceAll('\\', '/')), `Authoring-only or Bruno file reached production: ${file}`)
const distAssetNames = distFiles.map((file) => file.split('/').at(-1))

// Verify every bootstrap resource has a concrete High/Medium/Low counterpart.
// Keeping this derived from Game.js prevents a later asset addition from being
// checked for only one graphics preset.
const gameSource = readFileSync(join(projectRoot, 'sources', 'Game', 'Game.js'), 'utf8')
const qualityTemplates = [ ...gameSource.matchAll(/`([^`]*(?:\$\{compressedModelSuffix\}|\$\{compressedTextureExtension\})[^`]*)`/g) ]
    .map((match) => match[1])
    .filter((value) => value.includes('.glb') || value.includes('${compressedTextureExtension}'))
const runtimeProfiles = [
    { name: 'High', modelSuffix: '', textureExtension: 'png' },
    { name: 'Medium', modelSuffix: '', textureExtension: 'png' },
    { name: 'Low', modelSuffix: '-compressed', textureExtension: 'ktx' },
]

for(const profile of runtimeProfiles)
{
    for(const template of qualityTemplates)
    {
        const relativePath = template
            .replaceAll('${compressedModelSuffix}', profile.modelSuffix)
            .replaceAll('${compressedTextureExtension}', profile.textureExtension)
            .replaceAll('${cb}', '')
            .replace('?cb=1', '')
        assert(existsSync(join(staticRoot, relativePath)), `${profile.name} source asset is missing: ${relativePath}`)
        assert(existsSync(join(distRoot, relativePath)), `${profile.name} production asset is missing: ${relativePath}`)
    }
}

// High's retained WAV masters must arrive byte-for-byte in production.
for(const file of [ 'Baguira.wav', 'Boy.wav', 'Sudo.wav' ])
{
    const sourcePath = join(staticRoot, 'sounds', 'musics', 'high', file)
    const productionPath = join(distRoot, 'sounds', 'musics', 'high', file)
    if(existsSync(sourcePath) && existsSync(productionPath))
    {
        const sourceHash = createHash('sha256').update(readFileSync(sourcePath)).digest('hex')
        const productionHash = createHash('sha256').update(readFileSync(productionPath)).digest('hex')
        assert(sourceHash === productionHash, `High WAV master changed during production build: ${file}`)
    }
}

// The release deliberately keeps both full and compressed runtime variants.
// High/Medium load PNG + GLB; Low loads KTX + Draco on the next launch.
for(const [ full, compressed ] of [
    [ 'vehicle/default.glb', 'vehicle/default-compressed.glb' ],
    [ 'vehicle/oldSchool.glb', 'vehicle/oldSchool-compressed.glb' ],
    [ 'terrain/terrain.png', 'terrain/terrain.ktx' ],
    [ 'lab/images/black-hole.png', 'lab/images/black-hole.ktx' ],
    [ 'projects/images/threejs-journey-1.png', 'projects/images/threejs-journey-1.ktx' ],
])
{
    assert(existsSync(join(distRoot, full)), `Full quality asset is missing: ${full}`)
    assert(existsSync(join(distRoot, compressed)), `Low quality asset is missing: ${compressed}`)
}
assert(existsSync(join(distRoot, 'areas', 'areas.glb')), 'Validated landing areas.glb is missing from production output')
assert(!existsSync(join(distRoot, 'areas', 'areas-compressed.glb')), 'Invalid compressed landing areas variant must not ship')
for(const prefix of [ 'engine-three-', 'engine-physics-', 'Game-' ])
    assert(distAssetNames.some((name) => name.startsWith(prefix) && name.endsWith('.js')), `Production chunk is missing: ${prefix}`)
assert(distAssetNames.some((name) => name.endsWith('.css')), 'Production CSS chunk is missing')

if(failures.length)
{
    console.error('\nFinal release audit failed:\n')
    for(const failure of failures)
        console.error(`- ${failure}`)
    process.exit(1)
}

console.log('Final release audit passed.')
console.log(`- areas.glb: ${areasBytes.toLocaleString()} bytes; ${areasJson.nodes.length} reachable nodes; ${areasJson.meshes.length} meshes`)
console.log(`- runtime assets: ${audioFiles.length} MP3, ${glbFiles.length} GLB, ${ktxFiles.length} KTX, ${wavFiles.length} WAV`)
console.log(`- production files: ${distFiles.length}; engine/game chunks verified`)
