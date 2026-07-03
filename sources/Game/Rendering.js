import * as THREE from 'three/webgpu'
import { pass, renderOutput } from 'three/tsl'
import { bloom } from 'three/addons/tsl/display/BloomNode.js'
import { Game } from './Game.js'
import { cheapDOF } from './Passes/cheapDOF.js'
import { Inspector } from 'three/addons/inspector/Inspector.js'

const clamp = (value, min, max) => Math.max(min, Math.min(value, max))

export class Rendering
{
    constructor()
    {
        this.game = Game.getInstance()
        this.isMobile = this.game.quality.device.isMobile
        this.isWebGLFallback = false
        this.usePostprocessing = true
        this.pixelRatioLimit = 1
        this.pixelRatioFloor = 0.75
        this.renderScale = 1
        this.activePixelRatio = 0
        this.textureQualityDirty = true
        this.animationLoop = null
        this.visibilityHandler = null
        this.frameLimit = this.game.quality.getEffectiveFpsLimit()
        this.lastRenderElapsed = -Infinity
        this.lastRenderTimestamp = -Infinity
        this.frameAccumulator = 0
        this.performance = {
            lastAdjustmentElapsed: 0,
            slowWindows: 0,
            fastWindows: 0,
        }

        if(this.game.debug.active)
        {
            this.debugPanel = this.game.debug.panel.addFolder({ title: '📸 Rendering', expanded: false })
        }
    }

    start()
    {
        this.setStats()
        this.game.ticker.events.on('tick', () => this.updateAdaptiveResolution(), 997)
        this.game.ticker.events.on('tick', () => this.render(), 998)
        this.game.viewport.events.on('change', () => this.resize())
    }

    async canUseWebGPU()
    {
        // Some mobile Chromium builds expose navigator.gpu while the provider is
        // still disabled or incomplete. Do not initialise it there: Three.js would
        // emit a context-provider error before falling back to WebGL.
        if(this.isMobile || !navigator.gpu?.requestAdapter)
            return false

        try
        {
            const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' })
            return Boolean(adapter)
        }
        catch(error)
        {
            return false
        }
    }

    async setRenderer()
    {
        const useWebGPU = await this.canUseWebGPU()
        this.renderer = new THREE.WebGPURenderer({
            canvas: this.game.canvasElement,
            powerPreference: 'high-performance',
            forceWebGL: !useWebGPU,
            antialias: !this.isMobile,
        })
        this.renderer.setSize(this.game.viewport.width, this.game.viewport.height)
        this.renderer.sortObjects = false
        this.renderer.domElement.classList.add('experience')
        this.renderer.shadowMap.enabled = true
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
        this.renderer.outputColorSpace = THREE.SRGBColorSpace
        this.renderer.setOpaqueSort((a, b) => a.renderOrder - b.renderOrder)
        this.renderer.setTransparentSort((a, b) => a.renderOrder - b.renderOrder)

        if(location.hash.match(/inspector/i))
            this.renderer.inspector = new Inspector()

        await this.renderer.init()

        this.animationLoop = (elapsedTime) => this.game.ticker.update(elapsedTime)
        this.renderer.setAnimationLoop(this.animationLoop)
        this.setVisibilityHandling()
        this.setContextRecovery()

        this.isWebGLFallback = this.renderer.backend.isWebGLBackend
        this.applyQualityProfile()
        this.game.quality.events.on('settingsChange', () => this.applyQualityProfile())
        this.game.quality.events.on('deviceChange', () => this.applyQualityProfile())
        return this.renderer
    }

