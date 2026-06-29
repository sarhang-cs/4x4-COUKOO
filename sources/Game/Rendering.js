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
        this.isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
        this.isWebGLFallback = false
        this.usePostprocessing = true
        this.pixelRatioLimit = 2

        if(this.game.debug.active)
        {
            this.debugPanel = this.game.debug.panel.addFolder({
                title: '📸 Rendering',
                expanded: false,
            })
        }
    }

    start()
    {
        this.setStats()

        this.game.ticker.events.on('tick', () =>
        {
            this.render()
        }, 998)

        this.game.viewport.events.on('change', () =>
        {
            this.resize()
        })
    }

    async setRenderer()
    {
        const supportsWebGPU = typeof navigator.gpu !== 'undefined'

        this.renderer = new THREE.WebGPURenderer({
            canvas: this.game.canvasElement,
            powerPreference: 'high-performance',
            forceWebGL: !supportsWebGPU,
            antialias: supportsWebGPU && !this.isMobile && this.game.viewport.pixelRatio < 2
        })
        this.renderer.setSize(this.game.viewport.width, this.game.viewport.height)
        this.renderer.sortObjects = false

        this.renderer.domElement.classList.add('experience')
        this.renderer.shadowMap.enabled = true
        this.renderer.setOpaqueSort((a, b) => a.renderOrder - b.renderOrder)
        this.renderer.setTransparentSort((a, b) => a.renderOrder - b.renderOrder)

        if(location.hash.match(/inspector/i))
            this.renderer.inspector = new Inspector()

        this.renderer.setAnimationLoop((elapsedTime) => { this.game.ticker.update(elapsedTime) })

        await this.renderer.init()

        this.isWebGLFallback = this.renderer.backend.isWebGLBackend
        this.pixelRatioLimit = this.isWebGLFallback ? 1 : (this.isMobile ? 1.25 : 2)
        this.applyPixelRatio()

        return this.renderer
    }

    applyPixelRatio()
    {
        this.renderer.setPixelRatio(Math.min(this.game.viewport.pixelRatio, this.pixelRatioLimit))
    }

    setPostprocessing()
    {
        this.usePostprocessing = !this.isWebGLFallback
        if(!this.usePostprocessing)
            return

        this.postProcessing = new THREE.RenderPipeline(this.renderer)

        const scenePass = pass(this.game.scene, this.game.view.camera)
        const scenePassColor = scenePass.getTextureNode('output')

        this.bloomPass = bloom(scenePassColor)
        this.bloomPass._nMips = this.game.quality.level === 0 ? 5 : 2
        this.bloomPass.threshold.value = 1
        this.bloomPass.strength.value = 0.25
        this.bloomPass.smoothWidth.value = 1

        this.cheapDOFPass = cheapDOF(renderOutput(scenePass))

        const qualityChange = (level) =>
        {
            if(level === 0)
                this.postProcessing.outputNode = this.cheapDOFPass.add(this.bloomPass)
            else
                this.postProcessing.outputNode = scenePassColor.add(this.bloomPass)

            this.postProcessing.needsUpdate = true
        }
        qualityChange(this.game.quality.level)
        this.game.quality.events.on('change', qualityChange)

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

    setStats()
    {
        if(!location.hash.match(/stats/i))
            return

        this.stats = {}
        this.stats.feed = {}
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

    async render()
    {
        if(this.usePostprocessing)
            this.postProcessing.render()
        else
            this.renderer.render(this.game.scene, this.game.view.camera)

        if(this.stats)
            this.stats.update()

        if(this.game.monitoring?.stats)
        {
            this.game.rendering.renderer.resolveTimestampsAsync(THREE.TimestampQuery.RENDER)
            this.game.monitoring.stats.update()
        }
    }
}
