const STARTUP_ERROR_CODES = {
    WEBGL_UNAVAILABLE: {
        title: '3D graphics are unavailable',
        description: 'This browser could not create the graphics engine needed by 4X4 COUKOO. Open the game in a recent browser and make sure hardware acceleration is enabled.',
    },
    STARTUP_TIMEOUT: {
        title: 'The world is taking too long to load',
        description: 'Your connection may be slow or one of the game files could not be reached. Check your internet connection, then try again.',
    },
    RESOURCE_LOAD_FAILED: {
        title: 'A game file could not be loaded',
        description: 'Please check your connection and reload the game. If this keeps happening, clear the browser cache and try again.',
    },
    STARTUP_FAILED: {
        title: '4X4 COUKOO could not start',
        description: 'The 3D world could not be prepared on this device. Reload the page, then try a recent browser with hardware acceleration enabled.',
    },
}

const clamp = (value, min, max) => Math.max(min, Math.min(value, max))

export class StartupScreen
{
    static supportsWebGL()
    {
        try
        {
            const canvas = document.createElement('canvas')
            const context = canvas.getContext('webgl2', { powerPreference: 'high-performance' })
                || canvas.getContext('webgl', { powerPreference: 'high-performance' })
                || canvas.getContext('experimental-webgl')

            if(!context)
                return false

            // Release the temporary test context immediately on devices that expose
            // WEBGL_lose_context. The actual renderer will create its own context.
            context.getExtension('WEBGL_lose_context')?.loseContext()
            return true
        }
        catch(error)
        {
            return false
        }
    }

    constructor()
    {
        this.element = document.querySelector('.js-startup-screen')
        this.loadingPanel = this.element?.querySelector('.js-startup-loading')
        this.errorPanel = this.element?.querySelector('.js-startup-error')
        this.progressElement = this.element?.querySelector('.js-startup-progress')
        this.progressValueElement = this.element?.querySelector('.js-startup-progress-value')
        this.statusElement = this.element?.querySelector('.js-startup-status')
        this.hintElement = this.element?.querySelector('.js-startup-hint')
        this.errorTitleElement = this.element?.querySelector('.js-startup-error-title')
        this.errorDescriptionElement = this.element?.querySelector('.js-startup-error-description')
        this.errorCodeElement = this.element?.querySelector('.js-startup-error-code')
        this.retryElement = this.element?.querySelector('.js-startup-retry')
        this.progress = 0
        this.hidden = false
        this.failed = false
        this.slowTimer = null
        this.timeoutTimer = null

        this.retryElement?.addEventListener('click', () =>
        {
            window.location.reload()
        })

        document.documentElement.classList.add('is-starting')
        this.setStage('Checking your device')
        this.setProgress(2)
        this.setSlowConnectionTimers()
    }

    setSlowConnectionTimers()
    {
        this.slowTimer = window.setTimeout(() =>
        {
            if(!this.hidden && !this.failed)
            {
                this.hintElement.textContent = 'Still loading — large 3D files can take a little longer on mobile data.'
                this.element?.classList.add('is-slow')
            }
        }, 8000)

        this.timeoutTimer = window.setTimeout(() =>
        {
            if(!this.hidden && !this.failed)
            {
                const error = new Error('Startup timed out while waiting for resources.')
                error.code = 'STARTUP_TIMEOUT'
                this.fail(error)
            }
        }, 60000)
    }

    showForReload(stage = 'Preparing the selected game settings…')
    {
        this.clearTimers()
        this.hidden = false
        this.failed = false
        this.progress = 0

        this.loadingPanel?.removeAttribute('hidden')
        this.errorPanel?.setAttribute('hidden', '')
        this.element?.classList.remove('is-hidden', 'has-error', 'is-slow')
        this.element?.setAttribute('aria-hidden', 'false')
        document.documentElement.classList.remove('is-ready', 'is-startup-failed')
        document.documentElement.classList.add('is-starting')

        this.setStage(stage, 'Restarting the 3D world with your selected settings.')
        this.setProgress(4)
        this.setSlowConnectionTimers()
    }

    clearTimers()
    {
        window.clearTimeout(this.slowTimer)
        window.clearTimeout(this.timeoutTimer)
        this.slowTimer = null
        this.timeoutTimer = null
    }

    setStage(label, hint = '')
    {
        if(this.hidden || this.failed)
            return

        if(this.statusElement)
            this.statusElement.textContent = label

        if(hint && this.hintElement)
            this.hintElement.textContent = hint
    }

    setProgress(value)
    {
        if(this.hidden || this.failed)
            return

        const next = clamp(Math.round(value), 0, 100)
        this.progress = Math.max(this.progress, next)

        if(this.progressElement)
            this.progressElement.style.setProperty('--startup-progress', `${this.progress}%`)

        if(this.progressValueElement)
            this.progressValueElement.textContent = `${this.progress}%`

        this.progressElement?.setAttribute('aria-valuenow', String(this.progress))
    }

    hide()
    {
        if(this.hidden || this.failed)
            return

        this.setProgress(100)
        this.setStage('Ready to drive')
        this.clearTimers()
        this.hidden = true
        document.documentElement.classList.remove('is-starting')
        document.documentElement.classList.add('is-ready')

        window.setTimeout(() =>
        {
            this.element?.setAttribute('aria-hidden', 'true')
            this.element?.classList.add('is-hidden')
        }, 550)
    }

    fail(error)
    {
        if(this.failed || this.hidden)
            return

        this.failed = true
        this.clearTimers()
        const code = error?.code && STARTUP_ERROR_CODES[error.code]
            ? error.code
            : error?.message?.includes('Couldn\'t load resource')
                ? 'RESOURCE_LOAD_FAILED'
                : 'STARTUP_FAILED'
        const content = STARTUP_ERROR_CODES[code]

        this.loadingPanel?.setAttribute('hidden', '')
        this.errorPanel?.removeAttribute('hidden')
        this.errorTitleElement.textContent = content.title
        this.errorDescriptionElement.textContent = content.description
        this.errorCodeElement.textContent = `Error code: ${code}`
        this.element?.classList.add('has-error')
        document.documentElement.classList.remove('is-starting')
        document.documentElement.classList.add('is-startup-failed')
    }
}