    setPostprocessing()
    {
        this.postProcessing = new THREE.RenderPipeline(this.renderer)
        const scenePass = pass(this.game.scene, this.game.view.camera)
        this.scenePassColor = scenePass.getTextureNode('output')
        this.bloomPass = bloom(this.scenePassColor)
        this.cheapDOFPass = cheapDOF(renderOutput(scenePass))

        this.applyQualityProfile()
        this.game.quality.events.on('change', () => this.applyQualityProfile())

        if(this.game.debug.active)
        {
            const bloomPanel = this.debugPanel.addFolder({ title: 'bloom', expanded: false })
            bloomPanel.addBinding(this.bloomPass.threshold, 'value', { label: 'threshold', min: 0, max: 2, step: 0.01 })
            bloomPanel.addBinding(this.bloomPass.strength, 'value', { label: 'strength', min: 0, max: 3, step: 0.01 })
            bloomPanel.addBinding(this.bloomPass.radius, 'value', { label: 'radius', min: 0, max: 1, step: 0.01 })
            bloomPanel.addBinding(this.bloomPass.smoothWidth, 'value', { label: 'smoothWidth', min: 0, max: 1, step: 0.01 })
            const blurPanel = this.debugPanel.addFolder({ title: 'blur', expanded: true })
            blurPanel.addBinding(this.cheapDOFPass.start, 'value', { label: 'start', min: 0, max: 0.5, step: 0.001 })
            blurPanel.addBinding(this.cheapDOFPass.end, 'value', { label: 'end', min: 0, max: 0.5, step: 0.001 })
            blurPanel.addBinding(this.cheapDOFPass.repeats, 'value', { label: 'repeats', min: 1, max: 100, step: 1 })
            blurPanel.addBinding(this.cheapDOFPass.amount, 'value', { label: 'amount', min: 0, max: 0.02, step: 0.0001 })
        }
    }

    applyQualityProfile()
    {
        const profile = this.game.quality.getProfile()
        const framePolicy = this.game.quality.getFrameRateRenderPolicy(profile.level)
        const lowLevel = this.game.quality.constructor.LEVELS.LOW
        this.pixelRatioLimit = profile.pixelRatioLimit
        this.pixelRatioFloor = profile.pixelRatioFloor
        this.maxRenderPixels = profile.maxRenderPixels * framePolicy.maxPixelsMultiplier
        this.renderScale = profile.renderScaleInitial * framePolicy.renderScaleMultiplier
        this.performance.lastAdjustmentElapsed = this.game.ticker?.elapsed ?? 0
        this.performance.slowWindows = 0
        this.performance.fastWindows = 0
        this.textureQualityDirty = true
        this.usePostprocessing = !(this.isMobile && profile.level === lowLevel)

        if(this.renderer)
        {
            // High desktop uses AgX to preserve highlight detail around neon and
            // emissive materials while avoiding clipped white areas.
            this.renderer.toneMapping = profile.level === 0 && !this.isMobile
                ? THREE.AgXToneMapping
                : THREE.NoToneMapping
            this.renderer.toneMappingExposure = profile.toneMappingExposure
            this.renderer.shadowMap.enabled = this.game.quality.getShadowsEnabled()
            this.frameLimit = framePolicy.targetFps
            this.lastRenderElapsed = -Infinity
            this.lastRenderTimestamp = -Infinity
            this.frameAccumulator = 0
            this.applyPixelRatio()
        }

        if(!this.bloomPass || !this.postProcessing)
            return

        this.bloomPass._nMips = Math.max(1, profile.bloomMips + framePolicy.bloomMipsDelta)
        this.bloomPass.threshold.value = profile.bloomThreshold
        this.bloomPass.strength.value = profile.bloomStrength
        this.bloomPass.smoothWidth.value = profile.bloomSmoothWidth
        this.bloomPass.radius.value = profile.bloomRadius
        this.cheapDOFPass.repeats.value = profile.dofRepeats
        this.cheapDOFPass.amount.value = profile.dofAmount
        this.cheapDOFPass.start.value = profile.dofStart
        this.cheapDOFPass.end.value = profile.dofEnd
        this.postProcessing.outputNode = profile.depthOfField
            ? this.cheapDOFPass.add(this.bloomPass)
            : this.scenePassColor.add(this.bloomPass)
        this.postProcessing.needsUpdate = true
    }

