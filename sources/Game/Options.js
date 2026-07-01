import { Game } from './Game.js'

export class Options
{
    constructor()
    {
        this.game = Game.getInstance()
        this.element = this.game.menu.items.get('options').contentElement

        this.setSettingsPicker()
        this.setSound()
        this.setQuality()
        this.setPerformance()
        this.setDeviceProfile()
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
            text.textContent = `${label} · ${this.game.quality.getFpsLabel(this.game.quality.getFpsLimit(), this.game.quality.level)}`
            element.dataset.qualitySource = assetProfile.id
            element.setAttribute('aria-label', `Graphics preset: ${label}. Tap to change.`)
            if(tooltip)
                tooltip.textContent = assetProfile.description
        }

        element.addEventListener('click', () =>
        {
            const levels = this.game.quality.constructor.LEVELS
            this.openSettingsPicker({
                title: 'Choose graphics quality',
                description: 'Choose one world profile. Each preset keeps its own real graphics profile, while the frame-rate mode below only shows options this device can actually present.',
                value: this.game.quality.level,
                confirmLabel: 'Confirm and reload',
                options: [
                    { value: levels.LOW, title: 'Low', description: `Lightweight mobile world. Available FPS on this device: ${this.game.quality.getFpsRangeLabel(levels.LOW)}.` },
                    { value: levels.MEDIUM, title: 'Medium', description: `Balanced full-content world. Available FPS on this device: ${this.game.quality.getFpsRangeLabel(levels.MEDIUM)}.` },
                    { value: levels.HIGH, title: 'High', description: `Full-detail world with the richest renderer profile. Available FPS on this device: ${this.game.quality.getFpsRangeLabel(levels.HIGH)}.` },
                ],
                onConfirm: (level) =>
                {
                    if(level === this.game.quality.level)
                        return

                    this.game.quality.changeLevel(level, { notify: false })
                    const profile = this.game.quality.getAssetProfile(level)
                    this.game.requestControlledReload(`Loading ${profile.label} world assets…`)
                },
            })
        })
        this.game.quality.events.on('change', update)
        this.game.quality.events.on('settingsChange', update)
        this.game.quality.events.on('deviceChange', update)
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
            const measuredRefresh = this.game.quality.getMeasuredRefreshHz()
            fpsText.textContent = this.game.quality.getFpsLabel(limit, this.game.quality.level)
            fpsElement.setAttribute('aria-label', `Frame rate limit: ${fpsText.textContent}. Tap to change.`)

            const fpsTooltip = fpsElement.querySelector('.tooltip')
            if(fpsTooltip)
            {
                const options = this.game.quality.getAvailableFpsLimits(this.game.quality.level)
                    .map((value) => this.game.quality.getFpsLabel(value, this.game.quality.level))
                    .join(' · ')
                fpsTooltip.textContent = `Measured browser/display cadence: ${measuredRefresh} Hz. Available for ${this.game.quality.getLabel()}: ${options}`
            }

            const shadowMode = this.game.quality.getShadowMode()
            shadowsText.textContent = shadowMode === 'auto'
                ? `Auto (${this.game.quality.getShadowsEnabled() ? 'On' : 'Off'})`
                : shadowMode === 'on' ? 'On' : 'Off'

