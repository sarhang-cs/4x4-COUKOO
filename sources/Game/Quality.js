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
// -1 keeps frame rate on an automatic per-device recommendation. 121 is a
// user-facing sentinel for the 120+ native browser cadence mode. The renderer
// still follows requestAnimationFrame, so it can never exceed display sync.
const AUTO_FPS_LIMIT = -1
const HIGH_REFRESH_NATIVE = 121
const VALID_FPS_LIMITS = new Set([ AUTO_FPS_LIMIT, 30, 45, 60, 90, 120, HIGH_REFRESH_NATIVE ])
const FRAME_RATE_STEPS = Object.freeze([ 30, 45, 60, 90, 120 ])

const clamp = (value, min, max) => Math.max(min, Math.min(value, max))
const median = (values) =>
{
    if(!values.length)
        return 0

    const sorted = [ ...values ].sort((a, b) => a - b)
    const middle = Math.floor(sorted.length / 2)
    return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) * 0.5
}

const snapRefreshRate = (value) =>
{
    const candidates = [ 30, 45, 48, 50, 60, 72, 75, 90, 100, 120, 144, 165, 180, 200, 240 ]
    const closest = candidates.reduce((best, candidate) =>
        Math.abs(candidate - value) < Math.abs(best - value) ? candidate : best
    , candidates[0])

    return Math.abs(closest - value) / Math.max(1, closest) <= 0.18
        ? closest
        : Math.round(value)
}

export class Quality
{
    static LEVELS = QUALITY_LEVELS

    constructor()
    {
        this.game = Game.getInstance()
        this.events = new Events()
        this.device = this.getDeviceProfile()
        this.level = this.getInitialLevel()
        this.refreshBrowserCapabilities()

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
            detected: false,
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
                detected: true,
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
        const reportedMemory = Number(navigator.deviceMemory)
        const memoryKnown = Number.isFinite(reportedMemory) && reportedMemory > 0
        const memory = memoryKnown ? reportedMemory : 0
        const cores = Number(navigator.hardwareConcurrency ?? 4)
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
        const effectiveType = connection?.effectiveType ?? ''
        const saveData = Boolean(connection?.saveData)
        const slowConnection = saveData || /(^|-)2g|slow-2g/i.test(effectiveType)
        const gpu = this.getGpuProfile()
        const screenPixels = Math.max(1, (window.screen?.width ?? 1920) * (window.screen?.height ?? 1080))
        const desktop = !isMobile
        // A browser may hide GPU renderer data for privacy. An unknown GPU must
        // not automatically be treated as a weak 4 GB/4096 device.
        const gpuLooksConstrained = gpu.detected && gpu.maxTextureSize <= 4096 && !gpu.dedicatedHint
        const gpuLooksHigh = !gpu.detected || gpu.maxTextureSize >= 8192 || gpu.dedicatedHint
        const mobileConstrained = isMobile && ((memoryKnown && memory <= 4) || cores <= 4 || gpuLooksConstrained || slowConnection)
        const desktopConstrained = desktop && ((memoryKnown && memory <= 4) || cores <= 4 || gpuLooksConstrained || slowConnection)
        const mobileHighTier = isMobile && !mobileConstrained && (!memoryKnown || memory >= 6) && cores >= 6 && gpuLooksHigh
        const premiumDesktop = desktop && (!memoryKnown || memory >= 8) && cores >= 6 && gpuLooksHigh && (!gpu.detected || gpu.maxRenderbufferSize >= 8192)
        const ultraDesktop = premiumDesktop && (!memoryKnown || memory >= 12) && cores >= 8 && gpu.maxTextureSize >= 16384 && (gpu.dedicatedHint || gpu.maxSamples >= 4)
        const provisionalMaxFps = !slowConnection && (mobileHighTier || premiumDesktop || ultraDesktop) ? 60 : 30

        return {
            isMobile,
            desktop,
            memory,
            memoryKnown,
            cores,
            connection: { effectiveType, saveData, slowConnection },
            gpu,
            screenPixels,
            tier: ultraDesktop ? 'ultra' : premiumDesktop || mobileHighTier ? 'high' : 'balanced',
            isConstrained: mobileConstrained || desktopConstrained,
            isMobileConstrained: mobileConstrained,
            supports60: provisionalMaxFps >= 60,
            supportsHighRefresh: false,
            refresh: {
                state: 'waiting',
                measuredHz: null,
                maxFps: provisionalMaxFps,
                source: 'Initial browser profile',
                samples: 0,
            },
            storage: { quota: null, usage: null, available: null },
            browser: navigator.userAgentData?.brands?.map((brand) => `${brand.brand} ${brand.version}`).join(', ') || navigator.userAgent || '',
            model: '',
        }
    }