    applyPixelRatio()
    {
        if(!this.renderer)
            return

        const profile = this.game.quality.getProfile()
        const nativePixelRatio = this.game.viewport.pixelRatioPure ?? this.game.viewport.pixelRatio
        const viewportPixels = Math.max(1, this.game.viewport.width * this.game.viewport.height)
        const maxRenderPixels = this.maxRenderPixels ?? profile.maxRenderPixels
        const budgetPixelRatio = Math.sqrt(maxRenderPixels / viewportPixels)
        const maximum = Math.max(0.5, Math.min(profile.pixelRatioLimit, budgetPixelRatio))
        const minimum = Math.min(maximum, Math.max(0.5, profile.pixelRatioFloor))
        // Use the capped device ratio as the baseline. On a 3x phone with a
        // 1x quality cap this lets adaptive resolution actually step down.
        const baselinePixelRatio = Math.min(nativePixelRatio, maximum)
        const desired = baselinePixelRatio * this.renderScale
        const pixelRatio = clamp(desired, minimum, maximum)

        if(Math.abs(pixelRatio - this.activePixelRatio) < 0.01)
            return

        this.activePixelRatio = pixelRatio
        this.renderer.setPixelRatio(pixelRatio)
    }

    setVisibilityHandling()
    {
        if(this.visibilityHandler)
            return

        this.visibilityHandler = () =>
        {
            if(!this.renderer || !this.animationLoop)
                return

            if(document.visibilityState === 'hidden')
            {
                this.renderer.setAnimationLoop(null)
                return
            }

            this.performance.lastAdjustmentElapsed = this.game.ticker?.elapsed ?? 0
            this.performance.slowWindows = 0
            this.performance.fastWindows = 0
            this.activePixelRatio = 0
            this.applyPixelRatio()
            this.renderer.setAnimationLoop(this.animationLoop)
        }

        document.addEventListener('visibilitychange', this.visibilityHandler, { passive: true })
    }

    setContextRecovery()
    {
        const canvas = this.game.canvasElement
        if(!canvas || this.contextRecoveryBound)
            return

        this.contextRecoveryBound = true
        canvas.addEventListener('webglcontextlost', (event) =>
        {
            event.preventDefault()
            // Do not leave the HUD over an empty canvas. A controlled restart
            // brings back the same loading screen and rebuilds the renderer.
            this.game.requestControlledReload?.('Recovering the 3D renderer…')
        }, { passive: false })
    }

    updateAdaptiveResolution()
    {
        const profile = this.game.quality.getProfile()

        if(!profile.adaptiveResolution || document.visibilityState === 'hidden')
            return

        const elapsed = this.game.ticker.elapsed
        if(elapsed < 5 || elapsed - this.performance.lastAdjustmentElapsed < 3.5)
            return

        const frameTime = (this.game.ticker.deltaAverage ?? this.game.ticker.delta) * 1000
        if(!Number.isFinite(frameTime) || frameTime <= 0)
            return

        this.performance.lastAdjustmentElapsed = elapsed

        const configuredLimit = this.game.quality.getEffectiveFpsLimit()
        const targetFrameTime = configuredLimit > 0
            ? 1000 / configuredLimit * 0.96
            : profile.targetFrameTime

        if(frameTime > targetFrameTime * 1.18)
        {
            this.performance.slowWindows++
            this.performance.fastWindows = 0

            if(this.performance.slowWindows >= 2 && this.renderScale > profile.renderScaleMin)
            {
                this.renderScale = Math.max(profile.renderScaleMin, this.renderScale - 0.045)
                this.performance.slowWindows = 0
                this.applyPixelRatio()
            }

            return
        }

        if(frameTime < targetFrameTime * 0.72)
        {
            this.performance.fastWindows++
            this.performance.slowWindows = 0

            if(this.performance.fastWindows >= 3 && this.renderScale < profile.renderScaleMax)
            {
                this.renderScale = Math.min(profile.renderScaleMax, this.renderScale + 0.03)
                this.performance.fastWindows = 0
                this.applyPixelRatio()
            }

            return
        }

        this.performance.slowWindows = 0
        this.performance.fastWindows = 0
    }

