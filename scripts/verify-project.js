import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const projectRoot = resolve(import.meta.dirname, '..')
const staticRoot = join(projectRoot, 'static')
const sourcesRoot = join(projectRoot, 'sources')
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

const sourceFiles = walk(sourcesRoot).filter((file) => /\.(js|html|styl)$/.test(file))

for(const file of sourceFiles.filter((item) => item.endsWith('.js')))
{
    const content = readFileSync(file, 'utf8')
    const imports = content.matchAll(/(?:import|export)\s+(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]/g)

    for(const match of imports)
    {
        const importPath = match[1]
        if(!importPath.startsWith('.'))
            continue

        const resolved = resolve(join(file, '..'), importPath)
        assert(existsSync(resolved), `Missing local import: ${relative(projectRoot, file)} -> ${importPath}`)
    }
}

const checkPublicPath = (publicPath, sourceFile) =>
{
    if(!publicPath || /^(https?:|data:|#|\.\/style\/)/.test(publicPath))
        return

    const normalized = publicPath.replace(/^\.\//, '').replace(/^\//, '')
    if(!/^(ui|fonts|favicons|social|readme|intro|respawns|behindTheScene|palette|vehicle|terrain|areas|timeMachine)\//.test(normalized))
        return

    assert(
        existsSync(join(staticRoot, normalized)),
        `Missing public asset: ${relative(projectRoot, sourceFile)} -> ${publicPath}`
    )
}

for(const file of sourceFiles.filter((item) => item.endsWith('.html')))
{
    const content = readFileSync(file, 'utf8')
    for(const match of content.matchAll(/(?:src|href)=["']([^"']+)["']/g))
        checkPublicPath(match[1], file)
}

for(const file of sourceFiles.filter((item) => item.endsWith('.styl')))
{
    const content = readFileSync(file, 'utf8')
    for(const match of content.matchAll(/url\((?:['"])?([^'"\)]+)(?:['"])?\)/g))
        checkPublicPath(match[1], file)
}

for(const file of [ 'README.md', 'LICENSE', 'NOTICE', 'package.json', 'package-lock.json', 'vercel.json' ])
    assert(existsSync(join(projectRoot, file)), `Required root file is missing: ${file}`)

for(const file of [
    'static/ui/flags/ku.png',
    'static/ui/flags/ku.webp',
    'static/ui/previews/options.png',
    'static/ui/previews/options.webp',
    'static/areas/areas.glb'
])
    assert(existsSync(join(projectRoot, file)), `Required game asset is missing: ${file}`)

const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8'))
assert(packageJson.name === '4x4-coukoo', 'package.json must use the 4x4-coukoo package name')
assert(packageJson.license === 'MIT', 'package.json must declare the MIT license')
assert(packageJson.engines?.node === '24.x', 'package.json must require Node.js 24.x')
assert(!packageJson.dependencies?.sharp, 'sharp is a build-only dependency and must not ship with the game')
assert(!packageJson.dependencies?.glob, 'glob is a build-only dependency and must not ship with the game')
assert(!packageJson.dependencies?.['@gltf-transform/cli'], 'gltf-transform CLI is not required at runtime')

const areasFile = readFileSync(join(projectRoot, 'static/areas/areas.glb'))
assert(areasFile.toString('utf8', 0, 4) === 'glTF', 'areas.glb must be a valid GLB file')
const jsonLength = areasFile.readUInt32LE(12)
const areasJson = JSON.parse(areasFile.toString('utf8', 20, 20 + jsonLength).trim())
const landing = areasJson.nodes.find((node) => node.name === 'landing')
assert(Boolean(landing), 'areas.glb must contain the landing scene')

const landingChildren = (landing?.children ?? []).map((index) => areasJson.nodes[index])
const titleNodes = landingChildren.filter((node) => /^refLettersPhysicalDynamic\d+$/.test(node.name ?? ''))
assert(titleNodes.length === 7, 'areas.glb must contain exactly seven physical SARHANG title letters')
assert(landingChildren.some((node) => node.name === 'refLandingFlagAnchor'), 'areas.glb must contain the landing flag anchor')
assert(areasJson.materials.some((material) => material.name === 'landingTitlePurple'), 'areas.glb must contain the solid landing title material')
assert(!areasJson.nodes.some((node) => /refLettersPhysicalDynamic\.01[789]/.test(node.name ?? '')), 'Legacy title letter nodes must be removed from areas.glb')

const optionsPreview = readFileSync(join(projectRoot, 'static/ui/previews/options.png'))
assert(optionsPreview.length > 100000, 'Options preview must retain the complete high-resolution cover artwork')

const oldBrandPattern = /\b(?:Bruno\s+Simon|bruno-simon|brunosimon|Folio\s*2025|MY[-\s]?3D[-\s]?GAME)\b/i
for(const file of [ ...sourceFiles, join(projectRoot, 'README.md'), join(projectRoot, 'package.json') ])
{
    const content = readFileSync(file, 'utf8')
    assert(!oldBrandPattern.test(content), `Legacy branding remains in ${relative(projectRoot, file)}`)
}

if(failures.length)
{
    console.error('\nProject verification failed:\n')
    for(const failure of failures)
        console.error(`- ${failure}`)

    process.exit(1)
}

console.log(`Project verification passed: ${sourceFiles.length} source files and the landing GLB were checked.`)