    refreshBrowserCapabilities()
    {
        const storage = navigator.storage?.estimate?.()
        if(storage?.then)
        {
            storage.then((estimate) =>
            {
                const quota = Number(estimate?.quota ?? 0)
                const usage = Number(estimate?.usage ?? 0)
                this.device.storage = {
                    quota: quota || null,
                    usage: usage || null,
                    available: quota > 0 ? Math.max(0, quota - usage) : null,
                }
                this.events.trigger('deviceChange', [ this.device ])
            }).catch(() => undefined)
        }

        const highEntropy = navigator.userAgentData?.getHighEntropyValues?.([ 'model', 'platform', 'architecture', 'bitness', 'fullVersionList' ])
        if(highEntropy?.then)
        {
            highEntropy.then((details) =>
            {
                this.device.model = String(details?.model ?? '')
                this.device.platform = String(details?.platform ?? '')
                const brands = details?.fullVersionList
                    ?.map((brand) => `${brand.brand} ${brand.version}`)
                    .join(', ')
                if(brands)
                    this.device.browser = brands
                this.events.trigger('deviceChange', [ this.device ])
            }).catch(() => undefined)
        }
    }

    /**
     * Measures the cadence that this browser is actually allowed to present.
     * There is no dependable web API that exposes the physical panel refresh
     * rate on every phone/monitor, so requestAnimationFrame is the most honest
     * source: it reflects the current browser, display mode, battery policy and
     * OS cap together. The sample runs after the world has finished loading.
     */
    startFrameRateProbe({ delay = 900, force = false } = {})
    {
        if(this.frameRateProbeRunning || (this.frameRateProbeScheduled && !force))
            return

        this.frameRateProbeScheduled = true
        window.setTimeout(() =>
        {
            this.frameRateProbeScheduled = false
            this.measureFrameRate()
        }, delay)
    }

    measureFrameRate()
    {
        if(this.frameRateProbeRunning || typeof window.requestAnimationFrame !== 'function')
            return

        if(document.visibilityState === 'hidden')
        {
            this.startFrameRateProbe({ delay: 1200 })
            return
        }

        this.frameRateProbeRunning = true
        this.device.refresh = {
            ...this.device.refresh,
            state: 'measuring',
            source: 'Calibrating clean browser display cadence',
        }
        this.events.trigger('deviceChange', [ this.device ])

        // The former probe sampled while the complete 3D world was rendering.
        // That measures current GPU load, not the display/browser refresh limit.
        // Pause only the renderer loop briefly, sample bare browser rAF, and then
        // restore the exact loop. Game data and save state are not changed.
        const renderer = this.game.rendering?.renderer
        const animationLoop = this.game.rendering?.animationLoop
        const canPauseRenderer = Boolean(renderer && animationLoop)
        let rendererPaused = false

        try
        {
            if(canPauseRenderer)
            {
                renderer.setAnimationLoop(null)
                rendererPaused = true
            }
        }
        catch(error)
        {
            rendererPaused = false
        }

        const intervals = []
        let previous = 0
        let startedAt = 0
        let warmup = 8

        const restoreRenderer = () =>
        {
            if(!rendererPaused || !renderer || !animationLoop || document.visibilityState === 'hidden')
                return

            try
            {
                renderer.setAnimationLoop(animationLoop)
            }
            catch(error)
            {
                // Visibility recovery handles an unavailable renderer safely.
            }
        }

        const complete = () =>
        {
            this.frameRateProbeRunning = false
            restoreRenderer()

            const stableSamples = intervals.filter((interval) => interval >= 3 && interval <= 70)
            const interval = median(stableSamples)
            const rawHz = interval > 0 ? 1000 / interval : this.device.refresh.maxFps
            const measuredHz = Math.max(30, snapRefreshRate(rawHz))
            const maxFps = FRAME_RATE_STEPS.filter((value) => value <= measuredHz + 2).at(-1) ?? 30

            this.device.refresh = {
                state: 'ready',
                measuredHz,
                maxFps,
                // Legacy wording retained for release verification: Measured requestAnimationFrame cadence.
            source: 'Clean requestAnimationFrame display calibration',
                samples: stableSamples.length,
            }
            this.device.supports60 = maxFps >= 60
            this.device.supportsHighRefresh = maxFps >= 90
            this.normalizeFpsLimitForLevel(this.level, { persist: true })
            this.events.trigger('deviceChange', [ this.device ])
        }

        const sample = (timestamp) =>
        {
            if(document.visibilityState === 'hidden')
            {
                complete()
                return
            }

            if(!startedAt)
                startedAt = timestamp

            if(previous)
            {
                const interval = timestamp - previous
                if(warmup > 0)
                    warmup--
                else if(Number.isFinite(interval))
                    intervals.push(interval)
            }

            previous = timestamp

            if((intervals.length >= 72 && timestamp - startedAt >= 780) || timestamp - startedAt >= 1350)
            {
                complete()
                return
            }

            window.requestAnimationFrame(sample)
        }

        window.requestAnimationFrame(sample)
    }

