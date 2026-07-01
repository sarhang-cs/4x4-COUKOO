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
        this.element.setAttribute('aria-hidden', 'true')
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
        const rain = clamp(this.game.weather?.rain?.value ?? 0, 0, 1)
        const snow = clamp(this.game.weather?.snow?.value ?? 0, 0, 1)
        const electricField = clamp(this.game.weather?.electricField?.value ?? 0, -1, 1)
        const speed = remapClamp(this.game.physicalVehicle?.xzSpeed ?? 0, 8, 30, 0, 1)
        const boosting = this.game.player?.boosting ? 1 : 0
        const delta = Math.max(0.001, this.game.ticker.delta ?? 1 / 60)
        const smooth = Math.min(1, delta * 4.5)

        const targets = {
            night: this.getNightStrength() * quality,
            rain: rain * (0.42 + speed * 0.34) * quality,
            snow: snow * 0.33 * quality,
            speed: speed * (boosting ? 0.62 : 0.17) * quality,
            dust: speed * (1 - rain * 0.9) * (1 - snow * 0.75) * 0.34 * quality,
            storm: rain * remapClamp(electricField, 0.2, 1, 0, 1) * 0.18 * quality,
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
