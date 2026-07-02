import { Events } from './Game/Events.js'

const isStandalone = () =>
{
    try
    {
        return window.matchMedia?.('(display-mode: standalone)').matches
            || window.navigator?.standalone === true
    }
    catch(error)
    {
        return false
    }
}

const canUseServiceWorker = () =>
    typeof window !== 'undefined'
    && Boolean(window.isSecureContext)
    && 'serviceWorker' in window.navigator

/**
 * Keeps progressive-web-app behavior separate from the 3D game runtime.
 * It only starts when the page is served over HTTPS (or localhost), so file
 * previews and unsupported browsers keep working as a normal website.
 */
export class PwaManager
{
    constructor()
    {
        this.events = new Events()
        this.registration = null
        this.installPrompt = null
        this.installed = isStandalone()
        this.offlineReady = false
        this.updateAvailable = false
        this.registrationFailed = false
        this.game = null
        this.controllerChanged = false
        this.pendingSilentUpdate = false

        this.onBeforeInstallPrompt = (event) =>
        {
            event.preventDefault()
            this.installPrompt = event
            this.events.trigger('change')
        }

        this.onAppInstalled = () =>
        {
            this.installed = true
            this.installPrompt = null
            this.events.trigger('change')
        }

        this.onConnectionChange = () => this.events.trigger('change')

        window.addEventListener('beforeinstallprompt', this.onBeforeInstallPrompt)
        window.addEventListener('appinstalled', this.onAppInstalled)
        window.addEventListener('online', this.onConnectionChange)
        window.addEventListener('offline', this.onConnectionChange)

        this.register()
    }

    async register()
    {
        if(!canUseServiceWorker())
        {
            this.events.trigger('change')
            return
        }

        try
        {
            this.registration = await navigator.serviceWorker.register('./sw.js', { scope: './' })
            this.offlineReady = Boolean(navigator.serviceWorker.controller)
            this.observeRegistration(this.registration)

            navigator.serviceWorker.addEventListener('controllerchange', () =>
            {
                this.offlineReady = true
                this.events.trigger('change')

                if(this.controllerChanged)
                    return

                this.controllerChanged = true

                if(this.pendingSilentUpdate || this.updateAvailable)
                    window.location.reload()
            })
        }
        catch(error)
        {
            console.warn('PWA service worker could not be registered.', error)
            this.registrationFailed = true
        }

        this.events.trigger('change')
    }

    observeRegistration(registration)
    {
        const handleInstalledWorker = (worker, reason = 'updatefound') =>
        {
            if(!worker)
                return

            if(!navigator.serviceWorker.controller)
            {
                worker.postMessage({ type: 'SKIP_WAITING' })
                return
            }

            // If a waiting worker already exists during startup, apply it
            // quietly so players are not blocked by the same update banner on
            // every launch before entering the world.
            if(reason === 'startup-waiting')
            {
                this.pendingSilentUpdate = true
                worker.postMessage({ type: 'SKIP_WAITING' })
                return
            }

            this.markUpdateAvailable()
        }

        if(registration.waiting)
            handleInstalledWorker(registration.waiting, 'startup-waiting')

        registration.addEventListener('updatefound', () =>
        {
            const worker = registration.installing
            if(!worker)
                return

            worker.addEventListener('statechange', () =>
            {
                if(worker.state === 'installed')
                    handleInstalledWorker(worker)
                else if(worker.state === 'activated')
                {
                    this.offlineReady = true
                    this.events.trigger('change')
                }
            })
        })
    }

    markUpdateAvailable()
    {
        if(this.updateAvailable)
            return

        this.updateAvailable = true
        this.events.trigger('change')
        this.game?.notifications?.show(
            '<div class="top"><div class="title">Update ready</div></div><div class="bottom"><div class="description">Tap here to load the newest 4X4 COUKOO version.</div></div>',
            'pwa',
            8,
            () => this.applyUpdate(),
            'pwa-update'
        )
    }

    attachGame(game)
    {
        this.game = game

        if(this.updateAvailable)
        {
            this.game.notifications?.show(
                '<div class="top"><div class="title">Update ready</div></div><div class="bottom"><div class="description">Tap here to load the newest 4X4 COUKOO version.</div></div>',
                'pwa',
                8,
                () => this.applyUpdate(),
                'pwa-update'
            )
        }
    }

    getInstallMode()
    {
        if(this.installed)
            return 'installed'

        if(this.installPrompt)
            return 'available'

        const isAppleMobile = /iPad|iPhone|iPod/.test(navigator.userAgent)
        if(isAppleMobile)
            return 'manual'

        return 'unavailable'
    }

    getStatus()
    {
        return {
            supported: canUseServiceWorker(),
            installed: this.installed,
            installMode: this.getInstallMode(),
            offlineReady: this.offlineReady,
            online: navigator.onLine !== false,
            updateAvailable: this.updateAvailable,
            registrationFailed: this.registrationFailed,
        }
    }

    async promptInstall()
    {
        if(this.installed)
            return { state: 'installed' }

        if(!this.installPrompt)
        {
            const mode = this.getInstallMode()
            return { state: mode === 'manual' ? 'manual' : 'unavailable' }
        }

        const prompt = this.installPrompt
        this.installPrompt = null
        this.events.trigger('change')

        try
        {
            await prompt.prompt()
            const result = await prompt.userChoice
            if(result?.outcome === 'accepted')
                this.installed = true

            this.events.trigger('change')
            return { state: result?.outcome === 'accepted' ? 'accepted' : 'dismissed' }
        }
        catch(error)
        {
            console.warn('PWA install prompt failed.', error)
            this.events.trigger('change')
            return { state: 'unavailable' }
        }
    }

    applyUpdate()
    {
        const waiting = this.registration?.waiting
        if(!waiting)
            return false

        waiting.postMessage({ type: 'SKIP_WAITING' })
        return true
    }
}