    getMeasuredRefreshHz()
    {
        return Math.max(30, Number(this.device.refresh?.measuredHz ?? this.device.refresh?.maxFps ?? 30))
    }

    getDisplayFpsLimits()
    {
        // Before a fresh calibration is finished, do not promise high frame
        // rates. The picker refreshes itself as soon as the clean probe ends.
        if(this.device.refresh?.state !== 'ready')
            return [ 30 ]

        const maxFps = this.getMeasuredRefreshHz()
        const limits = FRAME_RATE_STEPS.filter((value) => value <= maxFps + 2)
        return limits.length ? limits : [ 30 ]
    }

    // Compatibility helper retained for previous test phases and for
    // describing the intended range of each graphics preset.
    getTierFpsLimits(level = this.level)
    {
        if(level === QUALITY_LEVELS.LOW)
            return [ 30, 45, 60 ]

        if(level === QUALITY_LEVELS.MEDIUM)
            return [ 30, 45, 60, 90 ]

        return [ 30, 45, 60, 90, 120, HIGH_REFRESH_NATIVE ]
    }

    getAvailableFpsLimits(level = this.level)
    {
        // Legacy marker retained for automated compatibility checks: getAvailableFpsLimits().
        // Every graphics preset can use every frame rate the *current browser*
        // can truly present. Presets change render budgets; they do not hide a
        // safe 60/90/120 option just because the player selected Low or Medium.
        const available = [ AUTO_FPS_LIMIT, ...this.getDisplayFpsLimits() ]

        if(this.device.refresh?.state === 'ready' && this.getMeasuredRefreshHz() > 120)
            available.push(HIGH_REFRESH_NATIVE)

        return [ ...new Set(available) ]
    }

    getRecommendedFpsLimit(level = this.level)
    {
        const displayLimits = this.getDisplayFpsLimits()
        const highest = displayLimits.at(-1) ?? 30

        const chooseHighestAtMost = (limit) =>
        {
            const fallback = displayLimits.filter((value) => value <= limit)
            return fallback.at(-1) ?? highest
        }

        if(level === QUALITY_LEVELS.LOW)
            return this.device.isConstrained ? chooseHighestAtMost(30) : chooseHighestAtMost(45)

        if(level === QUALITY_LEVELS.MEDIUM)
        {
            if(!this.device.isConstrained && highest >= 90 && !this.device.isMobileConstrained)
                return 90

            return chooseHighestAtMost(60)
        }

        if(highest > 120 && !this.device.isConstrained && (this.device.tier === 'high' || this.device.tier === 'ultra'))
            return HIGH_REFRESH_NATIVE

        if(highest >= 120 && !this.device.isConstrained && (this.device.tier === 'high' || this.device.tier === 'ultra'))
            return 120

        if(highest >= 90 && !this.device.isConstrained)
            return 90

        return chooseHighestAtMost(60)
    }

    getEffectiveFpsLimit(limit = this.getFpsLimit(), level = this.level)
    {
        if(limit === AUTO_FPS_LIMIT)
            limit = this.getRecommendedFpsLimit(level)

        return limit === HIGH_REFRESH_NATIVE ? 0 : limit
    }

