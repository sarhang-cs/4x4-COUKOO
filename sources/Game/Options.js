import { Game } from './Game.js'

export class Options
{
    constructor()
    {
        this.game = Game.getInstance()
        this.element = this.game.menu.items.get('options').contentElement

        this.setSound()
        this.setQuality()
        this.setPerformance()
        this.setVisualEffects()
        this.setVibration()
        this.setFullscreen()
        this.setRespawn()
        this.setReset()
        this.setRenderer()
        this.setServer()
        this.setPwa()
        this.setSaveSystem()
    }

    setSound()
    {
        const toggleElement = this.element.querySelector('.js-audio-toggle')
        const volumeElement = this.element.querySelector('.js-audio-volume')
        const volumeValueElement = this.element.querySelector('.js-audio-volume-value')

        const updateMute = (muted) =>
        {
            toggleElement.setAttribute('aria-pressed', muted ? 'true' : 'false')
            toggleElement.setAttribute('aria-label', muted ? 'Unmute sound' : 'Mute sound')
        }
        const updateVolume = (volume) =>
        {
            const percentage = Math.round(volume * 100)
            volumeElement.value = String(percentage)
            volumeValueElement.textContent = `${percentage}%`
        }

        toggleElement.addEventListener('click', this.game.audio.mute.toggle)
        volumeElement.addEventListener('input', () =>
        {
            this.game.audio.volume.set(Number(volumeElement.value) / 100)
        })

        this.game.audio.events.on('muteChange', updateMute)
        this.game.audio.events.on('volumeChange', updateVolume)
        updateMute(this.game.audio.mute.active)
        updateVolume(this.game.audio.volume.value)
    }

    setQuality()
    {
        const element = this.element.querySelector('.js-quality-toggle')
        const text = element.querySelector('span')
        const tooltip = element.querySelector('.tooltip')
        const update = () =>
        {
            const label = this.game.quality.getLabel()
            const assetProfile = this.game.quality.getAssetProfile()
            text.textContent = label
            element.dataset.qualitySource = assetProfile.id
            element.setAttribute('aria-label', `Graphics preset: ${label}. Tap to change.`)
            if(tooltip)
                tooltip.textContent = assetProfile.description
        }

        element.addEventListener('click', () => this.game.quality.changeLevel(this.game.quality.getNextLevel()))
        this.game.quality.events.on('change', update)
        update()
    }

    setPerformance()
    {
        const fpsElement = this.element.querySelector('.js-fps-toggle')
        const fpsText = fpsElement.querySelector('span')
        const shadowsElement = this.element.querySelector('.js-shadows-toggle')
        const shadowsText = shadowsElement.querySelector('span')
        const performanceText = this.element.querySelector('.js-performance-status span')

        const update = () =>
        {
            const limit = this.game.quality.getFpsLimit()
            fpsText.textContent = limit ? `${limit} FPS` : 'Auto'

            const shadowMode = this.game.quality.getShadowMode()
            shadowsText.textContent = shadowMode === 'auto'
                ? `Auto (${this.game.quality.getShadowsEnabled() ? 'On' : 'Off'})`
                : shadowMode === 'on' ? 'On' : 'Off'

            const profile = this.game.quality.getProfile()
            const renderer = this.game.rendering?.renderer?.backend?.isWebGLBackend ? 'WebGL' : 'WebGPU'
            const ratio = this.game.rendering?.activePixelRatio
            const ratioText = Number.isFinite(ratio) && ratio > 0 ? ` · ${ratio.toFixed(2)}x render` : ''
            const assetProfile = this.game.quality.getAssetProfile()
            performanceText.textContent = `${renderer} · ${profile.name} · ${assetProfile.label}${ratioText}`
        }

        fpsElement.addEventListener('click', () => this.game.quality.cycleFpsLimit())
        shadowsElement.addEventListener('click', () => this.game.quality.cycleShadowMode())
        this.game.quality.events.on('change', update)
        this.game.quality.events.on('settingsChange', update)
        this.game.viewport.events.on('change', update)
        update()
    }

