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

// Local JavaScript imports must resolve from the source tree.
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

// Public images, fonts and icons referenced by the application must exist in static/.
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

// Project identity and new Kurdistan flag assets are required.
for(const file of [ 'README.md', 'LICENSE', 'NOTICE', 'package.json', 'package-lock.json' ])
    assert(existsSync(join(projectRoot, file)), `Required root file is missing: ${file}`)

for(const file of [ 'static/ui/flags/ku.png', 'static/ui/flags/ku.webp' ])
    assert(existsSync(join(projectRoot, file)), `Required Kurdistan flag asset is missing: ${file}`)

const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8'))
assert(packageJson.name === '4x4-coukoo', 'package.json must use the 4x4-coukoo package name')
assert(packageJson.license === 'MIT', 'package.json must declare the MIT license')

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

console.log(`Project verification passed: ${sourceFiles.length} source files checked.`)