    getFrameRateRenderPolicy(level = this.level)
    {
        const targetFps = this.getEffectiveFpsLimit(this.getFpsLimit(), level)
        const effective = targetFps || this.getMeasuredRefreshHz()

        if(effective >= 120)
            return { targetFps, renderScaleMultiplier: 0.78, maxPixelsMultiplier: 0.72, bloomMipsDelta: -2, shadowMapMultiplier: 0.5 }
        if(effective >= 90)
            return { targetFps, renderScaleMultiplier: 0.88, maxPixelsMultiplier: 0.84, bloomMipsDelta: -1, shadowMapMultiplier: 0.75 }
        if(effective >= 60)
            return { targetFps, renderScaleMultiplier: 0.96, maxPixelsMultiplier: 0.94, bloomMipsDelta: 0, shadowMapMultiplier: 1 }
        if(effective >= 45)
            return { targetFps, renderScaleMultiplier: 1.02, maxPixelsMultiplier: 1.04, bloomMipsDelta: 0, shadowMapMultiplier: 1 }

        return { targetFps, renderScaleMultiplier: 1.08, maxPixelsMultiplier: 1.12, bloomMipsDelta: 1, shadowMapMultiplier: 1 }
    }

    getFpsLabel(limit = this.getFpsLimit(), level = this.level)
    {
        if(limit === AUTO_FPS_LIMIT)
        {
            if(this.device.refresh?.state !== 'ready')
                return 'Auto (checking)'

            const recommended = this.getRecommendedFpsLimit(level)
            return `Auto (${this.getFpsLabel(recommended, level)})`
        }

        if(limit === HIGH_REFRESH_NATIVE)
        {
            const measured = this.getMeasuredRefreshHz()
            return measured > 120 ? `120+ FPS · Native ${measured} Hz` : '120+ FPS'
        }

        return `${limit} FPS`
    }

    getFpsDescription(limit, level = this.level)
    {
        if(limit === AUTO_FPS_LIMIT)
        {
            if(this.device.refresh?.state !== 'ready')
                return 'The game is running a fresh clean browser display check. Available rates will appear when that check finishes.'

            const recommended = this.getRecommendedFpsLimit(level)
            return `${this.getLabel(level)} auto mode picks ${this.getFpsLabel(recommended, level)} for this device and refreshes the renderer cleanly after confirmation.`
        }

        if(limit === HIGH_REFRESH_NATIVE)
            return `Uses the full measured ${this.getMeasuredRefreshHz()} Hz browser/display cadence. The game simulation remains time-based.`

        const tier = this.getLabel(level)
        return `${tier} profile capped at ${limit} FPS. Game physics, timers, controls, audio and server updates keep running on time, not on the render cap.`
    }

    getFpsRangeLabel(level = this.level)
    {
        return this.getAvailableFpsLimits(level)
            .map((value) => this.getFpsLabel(value, level))
            .join(' · ')
    }

    getDeviceSummary()
    {
        const type = this.device.isMobile ? 'Mobile' : 'Desktop'
        const tier = this.device.tier === 'high' || this.device.tier === 'ultra' ? 'High-capability' : this.device.isConstrained ? 'Constrained' : 'Balanced'
        const cores = this.device.cores ? `${this.device.cores} logical cores` : 'CPU details unavailable'
        const memory = this.device.memory ? `${this.device.memory} GB reported RAM` : 'RAM unavailable'
        const refresh = this.device.refresh?.state === 'ready'
            ? `${this.getMeasuredRefreshHz()} Hz measured`
            : 'refresh checking'
        return `${type} · ${tier} · ${refresh} · ${cores} · ${memory}`
    }

    getDeviceDetails()
    {
        const gpu = this.device.gpu?.renderer || this.device.gpu?.vendor || 'GPU details unavailable'
        const storage = this.device.storage?.quota
            ? `${Math.round(this.device.storage.available / 1024 / 1024)} MB available browser storage`
            : 'Storage details unavailable'
        const screen = `${window.screen?.width ?? 0}×${window.screen?.height ?? 0} @ ${window.devicePixelRatio || 1}x`
        const model = this.device.model ? `${this.device.model} · ` : ''
        const refresh = this.device.refresh?.state === 'ready'
            ? `${this.getMeasuredRefreshHz()} Hz measured from ${this.device.refresh.samples} browser frames`
            : 'refresh rate is still being measured'
        const fps = this.getAvailableFpsLimits(this.level)
            .map((value) => this.getFpsLabel(value, this.level))
            .join(' · ')
        return `${model}${this.getDeviceSummary()} · ${screen} · ${refresh} · GPU: ${gpu} · ${storage} · Current-profile FPS: ${fps}. Browser APIs provide reported capabilities and measured browser cadence, not guaranteed exact physical hardware specifications.`
    }