            const profile = this.game.quality.getProfile()
            const renderer = this.game.rendering?.renderer?.backend?.isWebGLBackend ? 'WebGL' : 'WebGPU'
            const ratio = this.game.rendering?.activePixelRatio
            const ratioText = Number.isFinite(ratio) && ratio > 0 ? ` · ${ratio.toFixed(2)}x render` : ''
            const assetProfile = this.game.quality.getAssetProfile()
            const actualFps = this.game.quality.getEffectiveFpsLimit(limit, this.game.quality.level)
            const actualFpsText = actualFps > 0 ? `${actualFps} FPS target` : `Native ${measuredRefresh} Hz target`
            performanceText.textContent = `${renderer} · ${profile.name} · ${assetProfile.label} · ${fpsText.textContent} · ${actualFpsText}${ratioText}`
        }

        fpsElement.addEventListener('click', () =>
        {
            const quality = this.game.quality
            const measuredRefresh = quality.getMeasuredRefreshHz()
            const fpsOptions = quality.getAvailableFpsLimits(quality.level).map((value) => ({
                value,
                title: quality.getFpsLabel(value, quality.level),
                description: quality.getFpsDescription(value, quality.level),
            }))

            this.openSettingsPicker({
                title: 'Choose frame-rate mode',
                description: `Measured browser/display cadence: ${measuredRefresh} Hz. Only frame rates this browser and display can really present are shown. Auto picks the best target for the current ${quality.getLabel()} graphics preset.`,
                value: quality.getFpsLimit(),
                confirmLabel: 'Apply and reload',
                options: fpsOptions,
                onConfirm: (limit) =>
                {
                    if(limit === quality.getFpsLimit())
                        return

                    quality.setFpsLimit(limit, { notify: false })
                    this.game.requestControlledReload(`Applying ${quality.getFpsLabel(limit, quality.level)} mode…`)
                },
            })
        })

        shadowsElement.addEventListener('click', () =>
        {
            const shadowOptions = [
                { value: 'auto', title: 'Auto', description: 'Uses the shadow level recommended by the selected graphics profile.' },
                { value: 'on', title: 'On', description: 'Always enables shadows. This needs more GPU memory.' },
                { value: 'off', title: 'Off', description: 'Turns shadows off for the best frame stability.' },
            ]

            this.openSettingsPicker({
                title: 'Choose shadow mode',
                description: 'Shadow changes restart the renderer cleanly to prevent a black or blank 3D canvas.',
                value: this.game.quality.getShadowMode(),
                confirmLabel: 'Apply and reload',
                options: shadowOptions,
                onConfirm: (mode) =>
                {
                    if(mode === this.game.quality.getShadowMode())
                        return

                    this.game.quality.setShadowMode(mode, { notify: false })
                    this.game.requestControlledReload('Applying shadow setting…')
                },
            })
        })
        this.game.quality.events.on('change', update)
        this.game.quality.events.on('settingsChange', update)
        this.game.quality.events.on('deviceChange', update)
        this.game.viewport.events.on('change', update)
        update()
    }

    setSettingsPicker()
    {
        const overlay = document.createElement('div')
        overlay.className = 'settings-picker'
        overlay.hidden = true
        overlay.setAttribute('aria-hidden', 'true')

        const panel = document.createElement('section')
        panel.className = 'settings-picker__panel'
        panel.setAttribute('role', 'dialog')
        panel.setAttribute('aria-modal', 'true')
        panel.setAttribute('aria-labelledby', 'settings-picker-title')

        const eyebrow = document.createElement('div')
        eyebrow.className = 'settings-picker__eyebrow'
        eyebrow.textContent = '4X4 COUKOO SETTINGS'

        const title = document.createElement('h2')
        title.className = 'settings-picker__title'
        title.id = 'settings-picker-title'

        const description = document.createElement('p')
        description.className = 'settings-picker__description'

        const options = document.createElement('div')
        options.className = 'settings-picker__options'
        options.setAttribute('role', 'listbox')

        const actions = document.createElement('div')
        actions.className = 'settings-picker__actions'

        const cancel = document.createElement('button')
        cancel.className = 'button settings-picker__cancel'
        cancel.type = 'button'
        cancel.textContent = 'Cancel'

        const confirm = document.createElement('button')
        confirm.className = 'button settings-picker__confirm'
        confirm.type = 'button'

        actions.append(cancel, confirm)
        panel.append(eyebrow, title, description, options, actions)
        overlay.append(panel)
        this.game.domElement.append(overlay)

        this.settingsPicker = {
            overlay,
            title,
            description,
            options,
            cancel,
            confirm,
            selected: null,
            current: null,
            previousFocus: null,
        }

        cancel.addEventListener('click', () => this.closeSettingsPicker())
        overlay.addEventListener('click', (event) =>
        {
            if(event.target === overlay)
                this.closeSettingsPicker()
        })
        confirm.addEventListener('click', () =>
        {
            const picker = this.settingsPicker
            const current = picker.current
            if(!current || picker.selected === null)
                return

            const selected = picker.selected
            this.closeSettingsPicker()
            current.onConfirm?.(selected)
        })
    }

    openSettingsPicker(configuration)
    {
        const picker = this.settingsPicker
        if(!picker)
            return

        picker.current = configuration
        picker.selected = configuration.value
        picker.previousFocus = document.activeElement
        picker.title.textContent = configuration.title
        picker.description.textContent = configuration.description
        picker.confirm.textContent = configuration.confirmLabel || 'Confirm'
        picker.options.replaceChildren()

        const render = () =>
        {
            for(const button of picker.options.querySelectorAll('button'))
            {
                const active = button.dataset.value === String(picker.selected)
                button.classList.toggle('is-selected', active)
                button.setAttribute('aria-selected', active ? 'true' : 'false')
            }
        }

        for(const option of configuration.options)
        {
            const button = document.createElement('button')
            button.className = 'settings-picker__option'
            button.type = 'button'
            button.dataset.value = String(option.value)
            button.setAttribute('role', 'option')

            const optionTitle = document.createElement('strong')
            optionTitle.textContent = option.title
            const optionDescription = document.createElement('span')
            optionDescription.textContent = option.description
            button.append(optionTitle, optionDescription)

            button.addEventListener('click', () =>
            {
                picker.selected = option.value
                render()
            })
            picker.options.append(button)
        }

        render()
        picker.overlay.hidden = false
        picker.overlay.setAttribute('aria-hidden', 'false')
        requestAnimationFrame(() => picker.overlay.classList.add('is-visible'))
        window.setTimeout(() => picker.options.querySelector('.is-selected, button')?.focus(), 40)
    }

    closeSettingsPicker()
    {
        const picker = this.settingsPicker
        if(!picker || picker.overlay.hidden)
            return

        picker.overlay.classList.remove('is-visible')
        picker.overlay.setAttribute('aria-hidden', 'true')
        window.setTimeout(() => { picker.overlay.hidden = true }, 180)
        picker.previousFocus?.focus?.()
    }

    setDeviceProfile()
    {
        const element = this.element.querySelector('.js-device-profile')
        if(!element)
            return

        const text = element.querySelector('span')
        const tooltip = element.querySelector('.tooltip')
        element.classList.remove('is-disabled')
        element.setAttribute('aria-label', 'Run display capability calibration')

        const update = () =>
        {
            const refresh = this.game.quality.device.refresh
            text.textContent = refresh?.state === 'measuring'
                ? 'Calibrating display…'
                : this.game.quality.getDeviceSummary()
            tooltip.textContent = `${this.game.quality.getDeviceDetails()} Tap to run a fresh clean display check; no old cadence result is reused.`
        }

        element.addEventListener('click', () =>
        {
            this.game.quality.startFrameRateProbe({ delay: 80, force: true })
            this.game.notifications?.show(
                '<div class="top"><div class="title">Display check</div></div><div class="bottom"><div class="description">Calibrating the browser cadence without 3D render load…</div></div>',
                'quality-assets',
                2
            )
        })

        this.game.quality.events.on('deviceChange', update)
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
