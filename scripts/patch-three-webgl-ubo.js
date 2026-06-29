import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const backendPath = resolve('node_modules/three/src/renderers/webgl-fallback/WebGLBackend.js')
const marker = '4X4_COOKOO_UBO_SIZE_GUARD'

if(!existsSync(backendPath))
{
    console.warn('UBO guard skipped: three WebGL backend was not installed.')
    process.exit(0)
}

let source = readFileSync(backendPath, 'utf8')

if(source.includes(marker))
{
    console.log('Three WebGL UBO size guard already applied.')
    process.exit(0)
}

const createLine = '\t\t\t\t\tthis.set( array, { bufferGPU } );'
const resizedCreateLine = '\t\t\t\t\tthis.set( array, { bufferGPU, bufferSize: array.byteLength } );'

const existingBranch = `\t\t\t\t} else {\n\n\t\t\t\t\tgl.bindBuffer( gl.UNIFORM_BUFFER, bufferGPU );\n\n\t\t\t\t}\n\n\t\t\t\t// update`
const guardedBranch = `\t\t\t\t} else {\n\n\t\t\t\t\tgl.bindBuffer( gl.UNIFORM_BUFFER, bufferGPU );\n\n\t\t\t\t\t// 4X4_COOKOO_UBO_SIZE_GUARD: dynamic node bindings can grow\n\t\t\t\t\t// after their first allocation; WebGL requires a matching backing UBO.\n\t\t\t\t\tconst bufferData = this.get( array );\n\t\t\t\t\tif ( bufferData.bufferSize !== array.byteLength ) {\n\n\t\t\t\t\t\tgl.bufferData( gl.UNIFORM_BUFFER, array, gl.DYNAMIC_DRAW );\n\t\t\t\t\t\tbufferData.bufferSize = array.byteLength;\n\t\t\t\t\t\tthis.set( array, bufferData );\n\n\t\t\t\t\t}\n\n\t\t\t\t}\n\n\t\t\t\t// update`

if(!source.includes(createLine) || !source.includes(existingBranch))
{
    console.warn('UBO guard skipped: installed three.js backend layout changed.')
    process.exit(0)
}

source = source.replace(createLine, resizedCreateLine).replace(existingBranch, guardedBranch)
writeFileSync(backendPath, source)
console.log('Applied Three WebGL uniform-buffer size guard.')
