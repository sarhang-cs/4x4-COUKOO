import { Events } from './Events.js'
import { Game } from './Game.js'

const QUALITY_LEVELS = Object.freeze({
    HIGH: 0,
    LOW: 1,
    MEDIUM: 2,
})

const VALID_LEVELS = new Set(Object.values(QUALITY_LEVELS))
const VALID_SHADOW_MODES = new Set([ 'auto', 'on', 'off' ])
const AUTO_FPS_LIMIT = -1
const HIGH_REFRESH_NATIVE = 121
const FRAME_RATE_STEPS = Object.freeze([ 30, 45, 60, 90, 120 ])

const clamp = (value, min, max) => Math.max(min, Math.min(value, max))
const numeric = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback
const median = (values) =>
{
    if(!values.length)
        return 0

    const sorted = [ ...values ].sort((a, b) => a - b)
    const middle = Math.floor(sorted.length / 2)
    return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) * 0.5
}

const canonicalRefreshRate = (value) =>
{
    const candidates = [ 30, 45, 48, 50, 60, 72, 75, 90, 100, 120, 144, 165, 180, 200, 240 ]
    const closest = candidates.reduce((best, candidate) =>
        Math.abs(candidate - value) < Math.abs(best - value) ? candidate : best
    , candidates[0])

    return Math.abs(closest - value) / Math.max(1, closest) <= 0.18
        ? closest
        : Math.round(value)
}

const humanBytes = (value) =>
{
    const bytes = numeric(value)
    if(bytes <= 0)
        return 'Not exposed by browser'

    const units = [ 'B', 'KB', 'MB', 'GB', 'TB' ]
    let index = 0
    let amount = bytes
    while(amount >= 1024 && index < units.length - 1)
    {
        amount /= 1024
        index++
    }

    return `${amount >= 10 || index === 0 ? Math.round(amount) : amount.toFixed(1)} ${units[index]}`
}