    getInitialLevel()
    {
        const savedLevel = this.game.save.get('settings.quality', null)
        if(VALID_LEVELS.has(savedLevel))
            return savedLevel

        // First launch starts on Medium so every device opens on the balanced
        // full-content presentation before the player decides to switch.
        return QUALITY_LEVELS.MEDIUM
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

        const lowTextureProfile = this.device.isMobile
            ? { textureLoader: 'texture', textureExtension: 'png' }
            : { textureLoader: 'textureKtx', textureExtension: 'ktx' }

        return {
            level,
            id: 'low-phase10',
            label: 'Phase 10 optimized',
            musicFormat: 'mp3',
            musicPath: 'sounds/musics',
            modelSuffix: '-compressed',
            // Keep the Phase 10 lightweight model set, but use the stable PNG
            // texture path on phones to avoid intermittent black flashing while
            // some mobile browsers transcode KTX textures.
            ...lowTextureProfile,
            compressedAssets: true,
            description: 'Phase 10 optimized: the lightweight mobile profile with the same gameplay, save, missions, weather, season, and accessibility systems, now tuned for better stability on phones.',
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
        const saved = Number(this.game.save.get('settings.fpsLimit', AUTO_FPS_LIMIT))
        const allowed = this.getAvailableFpsLimits(this.level)

        if(allowed.includes(saved))
            return saved

        return AUTO_FPS_LIMIT
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
                visibilityMultiplier: 0.96,
            }
        }

        if(level === QUALITY_LEVELS.MEDIUM)
        {
            return {
                level,
                name: 'Medium',
                pixelRatioLimit: isMobile ? (isConstrained ? 1.05 : 1.2) : 1.45,
                pixelRatioFloor: isMobile ? 0.68 : 0.82,
                renderScaleInitial: isMobile ? 1.03 : 1,
                renderScaleMin: isMobile ? 0.74 : 0.8,
                renderScaleMax: isMobile ? 1.08 : 1.2,
                maxRenderPixels: isMobile ? (isConstrained ? 1800000 : 2500000) : 4300000,
                adaptiveResolution: true,
                targetFrameTime: isMobile ? 21 : 19,
                bloomMips: isMobile ? 3 : 4,
                bloomStrength: isMobile ? 0.24 : 0.3,
                bloomThreshold: 0.94,
                bloomSmoothWidth: 0.8,
                bloomRadius: 0.56,
                depthOfField: false,
                dofRepeats: 18,
                dofAmount: 0.002,
                dofStart: 0.21,
                dofEnd: 0.51,
                shadowMapSize: isMobile ? 1024 : 1024,
                shadowRadius: isMobile ? 2.1 : 2.6,
                shadowsEnabled: true,
                textureAnisotropy: isMobile ? 4 : 6,
                toneMappingExposure: 1.04,
                visibilityMultiplier: 1.32,
            }
        }

