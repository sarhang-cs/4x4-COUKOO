import { Events } from './Events.js'
import { Game } from './Game.js'
import { clamp, lerp, remapClamp } from './utilities/maths.js'

const VISUAL_EFFECTS_MODES = new Set([ 'auto', 'on', 'off' ])

const toVisualEffectsMode = (value) => VISUAL_EFFECTS_MODES.has(value) ? value : 'auto'

export class VisualEffects
{
    constructor()
    {
        this.game = Game.getInstance()
        this.events = new Events()
        this.element = this.game.domElement.querySelector('.js-drive-vfx')
        this.archiveWeatherLayers = this.element
            ? [ ...this.element.querySelectorAll('.drive-vfx__rain, .drive-vfx__snow, .drive-vfx__storm') ]
            : []
        this.lastUpdate = -Infinity
        this.state = {
            night: 0,
            rain: 0,
            snow: 0,
            speed: 0,
            dust: 0,
            storm: 0,
        }

        this.applyMode()

        this.game.ticker.events.on('tick', () => this.update(), 996)
        this.game.quality.events.on('change', () =>
        {
            this.applyMode()
            this.update(true)
        })
        this.game.save.events.on('synced', () =>
        {
            this.applyMode()
            this.update(true)
        })
    }

    getMode()
    {
        return toVisualEffectsMode(this.game.save.get('settings.visualEffects', 'auto'))
    }

    getQualityFactor()
    {
        if(this.game.quality.level === this.game.quality.constructor.LEVELS.LOW)
            return 0.56
        if(this.game.quality.level === this.game.quality.constructor.LEVELS.MEDIUM)
            return 0.78

        return 1
    }

    isEnabled()
    {
        const mode = this.getMode()
        if(mode === 'on')
            return true
        if(mode === 'off')
            return false

        // Auto preserves the lightest possible frame budget on Low.
        return this.game.quality.level !== this.game.quality.constructor.LEVELS.LOW
    }

    getLabel()
    {
        const mode = this.getMode()
        if(mode === 'on')
            return 'On'
        if(mode === 'off')
            return 'Off'

        return this.isEnabled() ? 'Auto (On)' : 'Auto (Off)'
    }

    setMode(mode = 'auto')
    {
        const nextMode = toVisualEffectsMode(mode)
        if(nextMode === this.getMode())
            return

        this.game.save.set('settings.visualEffects', nextMode, { immediate: true })
        this.applyMode()
        this.update(true)
        this.events.trigger('change', [ nextMode, this.isEnabled() ])
    }

    cycleMode()
    {
        const modes = [ 'auto', 'on', 'off' ]
        const index = modes.indexOf(this.getMode())
        this.setMode(modes[(index + 1) % modes.length])
    }

    applyMode()
    {
        const enabled = this.isEnabled()
        document.documentElement.classList.toggle('is-visual-effects-disabled', !enabled)

        if(!this.element)
            return

        this.element.hidden = !enabled
        this.element.dataset.mode = this.getMode()
        this.element.dataset.weatherSource = 'archive-world'
        this.element.setAttribute('aria-hidden', 'true')

        // Rain, snow and lightning are rendered by the original archive world
        // objects (RainLines, Snow and Lightnings). Hide the later CSS overlay
        // so it can never create a second, screen-space rain layer.
        for(const layer of this.archiveWeatherLayers)
            layer.hidden = true
    }

    getNightStrength()
    {
        const progress = this.game.dayCycles?.progress ?? 0
        const fadeIn = remapClamp(progress, 0.17, 0.36, 0, 1)
        const fadeOut = remapClamp(progress, 0.61, 0.83, 1, 0)
        return Math.min(fadeIn, fadeOut)
    }

    update(force = false)
    {
        if(!this.element || !this.isEnabled())
            return

        const elapsed = this.game.ticker.elapsed ?? 0
        if(!force && elapsed - this.lastUpdate < 1 / 24)
            return
        this.lastUpdate = elapsed

        const quality = this.getQualityFactor()
        // game.weather remains intentionally owned by the original 3D archive
        // classes (RainLines, Snow and Lightnings), not this CSS helper.
        const speed = remapClamp(this.game.physicalVehicle?.xzSpeed ?? 0, 8, 30, 0, 1)
        const boosting = this.game.player?.boosting ? 1 : 0
        const delta = Math.max(0.001, this.game.ticker.delta ?? 1 / 60)
        const smooth = Math.min(1, delta * 4.5)

        const targets = {
            night: this.getNightStrength() * quality,
            // Archive-weather only: 3D rain/snow/lightning come directly from
            // the original world classes, not from CSS screen overlays.
            rain: 0,
            snow: 0,
            speed: speed * (boosting ? 0.62 : 0.17) * quality,
            dust: speed * 0.34 * quality,
            storm: 0,
        }

        for(const [ key, target ] of Object.entries(targets))
            this.state[key] = lerp(this.state[key], target, smooth)

        this.setCssVariable('night', this.state.night)
        this.setCssVariable('rain', this.state.rain)
        this.setCssVariable('snow', this.state.snow)
        this.setCssVariable('speed', this.state.speed)
        this.setCssVariable('dust', this.state.dust)
        this.setCssVariable('storm', this.state.storm)
        this.element.classList.toggle('is-storm-active', this.state.storm > 0.015)
    }

    setCssVariable(name, value)
    {
        this.element.style.setProperty(`--drive-vfx-${name}`, clamp(value, 0, 1).toFixed(3))
    }
}
