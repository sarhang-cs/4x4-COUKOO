import * as THREE from 'three/webgpu'
import { Game } from '../../Game.js'
import { clamp, lerp, remapClamp } from '../../utilities/maths.js'

const FLAG_SIZE = {
    width: 1.28,
    height: 0.82,
    segmentsX: 20,
    segmentsY: 12,
}

const POLE = {
    radius: 0.052,
    height: 2.35,
    baseRadius: 0.18,
    baseHeight: 0.12,
    finialRadius: 0.075,
}

const COLOR_HELPERS = {
    dry: new THREE.Color(0xffffff),
    wet: new THREE.Color('#c7d0e2'),
    storm: new THREE.Color('#bca3ff'),
}

const getCycleDistance = (a, b) =>
{
    const delta = Math.abs(a - b)
    return Math.min(delta, 1 - delta)
}

export class LandingFlag
{
    constructor(options = {})
    {
        this.game = Game.getInstance()
        this.references = options.references
        this.hideables = options.hideables

        this.setAnchor()
        this.setAudio()
        this.setTexture()
        this.setVisual()
        this.setPhysics()
        this.setVisibilityEvents()
        this.setUpdates()
    }

    setAnchor()
    {
        const anchor = this.references.items.get('landingFlagAnchor')?.[0]

        if(!anchor)
            throw new Error('Landing flag anchor is missing from areas.glb')

        this.anchor = {
            position: anchor.position.clone(),
            rotation: anchor.quaternion.clone()
        }
    }

    setAudio()
    {
        this.lightBreakSound = this.game.audio.register({
            group: 'landingFlagLightBreak',
            path: 'sounds/clicks/Source Metal Clicks Delicate Light Sharp Clip Mid 07.mp3',
            autoplay: false,
            volume: 0.28,
            antiSpam: 0.15,
            positions: new THREE.Vector3(),
            distanceFade: 14,
            onPlay: (item, force, position) =>
            {
                item.positions[0].copy(position)
                item.volume = 0.18 + Math.pow(remapClamp(force, 2, 20, 0, 1), 2) * 0.2
                item.rate = 0.88 + Math.random() * 0.18
            }
        })
    }

    setTexture()
    {
        const canvas = document.createElement('canvas')
        canvas.width = 512
        canvas.height = 320
        const context = canvas.getContext('2d')

        const stripeHeight = canvas.height / 3
        context.fillStyle = '#d61e28'
        context.fillRect(0, 0, canvas.width, stripeHeight)
        context.fillStyle = '#ffffff'
        context.fillRect(0, stripeHeight, canvas.width, stripeHeight)
        context.fillStyle = '#188548'
        context.fillRect(0, stripeHeight * 2, canvas.width, stripeHeight)

        const centerX = canvas.width * 0.5
        const centerY = canvas.height * 0.5
        const sunRadius = canvas.height * 0.11
        const rays = 21

        context.save()
        context.translate(centerX, centerY)
        context.strokeStyle = '#f4c537'
        context.lineWidth = canvas.height * 0.02
        context.lineCap = 'round'

        for(let i = 0; i < rays; i++)
        {
            context.save()
            context.rotate((Math.PI * 2 * i) / rays)
            context.beginPath()
            context.moveTo(0, - sunRadius - canvas.height * 0.015)
            context.lineTo(0, - sunRadius - canvas.height * 0.11)
            context.stroke()
            context.restore()
        }

        context.fillStyle = '#f4c537'
        context.beginPath()
        context.arc(0, 0, sunRadius, 0, Math.PI * 2)
        context.fill()

        context.fillStyle = '#f7d55b'
        context.beginPath()
        context.arc(0, 0, sunRadius * 0.65, 0, Math.PI * 2)
        context.fill()
        context.restore()

        this.texture = new THREE.CanvasTexture(canvas)
        this.texture.colorSpace = THREE.SRGBColorSpace
        this.texture.anisotropy = 4
    }

