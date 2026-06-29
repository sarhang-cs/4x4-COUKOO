import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const backendPath = resolve('node_modules/three/src/renderers/webgl-fallback/WebGLBackend.js')
const marker = '4X4_COUKOO_WEBGL_UBO_CAPACITY_GUARD'

if(!existsSync(backendPath))
{
    console.error('Three UBO capacity guard failed: WebGL fallback backend is not installed.')
    process.exit(1)
}

let source = readFileSync(backendPath, 'utf8')

if(source.includes(marker))
{
    console.log('Three WebGL UBO capacity guard already applied.')
    process.exit(0)
}

const updateBindingsNeedle = `\t\t\t\tif ( updateRanges.length === 0 ) {\n\n\t\t\t\t\tgl.bufferData( gl.UNIFORM_BUFFER, array, gl.DYNAMIC_DRAW );\n\n\t\t\t\t} else {`
const updateBindingsReplacement = `\t\t\t\t// ${marker}: Uniform buffers are allocated once but a few dynamic\n\t\t\t\t// TSL bindings can later grow. Reallocate only when capacity changed;\n\t\t\t\t// otherwise preserve Three.js partial-range uploads for performance.\n\t\t\t\tif ( map._4x4UboByteLength !== array.byteLength ) {\n\n\t\t\t\t\tgl.bufferData( gl.UNIFORM_BUFFER, array, gl.DYNAMIC_DRAW );\n\t\t\t\t\tmap._4x4UboByteLength = array.byteLength;\n\n\t\t\t\t} else if ( updateRanges.length === 0 ) {\n\n\t\t\t\t\tgl.bufferData( gl.UNIFORM_BUFFER, array, gl.DYNAMIC_DRAW );\n\n\t\t\t\t} else {`

const updateBindingNeedle = `\t\t\tif ( updateRanges.length === 0 ) {\n\n\t\t\t\tgl.bufferData( gl.UNIFORM_BUFFER, array, gl.DYNAMIC_DRAW );\n\n\t\t\t} else {`
const updateBindingReplacement = `\t\t\t// ${marker}: see updateBindings above.\n\t\t\tif ( bindingData._4x4UboByteLength !== array.byteLength ) {\n\n\t\t\t\tgl.bufferData( gl.UNIFORM_BUFFER, array, gl.DYNAMIC_DRAW );\n\t\t\t\tbindingData._4x4UboByteLength = array.byteLength;\n\n\t\t\t} else if ( updateRanges.length === 0 ) {\n\n\t\t\t\tgl.bufferData( gl.UNIFORM_BUFFER, array, gl.DYNAMIC_DRAW );\n\n\t\t\t} else {`

const createNeedle = `\t\t\tgl.bindBuffer( gl.UNIFORM_BUFFER, uniformBufferData.bufferGPU );\n\t\t\tgl.bufferData( gl.UNIFORM_BUFFER, array.byteLength, gl.DYNAMIC_DRAW );`
const createReplacement = `\t\t\tgl.bindBuffer( gl.UNIFORM_BUFFER, uniformBufferData.bufferGPU );\n\t\t\tgl.bufferData( gl.UNIFORM_BUFFER, array.byteLength, gl.DYNAMIC_DRAW );\n\t\t\tuniformBufferData._4x4UboByteLength = array.byteLength;`

if(!source.includes(updateBindingsNeedle) || !source.includes(updateBindingNeedle) || !source.includes(createNeedle))
{
    console.error('Three UBO capacity guard failed: installed Three.js backend layout changed.')
    process.exit(1)
}

source = source.replace(updateBindingsNeedle, updateBindingsReplacement)
source = source.replace(updateBindingNeedle, updateBindingReplacement)
source = source.replace(createNeedle, createReplacement)

writeFileSync(backendPath, source)
console.log('Applied Three WebGL UBO capacity guard.')
