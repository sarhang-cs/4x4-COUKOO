import 'dotenv/config'
import wasm from 'vite-plugin-wasm'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default {
    root: 'sources/',
    envDir: '../',
    publicDir: '../static/',
    base: './',

    server:
    {
        host: true,
        open: true
    },

    build:
    {
        outDir: '../dist',
        emptyOutDir: true,
        target: 'esnext',
        sourcemap: false
    },

    plugins:
    [
        wasm(),
        nodePolyfills({
            globals:
            {
                Buffer: true,
                global: true,
                process: true
            }
        })
    ]
}