    setVisual()
    {
        this.group = new THREE.Group()
        this.group.name = 'landingFlag'

        const goldMaterial = new THREE.MeshPhysicalMaterial({
            color: '#d7b54a',
            roughness: 0.18,
            metalness: 1,
            clearcoat: 0.25,
            clearcoatRoughness: 0.2,
        })

        this.clothMaterial = new THREE.MeshPhysicalMaterial({
            map: this.texture,
            color: '#ffffff',
            side: THREE.DoubleSide,
            roughness: 0.9,
            metalness: 0,
            clearcoat: 0.08,
            clearcoatRoughness: 0.3,
            emissive: '#ffd6a6',
            emissiveMap: this.texture,
            emissiveIntensity: 0.08,
            toneMapped: false,
        })

        const base = new THREE.Mesh(
            new THREE.CylinderGeometry(POLE.baseRadius * 0.68, POLE.baseRadius, POLE.baseHeight, 18),
            goldMaterial
        )
        base.position.y = POLE.baseHeight * 0.5
        base.castShadow = true
        base.receiveShadow = true
        this.group.add(base)

        const pole = new THREE.Mesh(
            new THREE.CylinderGeometry(POLE.radius, POLE.radius, POLE.height, 20),
            goldMaterial
        )
        pole.position.y = POLE.height * 0.5
        pole.castShadow = true
        pole.receiveShadow = true
        this.group.add(pole)

        const finial = new THREE.Mesh(
            new THREE.SphereGeometry(POLE.finialRadius, 18, 18),
            goldMaterial
        )
        finial.position.y = POLE.height + POLE.finialRadius * 1.1
        finial.castShadow = true
        finial.receiveShadow = true
        this.group.add(finial)

        this.clothGeometry = new THREE.PlaneGeometry(FLAG_SIZE.width, FLAG_SIZE.height, FLAG_SIZE.segmentsX, FLAG_SIZE.segmentsY)
        this.clothOffset = new THREE.Vector3(POLE.radius * 1.15 + FLAG_SIZE.width * 0.5, POLE.height - FLAG_SIZE.height * 0.42, 0)
        this.clothGeometry.translate(this.clothOffset.x, this.clothOffset.y, this.clothOffset.z)
        this.basePositions = Float32Array.from(this.clothGeometry.attributes.position.array)

        this.cloth = new THREE.Mesh(this.clothGeometry, this.clothMaterial)
        this.cloth.castShadow = true
        this.cloth.receiveShadow = true
        this.group.add(this.cloth)

        this.glowLight = new THREE.PointLight('#ffd6a6', 0.08, 4.8, 2)
        this.glowLight.castShadow = false
        this.glowLight.position.set(this.clothOffset.x + FLAG_SIZE.width * 0.12, this.clothOffset.y + FLAG_SIZE.height * 0.02, 0.24)
        this.group.add(this.glowLight)
    }

    setPhysics()
    {
        this.object = this.game.objects.add(
            {
                model: this.group,
                updateMaterials: false,
                castShadow: false,
                receiveShadow: false,
                parent: this.game.scene,
            },
            {
                type: 'fixed',
                position: this.anchor.position,
                rotation: this.anchor.rotation,
                friction: 0.9,
                colliders: [
                    {
                        shape: 'cuboid',
                        parameters: [ POLE.baseRadius * 0.95, POLE.baseHeight * 0.55, POLE.baseRadius * 0.95 ],
                        position: new THREE.Vector3(0, POLE.baseHeight * 0.5, 0),
                        category: 'object'
                    },
                    {
                        shape: 'cuboid',
                        parameters: [ POLE.radius * 1.25, POLE.height * 0.5, POLE.radius * 1.25 ],
                        position: new THREE.Vector3(0, POLE.height * 0.5, 0),
                        category: 'object'
                    },
                    {
                        shape: 'cuboid',
                        parameters: [ FLAG_SIZE.width * 0.46, FLAG_SIZE.height * 0.42, 0.08 ],
                        position: new THREE.Vector3(this.clothOffset.x, this.clothOffset.y, 0),
                        category: 'object'
                    }
                ],
                contactThreshold: 2,
                onCollision: (force, position) =>
                {
                    this.game.audio.groups.get('hitMetal').playRandomNext(force, position)

                    if(force > 4)
                        this.lightBreakSound.play(force, position)
                }
            }
        )

        this.hideables.push(this.object.visual.object3D)
    }

    setVisibilityEvents()
    {
        const setVisible = (visible) =>
        {
            this.object.visual.object3D.visible = visible
        }

        this.game.menu.events.on('open', () => setVisible(false))
        this.game.menu.events.on('close', () => setVisible(true))
        this.game.modals.events.on('open', () => setVisible(false))
        this.game.modals.events.on('close', () => setVisible(true))
    }

    setUpdates()
    {
        this.scratch = {
            glowColor: new THREE.Color(),
            materialColor: new THREE.Color(),
            warmGlowColor: new THREE.Color('#ffe6bc'),
        }
        this.clothFrame = 0
    }

    update()
    {
        this.updateCloth()
        this.updateLighting()
        this.updateMaterial()
    }