    setVisualEffects()
    {
        const element = this.element.querySelector('.js-visual-effects-toggle')
        const text = element.querySelector('span')
        const tooltip = element.querySelector('.tooltip')

        const update = () =>
        {
            const effects = this.game.visualEffects
            const mode = effects.getMode()
            text.textContent = effects.getLabel()
            element.setAttribute('aria-label', `Visual effects: ${effects.getLabel()}. Tap to change.`)
            tooltip.textContent = mode === 'auto'
                ? 'Uses cinematic rain, snow, night color and speed effects when the graphics preset has room for them'
                : mode === 'on'
                    ? 'Cinematic rain, snow, night color and speed effects are enabled'
                    : 'Cinematic screen-space visual effects are disabled'
        }

        element.addEventListener('click', () => this.game.visualEffects.cycleMode())
        this.game.visualEffects.events.on('change', update)
        this.game.quality.events.on('change', update)
        update()
    }

    setVibration()
    {
        const element = this.element.querySelector('.js-vibration-toggle')
        const text = element.querySelector('span')
        const tooltip = element.querySelector('.tooltip')

        const update = () =>
        {
            const enabled = this.game.haptics.enabled
            text.textContent = enabled ? 'On' : 'Off'
            element.setAttribute('aria-pressed', enabled ? 'true' : 'false')
            tooltip.textContent = this.game.haptics.supported
                ? 'Vibrates on stronger vehicle impacts'
                : 'Your browser does not support vibration'
        }

        element.addEventListener('click', () =>
        {
            this.game.haptics.setEnabled(!this.game.haptics.enabled, { preview: true })
            update()
        })

        update()
    }

    setFullscreen()
    {
        const element = this.element.querySelector('.js-fullscreen-toggle')
        const text = element.querySelector('span')
        const tooltip = element.querySelector('.tooltip')

        const update = () =>
        {
            const active = Boolean(document.fullscreenElement)
            const supported = Boolean(document.fullscreenEnabled || document.documentElement.requestFullscreen)
            text.textContent = active ? 'Exit full screen' : 'Full screen'
            element.disabled = !supported
            tooltip.textContent = supported
                ? (active ? 'Return to normal view' : 'Use more of your screen')
                : 'Full screen is not available in this browser'
        }

        element.addEventListener('click', async () =>
        {
            try
            {
                if(document.fullscreenElement)
                    await document.exitFullscreen()
                else
                    await this.game.domElement.requestFullscreen?.()
            }
            catch(error)
            {
                tooltip.textContent = 'Full screen was blocked by this browser'
            }
            update()
        })

        document.addEventListener('fullscreenchange', update)
        update()
    }

    setRespawn()
    {
        const element = this.element.querySelector('.js-respawn')

        element.addEventListener('click', () =>
        {
            this.game.player.respawn()
            this.game.menu.close()
        })
    }

    setReset()
    {
        const element = this.element.querySelector('.js-reset')

        element.addEventListener('click', () =>
        {
            this.game.reset()
            this.game.menu.close()
        })
    }

    setRenderer()
    {
        if(this.game.rendering.renderer.backend.isWebGLBackend)
        {
            const element = this.element.querySelector('.js-renderer')
            element.classList.remove('is-success')
            element.classList.add('is-danger')

            const text = element.querySelector('span')
            text.textContent = 'WebGL'

            const tooltip = element.querySelector('.js-tooltip')
            tooltip.innerHTML = /* html */`Your browser is <strong>not compatible</strong> with WebGPU resulting in performance loss`
        }
    }

    setServer()
    {
        const element = this.element.querySelector('.js-server')
        const text = element.querySelector('span')
        const tooltip = element.querySelector('.js-tooltip')

        const update = (connected) =>
        {
            if(connected)
            {
                element.classList.add('is-success')
                element.classList.remove('is-danger')

                text.textContent = 'Online'

                tooltip.innerHTML = /* html */`Enjoy the <strong>multiplayer</strong> features`
            }
            else
            {
                element.classList.remove('is-success')
                element.classList.add('is-danger')
                text.textContent = 'Offline'

                tooltip.innerHTML = /* html */`Should be back soon`
            }
        }

        update(this.game.server.connected)

        this.game.server.events.on('connected', () => update(true))
        this.game.server.events.on('disconnected', () => update(false))
    }

