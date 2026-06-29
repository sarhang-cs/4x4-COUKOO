import * as THREE from 'three/webgpu'
import { pass, renderOutput } from 'three/tsl'
import { bloom } from 'three/addons/tsl/display/BloomNode.js'
import { Game } from './Game.js'
import { cheapDOF } from './Passes/cheapDOF.js'
import { Inspector } from 'three/addons/inspector/Inspector.js'

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
        this.textureQualityDirty = true

        if(this.game.debug.active)
        {
            this.debugPanel = this.game.debug.panel.addFolder({ title: '📸 Rendering', expanded: false })
        }
    }

    start()
    {
        this.setStats()
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
        this.renderer.setOpaqueSort((a, b) => a.renderOrder - b.renderOrder)
        this.renderer.setTransparentSort((a, b) => a.renderOrder - b.renderOrder)

        if(location.hash.match(/inspector/i))
            this.renderer.inspector = new Inspector()

        this.renderer.setAnimationLoop((elapsedTime) => this.game.ticker.update(elapsedTime))
        await this.renderer.init()

        this.isWebGLFallback = this.renderer.backend.isWebGLBackend
        this.applyQualityProfile()
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
        this.pixelRatioLimit = profile.pixelRatioLimit
        this.pixelRatioFloor = profile.pixelRatioFloor
        this.textureQualityDirty = true
        if(this.renderer)
            this.applyPixelRatio()
        if(!this.bloomPass || !this.postProcessing)
            return

        this.bloomPass._nMips = profile.bloomMips
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
        const nativePixelRatio = this.game.viewport.pixelRatioPure ?? this.game.viewport.pixelRatio
        const pixelRatio = Math.min(Math.max(nativePixelRatio, this.pixelRatioFloor), this.pixelRatioLimit)
        this.renderer.setPixelRatio(Math.max(0.75, pixelRatio))
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
        this.renderer.setSize(this.game.viewport.width, this.game.viewport.height)
        this.applyPixelRatio()
    }

    render()
    {
        this.applyTextureQuality()
        this.postProcessing.render()
        if(this.stats) this.stats.update()
        if(this.game.monitoring?.stats)
        {
            this.game.rendering.renderer.resolveTimestampsAsync(THREE.TimestampQuery.RENDER)
            this.game.monitoring.stats.update()
        }
    }
}