const parseAndroidModel = (userAgent = '') =>
{
    // Android often hides the handset model. Use it only when the browser
    // explicitly includes a Build/ marker; otherwise report that it is hidden.
    const match = userAgent.match(/Android\s+[^;]+;\s*(?:[a-z]{2}-[A-Z]{2};\s*)?([^;()]+?)\s+Build\//i)
    const model = match?.[1]?.trim() ?? ''

    return /^(wv|k|linux|android|mobile)$/i.test(model) ? '' : model
}


const classifyDeviceFamily = (userAgent = '', model = '') =>
{
    const value = `${userAgent} ${model}`.toLowerCase()
    if(/iphone|ipad|ipod/.test(value)) return 'apple-mobile'
    if(/samsung|sm-[a-z0-9]+|galaxy/.test(value)) return 'samsung'
    if(/redmi|xiaomi|poco|mi\s/.test(value)) return 'xiaomi'
    if(/vivo|iqoo/.test(value)) return 'vivo'
    if(/oppo|realme|oneplus/.test(value)) return 'oppo-family'
    if(/android/.test(value)) return 'android'
    if(/macintosh|windows|linux/.test(value)) return 'desktop'
    return 'unknown'
}

const getGpuScore = (gpu = {}) =>
{
    let score = 0
    if(gpu.webgl2) score += 2
    if(gpu.maxTextureSize >= 16384) score += 4
    else if(gpu.maxTextureSize >= 8192) score += 3
    else if(gpu.maxTextureSize >= 4096) score += 1
    if(gpu.maxRenderbufferSize >= 8192) score += 2
    if(gpu.maxSamples >= 4) score += 1
    return score
}

export class Quality
{
    static LEVELS = QUALITY_LEVELS

    constructor()
    {
        this.game = Game.getInstance()
        this.events = new Events()
        this.device = this.createDeviceProfile()
        this.evaluateDeviceCapability()
        this.level = this.getInitialLevel()
        this.refreshDeviceFacts()

        this.onVisibilityChange = () =>
        {
            if(document.visibilityState === 'visible')
                this.startFrameRateProbe({ delay: 1200 })
        }
        document.addEventListener('visibilitychange', this.onVisibilityChange, { passive: true })

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

    createGpuProfile()
    {
        const fallback = {
            renderer: '',
            vendor: '',
            maxTextureSize: 0,
            maxRenderbufferSize: 0,
            maxSamples: 0,
            maxVertexTextures: 0,
            maxVaryingVectors: 0,
            webgl2: false,
            webgpu: Boolean(navigator.gpu?.requestAdapter),
        }

        try
        {
            const canvas = document.createElement('canvas')
            const context = canvas.getContext('webgl2', { powerPreference: 'high-performance' })
                || canvas.getContext('webgl', { powerPreference: 'high-performance' })

            if(!context)
                return fallback

            const debugInfo = context.getExtension('WEBGL_debug_renderer_info')
            const vendor = debugInfo ? String(context.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) ?? '') : ''
            const renderer = debugInfo ? String(context.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) ?? '') : ''

            return {
                renderer,
                vendor,
                maxTextureSize: numeric(context.getParameter(context.MAX_TEXTURE_SIZE)),
                maxRenderbufferSize: numeric(context.getParameter(context.MAX_RENDERBUFFER_SIZE)),
                maxSamples: context.MAX_SAMPLES ? numeric(context.getParameter(context.MAX_SAMPLES)) : 0,
                maxVertexTextures: context.MAX_VERTEX_TEXTURE_IMAGE_UNITS ? numeric(context.getParameter(context.MAX_VERTEX_TEXTURE_IMAGE_UNITS)) : 0,
                maxVaryingVectors: context.MAX_VARYING_VECTORS ? numeric(context.getParameter(context.MAX_VARYING_VECTORS)) : 0,
                webgl2: typeof WebGL2RenderingContext !== 'undefined' && context instanceof WebGL2RenderingContext,
                webgpu: Boolean(navigator.gpu?.requestAdapter),
            }
        }
        catch(error)
        {
            return fallback
        }
    }

    createDeviceProfile()
    {
        const userAgent = navigator.userAgent || ''
        const uaData = navigator.userAgentData
        const isMobile = Boolean(uaData?.mobile) || /Mobi|Android|iPhone|iPad|iPod/i.test(userAgent)
        const memory = numeric(navigator.deviceMemory)
        const memoryKnown = memory > 0
        const cores = Math.max(1, numeric(navigator.hardwareConcurrency, 0)) || null
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
        const effectiveType = connection?.effectiveType ?? ''
        const saveData = Boolean(connection?.saveData)
        const gpu = this.createGpuProfile()
        const model = parseAndroidModel(userAgent)
        const viewport = window.visualViewport

        return {
            isMobile,
            desktop: !isMobile,
            model,
            deviceFamily: classifyDeviceFamily(userAgent, model),
            platform: uaData?.platform || navigator.platform || '',
            browser: uaData?.brands?.map((brand) => `${brand.brand} ${brand.version}`).join(', ') || userAgent,
            architecture: '',
            bitness: '',
            memory: memoryKnown ? memory : null,
            cores,
            gpu,
            connection: {
                effectiveType,
                saveData,
                online: navigator.onLine !== false,
            },
            screen: {
                width: window.screen?.width ?? 0,
                height: window.screen?.height ?? 0,
                viewportWidth: Math.round(viewport?.width ?? window.innerWidth ?? 0),
                viewportHeight: Math.round(viewport?.height ?? window.innerHeight ?? 0),
                pixelRatio: window.devicePixelRatio || 1,
                colorDepth: window.screen?.colorDepth ?? 0,
                orientation: window.screen?.orientation?.type || '',
                colorGamut: window.matchMedia?.('(color-gamut: p3)').matches ? 'display-p3' : 'srgb',
            },
            storage: { quota: null, usage: null, available: null },
            battery: { level: null, charging: null },
            tier: 'balanced',
            capability: 'balanced',
            isConstrained: false,
            isMobileConstrained: false,
            refresh: {
                state: 'waiting',
                measuredHz: null,
                samples: 0,
                source: 'Not calibrated yet',
            },
        }
    }

    evaluateDeviceCapability()
    {
        const { gpu, memory, cores, connection, isMobile } = this.device
        const gpuScore = getGpuScore(gpu)
        const networkConstrained = Boolean(connection?.saveData || /(^|-)2g|slow-2g/i.test(connection?.effectiveType ?? ''))
        const memoryConstrained = Number.isFinite(memory) && memory > 0 && memory <= 4
        const coreConstrained = Number.isFinite(cores) && cores > 0 && cores <= 4
        const gpuConstrained = gpu.maxTextureSize > 0 && gpu.maxTextureSize <= 4096
        const constrained = Boolean(networkConstrained || memoryConstrained || coreConstrained || gpuConstrained)

        const cpuStrong = (cores ?? 0) >= 8
        const memoryStrong = (memory ?? 0) >= 8
        const highGpu = gpuScore >= 6
        const ultraGpu = gpuScore >= 8 && gpu.maxTextureSize >= 16384

        let tier = 'balanced'
        if(constrained)
            tier = 'low'
        else if(!isMobile && ultraGpu && cpuStrong && memoryStrong)
            tier = 'ultra'
        else if(highGpu || (cpuStrong && memoryStrong))
            tier = 'high'

        this.device.gpu.score = gpuScore
        this.device.tier = tier
        this.device.capability = tier === 'low' ? 'constrained' : tier === 'balanced' ? 'balanced' : 'strong'
        this.device.isConstrained = constrained
        this.device.isMobileConstrained = isMobile && constrained
    }

    refreshDeviceFacts()
    {
        const update = () =>
        {
            this.evaluateDeviceCapability()
            this.events.trigger('deviceChange', [ this.device ])
        }

        navigator.storage?.estimate?.()
            ?.then((estimate) =>
            {
                const quota = numeric(estimate?.quota)
                const usage = numeric(estimate?.usage)
                this.device.storage = {
                    quota: quota || null,
                    usage: usage || null,
                    available: quota > 0 ? Math.max(0, quota - usage) : null,
                }
                update()
            })
            .catch(() => undefined)

        navigator.getBattery?.()
            ?.then((battery) =>
            {
                const syncBattery = () =>
                {
                    this.device.battery = {
                        level: Number.isFinite(battery.level) ? Math.round(battery.level * 100) : null,
                        charging: typeof battery.charging === 'boolean' ? battery.charging : null,
                    }
                    update()
                }

                syncBattery()
                battery.addEventListener?.('levelchange', syncBattery)
                battery.addEventListener?.('chargingchange', syncBattery)
            })
            .catch(() => undefined)

        navigator.userAgentData?.getHighEntropyValues?.([ 'model', 'platform', 'platformVersion', 'architecture', 'bitness', 'fullVersionList' ])
            ?.then((details) =>
            {
                const model = String(details?.model ?? '').trim()
                if(model)
                    this.device.model = model

                const platform = String(details?.platform ?? '').trim()
                if(platform)
                    this.device.platform = platform

                this.device.architecture = String(details?.architecture ?? '').trim()
                this.device.bitness = String(details?.bitness ?? '').trim()
                this.device.deviceFamily = classifyDeviceFamily(navigator.userAgent || '', this.device.model)

                const brands = details?.fullVersionList?.map((brand) => `${brand.brand} ${brand.version}`).join(', ')
                if(brands)
                    this.device.browser = brands

                update()
            })
            .catch(() => undefined)

        // WebGPU adapter identity is not exposed by every browser. When it is
        // available, keep it as an observed capability; otherwise the WebGL
        // renderer facts above remain the authoritative fallback.
        if(!this.device.isMobile && navigator.gpu?.requestAdapter)
        {
            navigator.gpu.requestAdapter({ powerPreference: 'high-performance' })
                .then(async (adapter) =>
                {
                    if(!adapter)
                        return

                    this.device.gpu.webgpu = true
                    const info = typeof adapter.requestAdapterInfo === 'function'
                        ? await adapter.requestAdapterInfo().catch(() => null)
                        : adapter.info ?? null
                    const adapterName = String(info?.description || info?.device || '').trim()
                    const adapterVendor = String(info?.vendor || '').trim()
                    if(adapterName && !this.device.gpu.renderer)
                        this.device.gpu.renderer = adapterName
                    if(adapterVendor && !this.device.gpu.vendor)
                        this.device.gpu.vendor = adapterVendor
                    update()
                })
                .catch(() => undefined)
        }
    }

    syncViewportFacts()
    {
        const viewport = window.visualViewport
        this.device.screen = {
            ...this.device.screen,
            width: window.screen?.width ?? this.device.screen.width,
            height: window.screen?.height ?? this.device.screen.height,
            viewportWidth: Math.round(viewport?.width ?? window.innerWidth ?? this.device.screen.viewportWidth),
            viewportHeight: Math.round(viewport?.height ?? window.innerHeight ?? this.device.screen.viewportHeight),
            pixelRatio: window.devicePixelRatio || this.device.screen.pixelRatio || 1,
            orientation: window.screen?.orientation?.type || (window.innerWidth > window.innerHeight ? 'landscape' : 'portrait'),
        }
        this.events.trigger('deviceChange', [ this.device ])
    }

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
            source: 'Measuring live browser requestAnimationFrame cadence',
        }
        this.events.trigger('deviceChange', [ this.device ])

        // Do not pause the renderer during calibration. A second rAF callback
        // follows the same browser cadence while the world keeps loading, which
        // avoids a visible hitch or a false low result from a stopped canvas.
        const intervals = []
        let previous = 0
        let startedAt = 0
        let warmupFrames = 14

        const finish = () =>
        {
            this.frameRateProbeRunning = false
            const stable = intervals
                .filter((interval) => interval >= 3 && interval <= 70)
                .sort((a, b) => a - b)
            const trim = Math.floor(stable.length * 0.12)
            const samples = stable.slice(trim, stable.length - trim || undefined)
            const interval = median(samples)
            const rawHz = interval > 0 ? 1000 / interval : 30
            const measuredHz = Math.max(30, canonicalRefreshRate(rawHz))

            this.device.refresh = {
                state: 'ready',
                measuredHz,
                samples: samples.length,
                source: 'Live browser requestAnimationFrame cadence',
            }

            this.normalizeFpsLimitForLevel(this.level, { persist: true })
            this.events.trigger('deviceChange', [ this.device ])
        }

        const sample = (timestamp) =>
        {
            if(document.visibilityState === 'hidden')
            {
                finish()
                return
            }

            if(!startedAt)
                startedAt = timestamp

            if(previous)
            {
                const interval = timestamp - previous
                if(warmupFrames > 0)
                    warmupFrames--
                else if(Number.isFinite(interval))
                    intervals.push(interval)
            }

            previous = timestamp

            if((intervals.length >= 100 && timestamp - startedAt >= 1100) || timestamp - startedAt >= 1800)
            {
                finish()
                return
            }

            window.requestAnimationFrame(sample)
        }

        window.requestAnimationFrame(sample)
    }

    getMeasuredRefreshHz()
    {
        return Math.max(30, numeric(this.device.refresh?.measuredHz, 30))
    }

    getDisplayFpsLimits()
    {
        if(this.device.refresh?.state !== 'ready')
            return [ 30 ]

        const ceiling = this.getMeasuredRefreshHz()
        const limits = FRAME_RATE_STEPS.filter((value) => value <= ceiling + 2)
        return limits.length ? limits : [ 30 ]
    }

    getAvailableFpsLimits()
    {
        const limits = [ AUTO_FPS_LIMIT, ...this.getDisplayFpsLimits() ]
        if(this.device.refresh?.state === 'ready' && this.getMeasuredRefreshHz() > 120)
            limits.push(HIGH_REFRESH_NATIVE)

        return [ ...new Set(limits) ]
    }

    getRecommendedFpsLimit(level = this.level)
    {
        const displayLimits = this.getDisplayFpsLimits()
        const maximum = displayLimits.at(-1) ?? 30
        const highestAtMost = (cap) => displayLimits.filter((value) => value <= cap).at(-1) ?? 30

        if(level === QUALITY_LEVELS.LOW)
            return highestAtMost(this.device.isConstrained ? 30 : 45)

        if(level === QUALITY_LEVELS.MEDIUM)
            return highestAtMost(this.device.capability === 'strong' ? 90 : 60)

        if(maximum > 120 && this.device.capability === 'strong')
            return HIGH_REFRESH_NATIVE

        if(maximum >= 120 && this.device.capability === 'strong')
            return 120

        if(maximum >= 90 && this.device.capability !== 'constrained')
            return 90

        return highestAtMost(60)
    }

    getEffectiveFpsLimit(limit = this.getFpsLimit(), level = this.level)
    {
        const selected = limit === AUTO_FPS_LIMIT ? this.getRecommendedFpsLimit(level) : limit
        return selected === HIGH_REFRESH_NATIVE ? 0 : selected
    }

    getFrameRateRenderPolicy(level = this.level)
    {
        const targetFps = this.getEffectiveFpsLimit(this.getFpsLimit(), level)
        const effectiveFps = targetFps || this.getMeasuredRefreshHz()

        if(effectiveFps >= 120)
            return { targetFps, renderScaleMultiplier: 0.78, maxPixelsMultiplier: 0.72, bloomMipsDelta: -2, shadowMapMultiplier: 0.5 }
        if(effectiveFps >= 90)
            return { targetFps, renderScaleMultiplier: 0.88, maxPixelsMultiplier: 0.84, bloomMipsDelta: -1, shadowMapMultiplier: 0.75 }
        if(effectiveFps >= 60)
            return { targetFps, renderScaleMultiplier: 0.96, maxPixelsMultiplier: 0.94, bloomMipsDelta: 0, shadowMapMultiplier: 1 }
        if(effectiveFps >= 45)
            return { targetFps, renderScaleMultiplier: 1.02, maxPixelsMultiplier: 1.04, bloomMipsDelta: 0, shadowMapMultiplier: 1 }

        return { targetFps, renderScaleMultiplier: 1.08, maxPixelsMultiplier: 1.12, bloomMipsDelta: 1, shadowMapMultiplier: 1 }
    }

    getFpsLabel(limit = this.getFpsLimit(), level = this.level)
    {
        if(limit === AUTO_FPS_LIMIT)
        {
            if(this.device.refresh?.state !== 'ready')
                return 'Auto (checking)'

            return `Auto (${this.getFpsLabel(this.getRecommendedFpsLimit(level), level)})`
        }

        if(limit === HIGH_REFRESH_NATIVE)
            return `120+ FPS · Browser ${this.getMeasuredRefreshHz()} Hz`

        return `${limit} FPS`
    }

    getFpsDescription(limit, level = this.level)
    {
        if(limit === AUTO_FPS_LIMIT)
        {
            if(this.device.refresh?.state !== 'ready')
                return 'Checking the current browser frame cadence. The menu will show only rates the browser can actually present.'

            return `${this.getLabel(level)} Auto chooses ${this.getFpsLabel(this.getRecommendedFpsLimit(level), level)} from the current browser cadence and device capability.`
        }

        if(limit === HIGH_REFRESH_NATIVE)
            return `Uses the current browser cadence (${this.getMeasuredRefreshHz()} Hz). The browser, not the game, remains the final frame-rate limit.`

        return `${this.getLabel(level)} profile capped at ${limit} FPS. Physics, timers, inputs, audio and network updates remain time-based.`
    }

    getFpsRangeLabel(level = this.level)
    {
        return this.getAvailableFpsLimits(level)
            .map((value) => this.getFpsLabel(value, level))
            .join(' · ')
    }

    getDeviceSummary()
    {
        const identity = this.device.model || (this.device.isMobile ? 'Mobile model hidden' : 'Desktop')
        const capability = this.device.capability === 'strong' ? 'Strong browser profile' : this.device.capability === 'constrained' ? 'Constrained browser profile' : 'Balanced browser profile'
        const cadence = this.device.refresh?.state === 'ready'
            ? `Browser ${this.getMeasuredRefreshHz()} Hz`
            : 'Browser cadence checking'
        return `${identity} · ${capability} · ${cadence}`
    }

    getDeviceDetails()
    {
        const model = this.device.model || 'Not exposed by this browser'
        const platform = this.device.platform || 'Not exposed by this browser'
        const cpu = this.device.cores ? `${this.device.cores} logical browser cores` : 'Not exposed by this browser'
        const ram = this.device.memory ? `${this.device.memory} GB browser-reported RAM` : 'Not exposed by this browser'
        const gpu = this.device.gpu.renderer || this.device.gpu.vendor || 'Not exposed by this browser'
        const gpuLimits = this.device.gpu.maxTextureSize
            ? `${this.device.gpu.webgl2 ? 'WebGL2' : 'WebGL'} · max texture ${this.device.gpu.maxTextureSize}px · ${this.device.gpu.webgpu ? 'WebGPU API exposed' : 'WebGPU API not exposed'}`
            : 'GPU limits not exposed by this browser'
        const screen = `${this.device.screen.width}×${this.device.screen.height} CSS px · viewport ${this.device.screen.viewportWidth}×${this.device.screen.viewportHeight} · ${this.device.screen.pixelRatio}x DPR · ${this.device.screen.colorGamut}`
        const storage = this.device.storage.quota ? `${humanBytes(this.device.storage.available)} available of ${humanBytes(this.device.storage.quota)}` : 'Not exposed by this browser'
        const battery = this.device.battery.level === null
            ? 'Not exposed by this browser'
            : `${this.device.battery.level}%${this.device.battery.charging ? ' · charging' : ''}`
        const cadence = this.device.refresh?.state === 'ready'
            ? `${this.getMeasuredRefreshHz()} Hz from ${this.device.refresh.samples} live requestAnimationFrame samples`
            : 'Calibration is running'

        return `Model: ${model}. Device family: ${this.device.deviceFamily}. Platform: ${platform}. CPU: ${cpu}. RAM: ${ram}. GPU: ${gpu}. GPU capability: ${gpuLimits}. Screen: ${screen}. Browser cadence: ${cadence}. Storage: ${storage}. Battery: ${battery}. Selected device tier: ${this.device.tier}. This profile uses only browser-exposed values; unavailable chipset, RAM or physical-panel information is not guessed.`
    }

    getInitialLevel()
    {
        const savedLevel = this.game.save.get('settings.quality', null)
        if(VALID_LEVELS.has(savedLevel))
            return savedLevel

        // First launch chooses a real device profile from browser-exposed GPU,
        // CPU, memory and network facts. It does not guess a preset from a
        // phone brand or model name.
        if(this.device.isConstrained)
            return QUALITY_LEVELS.LOW
        if(this.device.capability === 'strong')
            return QUALITY_LEVELS.HIGH
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
            description: 'Phase 10 optimized: the lightweight mobile profile with the same driving world, save, weather, season, and accessibility systems, now tuned for better stability on phones.',
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
                pixelRatioLimit: isMobile ? (isConstrained ? 1.1 : this.device.tier === 'high' ? 1.65 : 1.45) : 1.45,
                pixelRatioFloor: isMobile ? (isConstrained ? 0.72 : 0.82) : 0.82,
                renderScaleInitial: isMobile ? (isConstrained ? 1 : 1.08) : 1,
                renderScaleMin: isMobile ? (isConstrained ? 0.74 : 0.84) : 0.8,
                renderScaleMax: isMobile ? (isConstrained ? 1.08 : 1.2) : 1.2,
                maxRenderPixels: isMobile ? (isConstrained ? 2000000 : this.device.tier === 'high' ? 3600000 : 2900000) : 4300000,
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
                pixelRatioLimit: isConstrained ? 1.25 : this.device.tier === 'high' ? 2.1 : 1.75,
                pixelRatioFloor: isConstrained ? 0.84 : this.device.tier === 'high' ? 1.08 : 0.96,
                renderScaleInitial: isConstrained ? 1.06 : this.device.tier === 'high' ? 1.18 : 1.12,
                renderScaleMin: isConstrained ? 0.86 : this.device.tier === 'high' ? 1 : 0.94,
                renderScaleMax: isConstrained ? 1.16 : this.device.tier === 'high' ? 1.3 : 1.22,
                maxRenderPixels: isConstrained ? 2800000 : this.device.tier === 'high' ? 6200000 : 4600000,
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
            : AUTO_FPS_LIMIT
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
            : AUTO_FPS_LIMIT

        if(persist && this.game.save)
            this.game.save.set('settings.fpsLimit', next, { immediate: true })

        return next
    }
}
