import { Events } from './Events.js'
import { Game } from './Game.js'

// Legacy migration marker retained for existing project verification and save migrations.
const STORAGE_KEY = '4x4-coukoo-quality'

// Legacy binary settings used 0 = High and 1 = Low. Keep those values stable
// and add 2 = Medium so older saves preserve their original performance choice.
const QUALITY_LEVELS = Object.freeze({
    HIGH: 0,
    LOW: 1,
    MEDIUM: 2,
})

const VALID_LEVELS = new Set(Object.values(QUALITY_LEVELS))
const VALID_SHADOW_MODES = new Set([ 'auto', 'on', 'off' ])
const VALID_FPS_LIMITS = new Set([ 0, 30, 60 ])

export class Quality
{
    static LEVELS = QUALITY_LEVELS

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
                low: () => this.changeLevel(QUALITY_LEVELS.LOW),
                medium: () => this.changeLevel(QUALITY_LEVELS.MEDIUM),
                high: () => this.changeLevel(QUALITY_LEVELS.HIGH),
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
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
        const effectiveType = connection?.effectiveType ?? ''
        const saveData = Boolean(connection?.saveData)
        const slowConnection = saveData || /(^|-)2g|slow-2g/i.test(effectiveType)
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
            connection: { effectiveType, saveData, slowConnection },
            gpu,
            screenPixels,
            tier: ultraDesktop ? 'ultra' : premiumDesktop ? 'high' : 'balanced',
            isConstrained: isMobile || memory <= 4 || cores <= 4 || gpu.maxTextureSize <= 4096 || slowConnection,
        }
    }

    getInitialLevel()
    {
        const savedLevel = this.game.save.get('settings.quality', null)
        if(VALID_LEVELS.has(savedLevel))
            return savedLevel

        if(this.device.isConstrained)
            return QUALITY_LEVELS.LOW

        return this.device.isMobile ? QUALITY_LEVELS.MEDIUM : QUALITY_LEVELS.HIGH
    }

    getLabel(level = this.level)
    {
        if(level === QUALITY_LEVELS.LOW)
            return 'Low'
        if(level === QUALITY_LEVELS.MEDIUM)
            return 'Medium'
        return 'High'
    }

    getAssetProfile(level = this.level)
    {
        if(level === QUALITY_LEVELS.HIGH)
        {
            return {
                level,
                id: 'high-full',
                label: 'Full archive',
                musicFormat: 'wav',
                musicPath: 'sounds/musics/high',
                modelSuffix: '',
                textureLoader: 'texture',
                textureExtension: 'png',
                compressedAssets: false,
                description: 'Full archive quality: lossless music, maximum renderer profile, and all season, weather, animation, particle, and world effects.',
            }
        }

        if(level === QUALITY_LEVELS.MEDIUM)
        {
            return {
                level,
                id: 'medium-original',
                label: 'Original balanced',
                musicFormat: 'mp3',
                musicPath: 'sounds/musics',
                modelSuffix: '',
                textureLoader: 'texture',
                textureExtension: 'png',
                compressedAssets: false,
                description: 'Original balanced archive: complete driving world with compressed music and a balanced renderer profile.',
            }
        }

        return {
            level,
            id: 'low-phase10',
            label: 'Phase 10 optimized',
            musicFormat: 'mp3',
            musicPath: 'sounds/musics',
            modelSuffix: '-compressed',
            textureLoader: 'textureKtx',
            textureExtension: 'ktx',
            compressedAssets: true,
            description: 'Phase 10 optimized: the lightweight mobile profile with the same gameplay, save, missions, weather, season, and accessibility systems.',
        }
    }

    getPresetDescription(level = this.level)
    {
        return this.getAssetProfile(level).description
    }

    getNextLevel()
    {
        const order = [ QUALITY_LEVELS.HIGH, QUALITY_LEVELS.MEDIUM, QUALITY_LEVELS.LOW ]
        const currentIndex = order.indexOf(this.level)
        return order[(currentIndex + 1) % order.length]
    }

    getShadowMode()
    {
        const saved = this.game.save.get('settings.shadows', 'auto')
        return VALID_SHADOW_MODES.has(saved) ? saved : 'auto'
    }

    getShadowsEnabled(level = this.level)
    {
        const mode = this.getShadowMode()
        if(mode === 'on')
            return true
        if(mode === 'off')
            return false

        return Boolean(this.getProfile(level).shadowsEnabled)
    }

    getFpsLimit()
    {
        const saved = Number(this.game.save.get('settings.fpsLimit', 0))
        return VALID_FPS_LIMITS.has(saved) ? saved : 0
    }

    getProfile(level = this.level)
    {
        const { isMobile, tier, isConstrained } = this.device

        if(level === QUALITY_LEVELS.LOW)
        {
            return {
                level,
                name: 'Low',
                pixelRatioLimit: isMobile ? 0.9 : 1.1,
                pixelRatioFloor: isMobile ? 0.55 : 0.65,
                renderScaleInitial: 0.92,
                renderScaleMin: isMobile ? 0.62 : 0.7,
                renderScaleMax: 1,
                maxRenderPixels: isMobile ? 1000000 : 2200000,
                adaptiveResolution: true,
                targetFrameTime: isMobile ? 26 : 23,
                bloomMips: 1,
                bloomStrength: 0.08,
                bloomThreshold: 1.15,
                bloomSmoothWidth: 0.55,
                bloomRadius: 0.32,
                depthOfField: false,
                dofRepeats: 8,
                dofAmount: 0.001,
                dofStart: 0.24,
                dofEnd: 0.52,
                shadowMapSize: 512,
                shadowRadius: 1.2,
                shadowsEnabled: false,
                textureAnisotropy: isMobile ? 1 : 2,
                toneMappingExposure: 1,
            }
        }

        if(level === QUALITY_LEVELS.MEDIUM)
        {
            return {
                level,
                name: 'Medium',
                pixelRatioLimit: isMobile ? (isConstrained ? 1 : 1.15) : 1.45,
                pixelRatioFloor: isMobile ? 0.62 : 0.82,
                renderScaleInitial: 1,
                renderScaleMin: isMobile ? 0.68 : 0.8,
                renderScaleMax: isMobile ? 1.05 : 1.2,
                maxRenderPixels: isMobile ? (isConstrained ? 1500000 : 2100000) : 4300000,
                adaptiveResolution: true,
                targetFrameTime: isMobile ? 22 : 19,
                bloomMips: isMobile ? 2 : 4,
                bloomStrength: isMobile ? 0.2 : 0.3,
                bloomThreshold: 0.98,
                bloomSmoothWidth: 0.76,
                bloomRadius: 0.52,
                depthOfField: false,
                dofRepeats: 18,
                dofAmount: 0.002,
                dofStart: 0.21,
                dofEnd: 0.51,
                shadowMapSize: isMobile ? 512 : 1024,
                shadowRadius: isMobile ? 1.8 : 2.6,
                shadowsEnabled: true,
                textureAnisotropy: isMobile ? 2 : 6,
                toneMappingExposure: 1.02,
            }
        }

        if(isMobile)
        {
            return {
                level,
                name: 'High',
                pixelRatioLimit: isConstrained ? 1.05 : 1.3,
                pixelRatioFloor: isConstrained ? 0.65 : 0.72,
                renderScaleInitial: 1,
                renderScaleMin: isConstrained ? 0.72 : 0.78,
                renderScaleMax: 1,
                maxRenderPixels: isConstrained ? 1800000 : 2600000,
                adaptiveResolution: true,
                targetFrameTime: isConstrained ? 23 : 20,
                bloomMips: isConstrained ? 2 : 3,
                bloomStrength: 0.28,
                bloomThreshold: 0.94,
                bloomSmoothWidth: 0.82,
                bloomRadius: 0.58,
                depthOfField: !isConstrained,
                dofRepeats: isConstrained ? 14 : 20,
                dofAmount: 0.0025,
                dofStart: 0.2,
                dofEnd: 0.5,
                shadowMapSize: isConstrained ? 512 : 1024,
                shadowRadius: 2.1,
                shadowsEnabled: true,
                textureAnisotropy: isConstrained ? 2 : 4,
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
                shadowsEnabled: true,
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
                shadowsEnabled: true,
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
            shadowsEnabled: true,
            textureAnisotropy: 12,
            toneMappingExposure: 1.06,
        }
    }

    changeLevel(level = QUALITY_LEVELS.HIGH)
    {
        const nextLevel = VALID_LEVELS.has(level) ? level : QUALITY_LEVELS.HIGH
        if(nextLevel === this.level)
            return

        const previousAssetProfile = this.getAssetProfile(this.level)
        this.level = nextLevel
        const assetProfile = this.getAssetProfile()
        const requiresWorldReload = previousAssetProfile.compressedAssets !== assetProfile.compressedAssets

        this.game.save.set('settings.quality', this.level, { immediate: true })
        this.events.trigger('change', [ this.level, this.getProfile(), { previousAssetProfile, assetProfile, requiresWorldReload } ])
    }

    setShadowMode(mode = 'auto')
    {
        const nextMode = VALID_SHADOW_MODES.has(mode) ? mode : 'auto'
        if(nextMode === this.getShadowMode())
            return

        this.game.save.set('settings.shadows', nextMode, { immediate: true })
        this.events.trigger('settingsChange', [ 'shadows', nextMode ])
    }

    cycleShadowMode()
    {
        const order = [ 'auto', 'on', 'off' ]
        const currentIndex = order.indexOf(this.getShadowMode())
        this.setShadowMode(order[(currentIndex + 1) % order.length])
    }

    setFpsLimit(limit = 0)
    {
        const nextLimit = VALID_FPS_LIMITS.has(Number(limit)) ? Number(limit) : 0
        if(nextLimit === this.getFpsLimit())
            return

        this.game.save.set('settings.fpsLimit', nextLimit, { immediate: true })
        this.events.trigger('settingsChange', [ 'fpsLimit', nextLimit ])
    }

    cycleFpsLimit()
    {
        const order = [ 0, 60, 30 ]
        const currentIndex = order.indexOf(this.getFpsLimit())
        this.setFpsLimit(order[(currentIndex + 1) % order.length])
    }
}