    setPwa()
    {
        const installElement = this.element.querySelector('.js-install-app')
        const installText = installElement?.querySelector('span')
        const installTooltip = this.element.querySelector('.js-install-app-tooltip')
        const offlineElement = this.element.querySelector('.js-offline-status')
        const offlineText = offlineElement?.querySelector('span')
        const offlineTooltip = this.element.querySelector('.js-offline-tooltip')
        const pwa = this.game.pwa

        if(!installElement || !offlineElement)
            return

        const update = () =>
        {
            const status = pwa?.getStatus?.() ?? { supported: false, installMode: 'unavailable', offlineReady: false, online: true }
            const mode = status.installMode

            installElement.disabled = !status.supported || mode === 'installed'
            installElement.classList.toggle('is-disabled', !status.supported || mode === 'installed')
            installElement.classList.toggle('is-success', mode === 'installed')
            installElement.classList.toggle('is-danger', !status.supported || status.registrationFailed)

            if(mode === 'installed')
            {
                installText.textContent = 'Installed'
                installTooltip.textContent = '4X4 COUKOO is already installed on this device.'
            }
            else if(mode === 'available')
            {
                installText.textContent = 'Install app'
                installTooltip.textContent = 'Install 4X4 COUKOO for a full-screen app experience.'
            }
            else if(mode === 'manual')
            {
                installText.textContent = 'Install guide'
                installTooltip.textContent = 'On iPhone or iPad, use Share then Add to Home Screen.'
            }
            else
            {
                installText.textContent = status.supported ? 'Not available' : 'HTTPS required'
                installTooltip.textContent = status.supported
                    ? 'Use a browser that supports installing web apps, then try again.'
                    : 'Install and offline play require HTTPS or localhost.'
            }

            offlineElement.classList.toggle('is-success', status.offlineReady)
            offlineElement.classList.toggle('is-danger', !status.online || status.registrationFailed)
            offlineText.textContent = status.offlineReady
                ? (status.online ? 'Ready' : 'Offline')
                : (status.online ? 'Setting up' : 'Offline')
            offlineTooltip.textContent = status.offlineReady
                ? 'The app shell is ready offline. Game files are kept after they load successfully.'
                : status.registrationFailed
                    ? 'Offline support could not be enabled in this browser.'
                    : 'Offline support is preparing. Keep the game open for a moment, then reload once.'
        }

        installElement.addEventListener('click', async () =>
        {
            const result = await pwa?.promptInstall?.()
            if(result?.state === 'manual')
            {
                installText.textContent = 'Share → Home Screen'
                installTooltip.textContent = 'Open your browser Share menu, then choose Add to Home Screen.'
            }
            else if(result?.state === 'dismissed')
            {
                installText.textContent = 'Install app'
                installTooltip.textContent = 'Installation was cancelled. You can try again when your browser shows the prompt.'
            }
            update()
        })

        pwa?.events?.on('change', update)
        update()
    }

    setSaveSystem()
    {
        const statusElement = this.element.querySelector('.js-save-status')
        const statusText = statusElement.querySelector('span')
        const statusTooltip = statusElement.querySelector('.js-save-tooltip')
        const exportElement = this.element.querySelector('.js-save-export')
        const clearElement = this.element.querySelector('.js-save-clear')

        const formatSavedAt = (timestamp) =>
        {
            if(!Number.isFinite(timestamp) || timestamp <= 0)
                return 'Not saved yet'

            try
            {
                return new Intl.DateTimeFormat(undefined, {
                    hour: '2-digit',
                    minute: '2-digit',
                    day: '2-digit',
                    month: 'short',
                }).format(new Date(timestamp))
            }
            catch(error)
            {
                return 'Saved on this device'
            }
        }

        const update = () =>
        {
            if(!this.game.save.available)
            {
                statusElement.classList.remove('is-success')
                statusElement.classList.add('is-danger')
                statusText.textContent = 'Unavailable'
                statusTooltip.textContent = 'Browser storage is unavailable. Progress will not persist after closing the game.'
                exportElement.disabled = true
                clearElement.disabled = true
                return
            }

            const label = formatSavedAt(this.game.save.getLastSavedAt())
            statusElement.classList.remove('is-danger')
            statusElement.classList.add('is-success')
            statusText.textContent = 'Saved'
            statusTooltip.textContent = `Last saved: ${label}`
            exportElement.disabled = false
            clearElement.disabled = false
        }

        exportElement.addEventListener('click', () =>
        {
            const result = this.game.save.exportBackup()
            if(result.downloaded)
            {
                const original = exportElement.textContent
                exportElement.textContent = 'Backup ready'
                setTimeout(() => { exportElement.textContent = original }, 1600)
            }
        })

        clearElement.addEventListener('click', () =>
        {
            const confirmed = window.confirm('Clear saved progress? Your audio, graphics, and country settings will be kept.')
            if(!confirmed)
                return

            this.game.save.clearProgress()
            window.location.reload()
        })

        this.game.save.events.on('saved', update)
        this.game.save.events.on('error', update)
        update()
    }
}
