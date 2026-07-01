import { StartupScreen } from './StartupScreen.js'
import { PwaManager } from './PwaManager.js'

const pwaManager = new PwaManager()
window.coukooPwa = pwaManager

const startupScreen = new StartupScreen()
window.coukooStartupScreen = startupScreen

const createStartupError = (code, message) =>
{
    const error = new Error(message)
    error.code = code
    return error
}

/**
 * Keep the HTML/CSS shell small. The 3D runtime is loaded as an async entry
 * after the browser has parsed the page, so the renderer and its dependencies
 * are cached in dedicated chunks instead of inflating the bootstrap bundle.
 */
async function boot()
{
    let reloadStage = ''
    try
    {
        reloadStage = sessionStorage.getItem('4x4-coukoo-reload-stage') || ''
        sessionStorage.removeItem('4x4-coukoo-reload-stage')
    }
    catch(error)
    {
        reloadStage = ''
    }

    startupScreen.setStage(reloadStage || 'Checking your device')
    startupScreen.setProgress(5)

    if(!StartupScreen.supportsWebGL())
        throw createStartupError('WEBGL_UNAVAILABLE', 'WebGL is unavailable in this browser.')

    startupScreen.setStage('Starting 3D engine')
    startupScreen.setProgress(9)

    if(import.meta.env.VITE_LOG === '1')
    {
        const { default: consoleLog } = await import('./data/consoleLog.js')
        console.log(...consoleLog)
    }

    // Object3D.copy must be patched before any world model is cloned.
    await import('./threejs-override.js')

    const { Game } = await import('./Game/Game.js')
    const game = new Game({ startupScreen })
    await game.ready

    if(import.meta.env.VITE_GAME_PUBLIC)
        window.game = game
}

boot().catch((error) =>
{
    console.error('4X4 COUKOO could not start.', error)
    startupScreen.fail(error)
})
