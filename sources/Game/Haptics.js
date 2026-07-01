import { Game } from './Game.js'

export class Haptics
{
    constructor()
    {
        this.game = Game.getInstance()
        this.enabled = Boolean(this.game.save.get('settings.vibration', true))
        this.lastPulseAt = -Infinity
        this.minimumInterval = 140
    }

    get supported()
    {
        return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'
    }

    setEnabled(enabled, { preview = false } = {})
    {
        this.enabled = Boolean(enabled)
        this.game.save.set('settings.vibration', this.enabled, { immediate: true })

        if(this.enabled && preview)
            this.pulse(18, { force: true })
    }

    pulse(pattern = 12, { force = false } = {})
    {
        if(!this.enabled || !this.supported || document.visibilityState === 'hidden')
            return false

        const timestamp = performance.now()
        if(!force && timestamp - this.lastPulseAt < this.minimumInterval)
            return false

        this.lastPulseAt = timestamp

        try
        {
            return navigator.vibrate(pattern)
        }
        catch(error)
        {
            return false
        }
    }

    impact(force = 0)
    {
        if(force < 4)
            return false

        const duration = Math.max(12, Math.min(42, Math.round(force * 1.4)))
        return this.pulse(duration)
    }
}