    updateCloth()
    {
        const time = this.game.ticker.elapsedScaled
        const windStrength = remapClamp(this.game.weather.wind.value, 0, 1, 0.35, 1.25)
        const rainStrength = Math.max(0, this.game.weather.rain.value)
        const swayAmplitude = 0.08 + windStrength * 0.16
        const flutterAmplitude = 0.02 + windStrength * 0.05
        const rainSag = rainStrength * 0.05

        const positionAttribute = this.clothGeometry.attributes.position
        const positions = positionAttribute.array

        for(let i = 0; i < positions.length; i += 3)
        {
            const baseX = this.basePositions[i + 0]
            const baseY = this.basePositions[i + 1]
            const baseZ = this.basePositions[i + 2]

            const widthRatio = clamp((baseX - (this.clothOffset.x - FLAG_SIZE.width * 0.5)) / FLAG_SIZE.width, 0, 1)
            const heightRatio = clamp((baseY - (this.clothOffset.y - FLAG_SIZE.height * 0.5)) / FLAG_SIZE.height, 0, 1)
            const anchored = Math.pow(widthRatio, 1.2)

            const mainWave = Math.sin(time * (2.15 + windStrength * 0.4) + widthRatio * 4.8 - heightRatio * 1.2)
            const secondaryWave = Math.sin(time * 3.8 + widthRatio * 8.5 + heightRatio * 1.7)
            const flutter = Math.sin(time * (8.2 + windStrength * 2.5) + widthRatio * 14.0) * 0.5

            positions[i + 0] = baseX + anchored * (secondaryWave * 0.03 + windStrength * 0.04)
            positions[i + 1] = baseY - anchored * (0.05 + rainSag) + anchored * (mainWave * 0.02)
            positions[i + 2] = baseZ + anchored * (mainWave * swayAmplitude + secondaryWave * 0.05 + flutter * flutterAmplitude)
        }

        positionAttribute.needsUpdate = true

        this.clothFrame++
        if(this.clothFrame % 2 === 0)
        {
            this.clothGeometry.computeVertexNormals()
            this.clothGeometry.attributes.normal.needsUpdate = true
        }
    }

    updateLighting()
    {
        const elapsed = this.game.ticker.elapsedScaled
        const progress = this.game.dayCycles.progress
        const nightFactor = this.game.dayCycles.intervalEvents.get('night').inInterval ? 1 : 0
        const duskFactor = 1 - clamp(getCycleDistance(progress, 0.25) / 0.12, 0, 1)
        const dawnFactor = 1 - clamp(getCycleDistance(progress, 0.8) / 0.12, 0, 1)
        const transitionFactor = Math.max(duskFactor, dawnFactor)
        const stormFactor = Math.max(0, this.game.weather.electricField.value)
        const rainFactor = Math.max(0, this.game.weather.rain.value)
        const flicker = (0.5 + Math.sin(elapsed * 9.0) * 0.5) * stormFactor * 0.4

        this.scratch.glowColor.copy(this.game.dayCycles.properties.lightColor.value)
        this.scratch.glowColor.lerp(this.game.dayCycles.properties.revealColor.value, 0.45 + stormFactor * 0.15)

        const emissiveIntensity = 0.08 + transitionFactor * 0.62 + nightFactor * 1.18 + rainFactor * 0.14 + stormFactor * 0.42 + flicker
        const lightIntensity = 0.04 + transitionFactor * 0.68 + nightFactor * 1.7 + stormFactor * 0.95 + flicker * 1.6

        this.scratch.glowColor.lerp(this.scratch.warmGlowColor, 0.3)
        this.clothMaterial.emissive.copy(this.scratch.glowColor)
        this.clothMaterial.emissiveIntensity = emissiveIntensity

        this.glowLight.color.copy(this.scratch.glowColor)
        this.glowLight.intensity = lightIntensity
        this.glowLight.distance = lerp(2.8, 5.2, clamp(lightIntensity / 2.8, 0, 1))
        this.glowLight.decay = 1.75
    }

    updateMaterial()
    {
        const rainFactor = clamp(this.game.weather.rain.value, 0, 1)
        const stormFactor = clamp(this.game.weather.electricField.value, 0, 1)
        const sunlight = 1 - clamp(remapClamp(this.game.dayCycles.progress, 0.25, 0.5, 1, 0), 0, 1)

        this.clothMaterial.roughness = lerp(0.92, 0.52, rainFactor)
        this.clothMaterial.clearcoat = lerp(0.08, 0.42, rainFactor)
        this.clothMaterial.clearcoatRoughness = lerp(0.32, 0.14, rainFactor)

        this.scratch.materialColor.copy(COLOR_HELPERS.dry)
        this.scratch.materialColor.lerp(COLOR_HELPERS.wet, rainFactor * 0.9)
        this.scratch.materialColor.lerp(COLOR_HELPERS.storm, stormFactor * 0.2)
        this.scratch.materialColor.multiplyScalar(lerp(0.95, 1.07, sunlight))
        this.clothMaterial.color.copy(this.scratch.materialColor)
    }
}
