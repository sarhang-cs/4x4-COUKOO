import { Events } from './Events.js'
import { Game } from './Game.js'

const STORAGE_KEY = '4x4-coukoo-quality'

export class Quality
{
    constructor()
    {
        this.game = Game.getInstance()
        this.events = new Events()
        this.device = this.getDeviceProfile()
        this.level = this.getInitialLevel()

        if(this.game.debug.active)
        {
            const debugPanel = this.game.debug.panel.addFolder({ title: '⚙️ Quality', expanded: false })
            this.game.debug.addButtons(debugPanel, {
                low: () => this.changeLevel(1),
                high: () => this.changeLevel(0),
            }, 'change')
        }
    }

    getDeviceProfile()
    {
        const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
        const memory = Number(navigator.deviceMemory ?? 4)
        const cores = Number(navigator.hardwareConcurrency ?? 4)

        return { isMobile, memory, cores, isConstrained: isMobile || memory <= 4 || cores <= 4 }
    }

    getInitialLevel()
    {
        try
        {
            const savedLevel = Number.parseInt(localStorage.getItem(STORAGE_KEY), 10)
            if(savedLevel === 0 || savedLevel === 1)
                return savedLevel
        }
        catch(error) {}

        return this.device.isConstrained ? 1 : 0
    }

    getProfile(level = this.level)
    {
        const high = level === 0
        const mobile = this.device.isMobile
        const constrained = this.device.isConstrained

        return {
            level,
            name: high ? 'High' : 'Low',
            pixelRatioLimit: high ? (mobile ? (constrained ? 1.25 : 1.45) : 2) : (mobile ? 0.9 : 1.2),
            bloomMips: high ? (mobile ? 4 : 5) : (mobile ? 2 : 3),
            bloomStrength: high ? 0.32 : 0.18,
            bloomThreshold: high ? 0.9 : 1.05,
            bloomSmoothWidth: high ? 0.9 : 0.68,
            depthOfField: high,
            shadowMapSize: high ? (mobile ? 1024 : 2048) : (mobile ? 512 : 1024),
            shadowRadius: high ? (mobile ? 2.4 : 3) : 1.65,
        }
    }

    changeLevel(level = 0)
    {
        const nextLevel = level === 1 ? 1 : 0
        if(nextLevel === this.level)
            return

        this.level = nextLevel
        try { localStorage.setItem(STORAGE_KEY, String(this.level)) } catch(error) {}
        this.events.trigger('change', [ this.level, this.getProfile() ])
    }
}
