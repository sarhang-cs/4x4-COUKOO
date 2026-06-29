/**
 * Keep the HTML/CSS shell small. The 3D runtime is loaded as an async entry
 * after the browser has parsed the page, so the renderer and its dependencies
 * are cached in dedicated chunks instead of inflating the bootstrap bundle.
 */
async function boot()
{
    if(import.meta.env.VITE_LOG)
    {
        const { default: consoleLog } = await import('./data/consoleLog.js')
        console.log(...consoleLog)
    }

    // Object3D.copy must be patched before any world model is cloned.
    await import('./threejs-override.js')

    const { Game } = await import('./Game/Game.js')

    if(import.meta.env.VITE_GAME_PUBLIC)
        window.game = new Game()
    else
        new Game()
}

boot().catch((error) =>
{
    console.error('4X4 COUKOO could not start.', error)
    document.documentElement.classList.add('is-startup-failed')
})
