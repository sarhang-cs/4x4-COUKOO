import { color, float, mix, positionWorld, rangeFogFactor, screenCoordinate, uniform, vec2, vec3, viewportUV } from 'three/tsl'
import { Game } from './Game.js'

export class Fog
{
    constructor()
    {
        this.game = Game.getInstance()
        
        this.colorA = uniform(color('#ff0000'))
        this.colorB = uniform(color('#0000ff'))
        this.radialCenter = uniform(vec2(0, 0))
        this.radialStart = uniform(0)
        this.radialEnd = uniform(1)

        const colorMix = vec2(viewportUV.xy).sub(this.radialCenter).length().smoothstep(this.radialStart, this.radialEnd)
        this.color = mix(this.colorA, this.colorB, colorMix)
        this.game.scene.backgroundNode = this.color

        this.near = uniform(this.game.view.optimalArea.nearDistance)
        this.far = uniform(this.game.view.optimalArea.farDistance)
        this.strength = rangeFogFactor(this.near, this.far)
        // this.strength = float(1)

        this.game.ticker.events.on('tick', () =>
        {
            this.update()
        }, 10)

        // Debug
        if(this.game.debug.active)
        {
            const debugPanel = this.game.debug.panel.addFolder({
                title: '☁️ Fog',
                expanded: false,
            })
            debugPanel.addBinding(this.radialCenter, 'value', { value: 'offset', min: 0, max: 1 })
        }
    }

    update()
    {
        // Apply day cycles values
        const amplitude = this.game.view.optimalArea.farDistance - this.game.view.optimalArea.nearDistance
        const profile = this.game.quality.getProfile()
        const framePolicy = this.game.quality.getFrameRateRenderPolicy(profile.level)
        const visibilityMultiplier = Number(profile.visibilityMultiplier ?? 1) * (framePolicy.targetFps >= 120 ? 0.96 : framePolicy.targetFps >= 90 ? 0.98 : 1)
        const baseNear = this.game.view.optimalArea.nearDistance + this.game.dayCycles.properties.fogNearRatio.value * amplitude
        const baseFar = this.game.view.optimalArea.nearDistance + this.game.dayCycles.properties.fogFarRatio.value * amplitude
        this.colorA.value.copy(this.game.dayCycles.properties.fogColorA.value)
        this.colorB.value.copy(this.game.dayCycles.properties.fogColorB.value)
        this.near.value = baseNear
        // Medium and High keep a longer readable view of the world while Low
        // retains its smaller fill-rate budget.
        this.far.value = baseNear + Math.max(1, baseFar - baseNear) * visibilityMultiplier
    }
}