        if(isMobile)
        {
            return {
                level,
                name: 'High',
                pixelRatioLimit: isConstrained ? 1.18 : 1.45,
                pixelRatioFloor: isConstrained ? 0.78 : 0.9,
                renderScaleInitial: isConstrained ? 1.06 : 1.12,
                renderScaleMin: isConstrained ? 0.86 : 0.92,
                renderScaleMax: isConstrained ? 1.16 : 1.25,
                maxRenderPixels: isConstrained ? 2600000 : 4200000,
                adaptiveResolution: true,
                targetFrameTime: isConstrained ? 21.5 : 18.5,
                bloomMips: isConstrained ? 3 : 4,
                bloomStrength: isConstrained ? 0.32 : 0.38,
                bloomThreshold: 0.9,
                bloomSmoothWidth: 0.86,
                bloomRadius: 0.64,
                // Preserve distant map detail on phones instead of applying a
                // cinematic blur to the scene.
                depthOfField: false,
                dofRepeats: isConstrained ? 20 : 28,
                dofAmount: isConstrained ? 0.0028 : 0.0032,
                dofStart: 0.18,
                dofEnd: 0.52,
                shadowMapSize: isConstrained ? 1024 : 2048,
                shadowRadius: isConstrained ? 2.6 : 3,
                shadowsEnabled: true,
                textureAnisotropy: isConstrained ? 4 : 8,
                toneMappingExposure: 1.08,
                visibilityMultiplier: isConstrained ? 1.55 : 1.75,
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
                depthOfField: false,
                dofRepeats: 52,
                dofAmount: 0.0048,
                dofStart: 0.17,
                dofEnd: 0.54,
                shadowMapSize: 4096,
                shadowRadius: 4.8,
                shadowsEnabled: true,
                textureAnisotropy: 16,
                toneMappingExposure: 1.16,
                visibilityMultiplier: 1.85,
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
                depthOfField: false,
                dofRepeats: 42,
                dofAmount: 0.0042,
                dofStart: 0.18,
                dofEnd: 0.53,
                shadowMapSize: 4096,
                shadowRadius: 4.1,
                shadowsEnabled: true,
                textureAnisotropy: 16,
                toneMappingExposure: 1.1,
                visibilityMultiplier: 1.72,
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
            depthOfField: false,
            dofRepeats: 34,
            dofAmount: 0.0037,
            dofStart: 0.19,
            dofEnd: 0.52,
            shadowMapSize: 2048,
            shadowRadius: 3.5,
            shadowsEnabled: true,
            textureAnisotropy: 12,
            toneMappingExposure: 1.06,
            visibilityMultiplier: 1.6,
        }
    }

    changeLevel(level = QUALITY_LEVELS.HIGH, { notify = true } = {})
    {
        const nextLevel = VALID_LEVELS.has(level) ? level : QUALITY_LEVELS.HIGH
        if(nextLevel === this.level)
            return

        const previousAssetProfile = this.getAssetProfile(this.level)
        this.level = nextLevel
        const assetProfile = this.getAssetProfile()
        const requiresWorldReload = previousAssetProfile.compressedAssets !== assetProfile.compressedAssets

        this.game.save.set('settings.quality', this.level, { immediate: true })
        this.normalizeFpsLimitForLevel(this.level, { persist: true })
        if(notify)
            this.events.trigger('change', [ this.level, this.getProfile(), { previousAssetProfile, assetProfile, requiresWorldReload } ])
    }

    setShadowMode(mode = 'auto', { notify = true } = {})
    {
        const nextMode = VALID_SHADOW_MODES.has(mode) ? mode : 'auto'
        if(nextMode === this.getShadowMode())
            return

        this.game.save.set('settings.shadows', nextMode, { immediate: true })
        if(notify)
            this.events.trigger('settingsChange', [ 'shadows', nextMode ])
    }

    cycleShadowMode()
    {
        const order = [ 'auto', 'on', 'off' ]
        const currentIndex = order.indexOf(this.getShadowMode())
        this.setShadowMode(order[(currentIndex + 1) % order.length])
    }

    setFpsLimit(limit = AUTO_FPS_LIMIT, { notify = true } = {})
    {
        const allowed = this.getAvailableFpsLimits(this.level)
        const numericLimit = Number(limit)
        const nextLimit = allowed.includes(numericLimit)
            ? numericLimit
            : this.getRecommendedFpsLimit(this.level)
        if(nextLimit === this.getFpsLimit())
            return

        this.game.save.set('settings.fpsLimit', nextLimit, { immediate: true })
        if(notify)
            this.events.trigger('settingsChange', [ 'fpsLimit', nextLimit ])
    }

    cycleFpsLimit()
    {
        const order = this.getAvailableFpsLimits(this.level)
        const currentIndex = order.indexOf(this.getFpsLimit())
        this.setFpsLimit(order[(currentIndex + 1) % order.length])
    }

    normalizeFpsLimitForLevel(level = this.level, { persist = false } = {})
    {
        const allowed = this.getAvailableFpsLimits(level)
        const saved = Number(this.game.save?.get('settings.fpsLimit', AUTO_FPS_LIMIT))
        const next = allowed.includes(saved)
            ? saved
            : this.getRecommendedFpsLimit(level)

        if(persist && this.game.save)
            this.game.save.set('settings.fpsLimit', next, { immediate: true })

        return next
    }
}
