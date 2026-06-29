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
const audioFiles = staticFiles.filter((file) => file.endsWith('.mp3'))
const wavFiles = staticFiles.filter((file) => file.endsWith('.wav'))
const glbFiles = staticFiles.filter((file) => file.endsWith('.glb'))
const ktxFiles = staticFiles.filter((file) => file.endsWith('.ktx'))
assert(audioFiles.length === 88, `Expected 88 MP3 files, found ${audioFiles.length}`)
assert(wavFiles.length === 0, `Unused WAV files remain: ${wavFiles.length}`)
assert(glbFiles.length > 0, 'No GLB assets were found')
assert(ktxFiles.length > 0, 'No KTX assets were found')

assert(existsSync(join(distRoot, 'index.html')), 'Production dist/index.html is missing')
const distFiles = existsSync(distRoot) ? walk(distRoot) : []
const distAssetNames = distFiles.map((file) => file.split('/').at(-1))
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