    applyTextureQuality()
    {
        if(!this.textureQualityDirty || !this.game.resources)
            return

        const profile = this.game.quality.getProfile()
        const maxAnisotropy = this.renderer.getMaxAnisotropy?.() ?? this.renderer.capabilities?.getMaxAnisotropy?.() ?? profile.textureAnisotropy
        const anisotropy = Math.max(1, Math.min(profile.textureAnisotropy, maxAnisotropy))
        const visited = new Set()

        const applyTexture = (texture) =>
        {
            if(!texture?.isTexture || visited.has(texture))
                return

            visited.add(texture)

            if(texture.anisotropy !== anisotropy)
            {
                texture.anisotropy = anisotropy
                texture.needsUpdate = true
            }
        }

        const applyMaterial = (material) =>
        {
            const materials = Array.isArray(material) ? material : [ material ]

            for(const item of materials)
            {
                if(!item)
                    continue

                for(const value of Object.values(item))
                    applyTexture(value)
            }
        }

        for(const resource of Object.values(this.game.resources))
        {
            applyTexture(resource)

            resource?.scene?.traverse((child) =>
            {
                if(child.isMesh)
                    applyMaterial(child.material)
            })
        }

        this.textureQualityDirty = false
    }

    setStats()
    {
        if(!location.hash.match(/stats/i)) return
        this.stats = { feed: {} }
        this.stats.update = () =>
        {
            this.stats.feed.drawCalls = this.renderer.info.render.drawCalls.toLocaleString()
            this.stats.feed.triangles = this.renderer.info.render.triangles.toLocaleString()
            this.stats.feed.geometries = this.renderer.info.memory.geometries.toLocaleString()
            this.stats.feed.textures = this.renderer.info.memory.textures.toLocaleString()
            this.stats.feed.renderScale = this.renderScale.toFixed(2)
            this.stats.feed.pixelRatio = this.activePixelRatio.toFixed(2)
        }
        this.stats.update()
        if(this.game.debug.active)
        {
            const debugPanel = this.debugPanel.addFolder({ title: 'Stats', expanded: true })
            for(const feedName in this.stats.feed)
                debugPanel.addBinding(this.stats.feed, feedName, { readonly: true })
        }
    }

    resize()
    {
        this.renderer.setSize(Math.max(1, this.game.viewport.width), Math.max(1, this.game.viewport.height))
        this.activePixelRatio = 0
        this.applyPixelRatio()
    }

    shouldRender()
    {
        if(!this.frameLimit)
            return true

        // Use a time accumulator rather than a simple elapsed threshold. This
        // gives correct fractional pacing such as 45 FPS on a 60 Hz display
        // (instead of accidentally falling to 30 FPS), while game/physics ticks
        // continue independently from the render cap.
        const timestamp = performance.now()
        const interval = 1000 / this.frameLimit

        if(!Number.isFinite(this.lastRenderTimestamp) || this.lastRenderTimestamp < 0)
        {
            this.lastRenderTimestamp = timestamp
            this.frameAccumulator = interval
            return true
        }

        const elapsed = clamp(timestamp - this.lastRenderTimestamp, 0, 250)
        this.lastRenderTimestamp = timestamp
        this.frameAccumulator = Math.min(interval * 1.5, this.frameAccumulator + elapsed)

        if(this.frameAccumulator + 0.1 < interval)
            return false

        this.frameAccumulator -= interval
        return true
    }

    render()
    {
        if(!this.shouldRender())
            return

        this.applyTextureQuality()

        if(this.usePostprocessing)
            this.postProcessing.render()
        else
            this.renderer.render(this.game.scene, this.game.view.camera)

        if(this.stats) this.stats.update()
        if(this.game.monitoring?.stats)
        {
            this.game.rendering.renderer.resolveTimestampsAsync(THREE.TimestampQuery.RENDER)
            this.game.monitoring.stats.update()
        }
    }
}
