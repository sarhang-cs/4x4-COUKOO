import { Events } from './Events.js'
import { Game } from './Game.js'

const STORAGE_KEY = '4x4-coukoo-quality'

const clamp = (value, min, max) => Math.max(min, Math.min(value, max))

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
            maxRenderbufferSize: 4096,
            maxSamples: 0,
            isWebGL2: false,
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
                maxRenderbufferSize: Number(context.getParameter(context.MAX_RENDERBUFFER_SIZE) ?? fallback.maxRenderbufferSize),
                maxSamples: context.MAX_SAMPLES ? Number(context.getParameter(context.MAX_SAMPLES)) : 0,
                isWebGL2: typeof WebGL2RenderingContext !== 'undefined' && context instanceof WebGL2RenderingContext,
                dedicatedHint: /(nvidia|geforce|quadro|radeon|rx\s?[5-9]|intel\s+arc|apple\s+m[1-9]|adreno\s?[7-9]|mali\s?g[7-9])/i.test(gpuName),
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
        const premiumDesktop = desktop && memory >= 8 && cores >= 6 && gpu.maxTextureSize >= 8192 && gpu.maxRenderbufferSize >= 8192
        const ultraDesktop = premiumDesktop && memory >= 12 && cores >= 8 && gpu.maxTextureSize >= 16384 && (gpu.dedicatedHint || gpu.maxSamples >= 4)

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
        const { isMobile, tier } = this.device

        if(!high)
        {
            return {
                level,
                name: 'Low',
                pixelRatioLimit: isMobile ? 0.9 : 1.2,
                pixelRatioFloor: 0.75,
                renderScaleInitial: 1,
                renderScaleMin: 0.85,
                renderScaleMax: 1,
                maxRenderPixels: isMobile ? 1500000 : 2600000,
                adaptiveResolution: false,
                targetFrameTime: isMobile ? 22 : 20,
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
                toneMappingExposure: 1,
            }
        }

        if(isMobile)
        {
            return {
                level,
                name: 'High',
                pixelRatioLimit: this.device.isConstrained ? 1.25 : 1.45,
                pixelRatioFloor: 1,
                renderScaleInitial: 1,
                renderScaleMin: 0.9,
                renderScaleMax: 1,
                maxRenderPixels: this.device.isConstrained ? 2200000 : 3000000,
                adaptiveResolution: false,
                targetFrameTime: 20,
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
                toneMappingExposure: 1.02,
            }
        }

        if(tier === 'ultra')
        {
            return {
                level,
                name: 'High',
                pixelRatioLimit: 3,
                pixelRatioFloor: 1.2,
                renderScaleInitial: 1.45,
                renderScaleMin: 1.1,
                renderScaleMax: 1.75,
                maxRenderPixels: 14000000,
                adaptiveResolution: true,
                targetFrameTime: 16.7,
                bloomMips: 7,
                bloomStrength: 0.58,
                bloomThreshold: 0.68,
                bloomSmoothWidth: 1,
                bloomRadius: 0.82,
                depthOfField: true,
                dofRepeats: 52,
                dofAmount: 0.0048,
                dofStart: 0.17,
                dofEnd: 0.54,
                shadowMapSize: 4096,
                shadowRadius: 4.8,
                textureAnisotropy: 16,
                toneMappingExposure: 1.16,
            }
        }

        if(tier === 'high')
        {
            return {
                level,
                name: 'High',
                pixelRatioLimit: 2.75,
                pixelRatioFloor: 1.1,
                renderScaleInitial: 1.28,
                renderScaleMin: 1,
                renderScaleMax: 1.55,
                maxRenderPixels: 9500000,
                adaptiveResolution: true,
                targetFrameTime: 16.7,
                bloomMips: 6,
                bloomStrength: 0.48,
                bloomThreshold: 0.74,
                bloomSmoothWidth: 0.98,
                bloomRadius: 0.76,
                depthOfField: true,
                dofRepeats: 42,
                dofAmount: 0.0042,
                dofStart: 0.18,
                dofEnd: 0.53,
                shadowMapSize: 4096,
                shadowRadius: 4.1,
                textureAnisotropy: 16,
                toneMappingExposure: 1.1,
            }
        }

        return {
            level,
            name: 'High',
            pixelRatioLimit: 2.25,
            pixelRatioFloor: 1,
            renderScaleInitial: 1.12,
            renderScaleMin: 0.9,
            renderScaleMax: 1.35,
            maxRenderPixels: 6200000,
            adaptiveResolution: true,
            targetFrameTime: 18,
            bloomMips: 5,
            bloomStrength: 0.4,
            bloomThreshold: 0.8,
            bloomSmoothWidth: 0.94,
            bloomRadius: 0.7,
            depthOfField: true,
            dofRepeats: 34,
            dofAmount: 0.0037,
            dofStart: 0.19,
            dofEnd: 0.52,
            shadowMapSize: 2048,
            shadowRadius: 3.5,
            textureAnisotropy: 12,
            toneMappingExposure: 1.06,
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
