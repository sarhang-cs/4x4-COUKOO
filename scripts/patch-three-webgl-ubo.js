import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const backendPath = resolve('node_modules/three/src/renderers/webgl-fallback/WebGLBackend.js')
const marker = '4X4_COUKOO_WEBGL_UBO_FULL_UPLOAD'

if(!existsSync(backendPath))
{
    console.warn('WebGL UBO patch skipped: Three.js WebGL backend is not installed.')
    process.exit(0)
}

let source = readFileSync(backendPath, 'utf8')

if(source.includes(marker))
{
    console.log('Three WebGL full UBO upload patch already applied.')
    process.exit(0)
}

const bindingsPattern = /\t\t\t\tconst updateRanges = binding\.updateRanges;[\s\S]*?(?=\n\n\t\t\t\tmap\.index = i \+\+;)/
const bindingPattern = /\t\t\tconst updateRanges = binding\.updateRanges;[\s\S]*?(?=\n\n\t\t}\n\n\t}\n\n\t\/\/ attributes)/

if(!bindingsPattern.test(source) || !bindingPattern.test(source))
{
    console.warn('WebGL UBO patch skipped: installed Three.js backend layout changed.')
    process.exit(0)
}

source = source.replace(
    bindingsPattern,
    `\t\t\t\t// ${marker}: avoid partial UBO range uploads in the WebGL fallback.\n\t\t\t\t// Dynamic TSL bindings can change size; a full upload reallocates the\n\t\t\t\t// backing buffer exactly to array.byteLength and prevents GL_INVALID_OPERATION.\n\t\t\t\tgl.bindBuffer( gl.UNIFORM_BUFFER, bufferGPU );\n\t\t\t\tgl.bufferData( gl.UNIFORM_BUFFER, array, gl.DYNAMIC_DRAW );`
)

source = source.replace(
    bindingPattern,
    `\t\t\t// ${marker}: see updateBindings above.\n\t\t\tgl.bindBuffer( gl.UNIFORM_BUFFER, bufferGPU );\n\t\t\tgl.bufferData( gl.UNIFORM_BUFFER, array, gl.DYNAMIC_DRAW );`
)

writeFileSync(backendPath, source)
console.log('Applied Three WebGL full UBO upload patch.')
