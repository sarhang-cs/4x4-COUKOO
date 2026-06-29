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

    getGpuProfile()
    {
        const fallback = {
            renderer: '',
            vendor: '',
            maxTextureSize: 4096,
            maxSamples: 0,
            dedicatedHint: false,
        }

        try
        {
            const canvas = document.createElement('canvas')
            const context = canvas.getContext('webgl2', { powerPreference: 'high-performance' }) || canvas.getContext('webgl', { powerPreference: 'high-performance' })

            if(!context)
                return fallback

            const debugInfo = context.getExtension('WEBGL_debug_renderer_info')
            const vendor = debugInfo ? context.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : ''
            const renderer = debugInfo ? context.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : ''
            const gpuName = `${vendor} ${renderer}`.toLowerCase()

            return {
                renderer,
                vendor,
                maxTextureSize: Number(context.getParameter(context.MAX_TEXTURE_SIZE) ?? fallback.maxTextureSize),
                maxSamples: context.MAX_SAMPLES ? Number(context.getParameter(context.MAX_SAMPLES)) : 0,
                dedicatedHint: /(nvidia|geforce|radeon|rx\s?[5-9]|intel\s+arc|apple\s+m[1-9]|adreno\s?[7-9]|mali\s?g[7-9])/i.test(gpuName),
            }
        }
        catch(error)
        {
            return fallback
        }
    }

    getDeviceProfile()
    {
        const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
        const memory = Number(navigator.deviceMemory ?? 4)
        const cores = Number(navigator.hardwareConcurrency ?? 4)
        const gpu = this.getGpuProfile()
        const screenPixels = Math.max(1, (window.screen?.width ?? 1920) * (window.screen?.height ?? 1080))
        const desktop = !isMobile
        const premiumDesktop = desktop && memory >= 8 && cores >= 6 && gpu.maxTextureSize >= 8192
        const ultraDesktop = premiumDesktop && memory >= 12 && cores >= 8 && (gpu.dedicatedHint || gpu.maxTextureSize >= 16384)

        return {
            isMobile,
            desktop,
            memory,
            cores,
            gpu,
            screenPixels,
            tier: ultraDesktop ? 'ultra' : premiumDesktop ? 'high' : 'balanced',
            isConstrained: isMobile || memory <= 4 || cores <= 4 || gpu.maxTextureSize <= 4096,
        }
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
        const { isMobile, tier, screenPixels } = this.device

        if(!high)
        {
            return {
                level,
                name: 'Low',
                pixelRatioLimit: isMobile ? 0.9 : 1.2,
                pixelRatioFloor: 0.75,
                bloomMips: isMobile ? 2 : 3,
                bloomStrength: 0.18,
                bloomThreshold: 1.05,
                bloomSmoothWidth: 0.68,
                bloomRadius: 0.45,
                depthOfField: false,
                dofRepeats: 12,
                dofAmount: 0.0018,
                dofStart: 0.24,
                dofEnd: 0.52,
                shadowMapSize: isMobile ? 512 : 1024,
                shadowRadius: 1.65,
                textureAnisotropy: isMobile ? 2 : 4,
            }
        }

        if(isMobile)
        {
            return {
                level,
                name: 'High',
                pixelRatioLimit: this.device.isConstrained ? 1.25 : 1.45,
                pixelRatioFloor: 1,
                bloomMips: 4,
                bloomStrength: 0.32,
                bloomThreshold: 0.9,
                bloomSmoothWidth: 0.9,
                bloomRadius: 0.62,
                depthOfField: true,
                dofRepeats: 22,
                dofAmount: 0.0028,
                dofStart: 0.2,
                dofEnd: 0.5,
                shadowMapSize: 1024,
                shadowRadius: 2.4,
                textureAnisotropy: 4,
            }
        }

        if(tier === 'ultra')
        {
            return {
                level,
                name: 'High',
                pixelRatioLimit: 2.5,
                pixelRatioFloor: screenPixels <= 3200000 ? 1.4 : 1.12,
                bloomMips: 6,
                bloomStrength: 0.46,
                bloomThreshold: 0.76,
                bloomSmoothWidth: 0.98,
                bloomRadius: 0.78,
                depthOfField: true,
                dofRepeats: 42,
                dofAmount: 0.0045,
                dofStart: 0.18,
                dofEnd: 0.52,
                shadowMapSize: 4096,
                shadowRadius: 4.2,
                textureAnisotropy: 16,
            }
        }

        if(tier === 'high')
        {
            return {
                level,
                name: 'High',
                pixelRatioLimit: 2.25,
                pixelRatioFloor: screenPixels <= 3200000 ? 1.22 : 1,
                bloomMips: 5,
                bloomStrength: 0.4,
                bloomThreshold: 0.82,
                bloomSmoothWidth: 0.94,
                bloomRadius: 0.7,
                depthOfField: true,
                dofRepeats: 34,
                dofAmount: 0.0038,
                dofStart: 0.19,
                dofEnd: 0.51,
                shadowMapSize: 2048,
                shadowRadius: 3.4,
                textureAnisotropy: 12,
            }
        }

        return {
            level,
            name: 'High',
            pixelRatioLimit: 2,
            pixelRatioFloor: 1,
            bloomMips: 5,
            bloomStrength: 0.34,
            bloomThreshold: 0.88,
            bloomSmoothWidth: 0.9,
            bloomRadius: 0.64,
            depthOfField: true,
            dofRepeats: 28,
            dofAmount: 0.0032,
            dofStart: 0.2,
            dofEnd: 0.5,
            shadowMapSize: 2048,
            shadowRadius: 3,
            textureAnisotropy: 8,
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
