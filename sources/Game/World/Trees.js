import * as THREE from 'three/webgpu'
import { Game } from '../Game.js'
import { Foliage } from './Foliage.js'
import { color, uniform } from 'three/tsl'

export class Trees
{
    constructor(name, visual, references, colorA, colorB)
    {
        this.game = Game.getInstance()

        // Debug
        if(this.game.debug.active)
        {
            this.debugPanel = this.game.debug.panel.addFolder({
                title: `🌳 ${name}`,
                expanded: false,
            })
        }

        this.visual = visual
        this.references = references
        this.colorA = colorA
        this.colorB = colorB
        this.baseColorA = new THREE.Color(colorA)
        this.baseColorB = new THREE.Color(colorB)
        this.seasonColorA = new THREE.Color()
        this.seasonColorB = new THREE.Color()
        this.lastSeasonKey = null

        this.setModelParts()
        this.setBodies()
        this.setLeaves()
        this.setPhysical()

        this.game.ticker.events.on('tick', () => this.updateSeason(), 11)
    }

    setModelParts()
    {
        this.modelParts = {}
        this.modelParts.leaves = []
        this.modelParts.body = null
        
        this.visual.traverse((_child) =>
        {
            if(_child.isMesh)
            {
                if(_child.name.startsWith('treeLeaves'))
                    this.modelParts.leaves.push(_child)
                else if(_child.name.startsWith('treeBody'))
                    this.modelParts.body = _child
            }
        })
    }

    setBodies()
    {
        this.game.materials.updateObject(this.modelParts.body)
        this.bodies = new THREE.InstancedMesh(this.modelParts.body.geometry, this.modelParts.body.material, this.references.length)
        this.bodies.instanceMatrix.setUsage(THREE.StaticDrawUsage)
        this.bodies.castShadow = true
        this.bodies.receiveShadow = true
        
        let i = 0
        for(const treeReference of this.references)
        {
            this.bodies.setMatrixAt(i, treeReference.matrix)
            i++
        }

        this.game.scene.add(this.bodies)
    }

    setLeaves()
    {
        const references = []
        
        for(const treeReference of this.references)
        {
            for(const leaves of this.modelParts.leaves)
            {
                const finalMatrix = leaves.matrix.clone().premultiply(treeReference.matrixWorld)
                const reference = new THREE.Object3D()
                reference.applyMatrix4(finalMatrix)

                references.push(reference)
            }
        }

        this.leavesColorANode = uniform(color(this.colorA))
        this.leavesColorBNode = uniform(color(this.colorB))
        this.leaves = new Foliage(references, this.leavesColorANode, this.leavesColorBNode, true)

        // Debug
        if(this.game.debug.active)
        {
            this.game.debug.addThreeColorBinding(this.debugPanel, this.leavesColorANode.value, 'leavesColorA')
            this.game.debug.addThreeColorBinding(this.debugPanel, this.leavesColorBNode.value, 'leavesColorB')
            this.debugPanel.addBinding(this.leaves.material.shadowOffset, 'value', { label: 'shadowOffset', min: 0, max: 2, step: 0.001 })
            this.debugPanel.addBinding(this.leaves.material.threshold, 'value', { label: 'threshold', min: 0, max: 1, step: 0.001 })
            this.debugPanel.addBinding(this.leaves.material.seeThroughEdgeMin, 'value', { label: 'seeThroughEdgeMin', min: 0, max: 1, step: 0.001 })
            this.debugPanel.addBinding(this.leaves.material.seeThroughEdgeMax, 'value', { label: 'seeThroughEdgeMax', min: 0, max: 1, step: 0.001 })
        }
    }

    setPhysical()
    {
        for(const treeReference of this.references)
        {
            this.game.objects.add(
                null,
                {
                    type: 'fixed',
                    position: treeReference.position.add(new THREE.Vector3(0, 2.5, 0)),
                    rotation: treeReference.quaternion,
                    friction: 0.7,
                    sleeping: true,
                    colliders: [ { shape: 'cylinder', parameters: [ 2.5, 0.15 ], category: 'object' } ],
                    onCollision: (force, position) =>
                    {
                        this.game.audio.groups.get('hitDefault').playRandomNext(force, position)
                    }
                }
            )
        }
    }

    updateSeason()
    {
        const season = this.game.weather?.getSeasonKey?.() ?? 'summer'
        if(season === this.lastSeasonKey)
            return

        this.lastSeasonKey = season

        const profile = {
            spring: { colorA: '#8fd95a', colorB: '#d7f08b', strength: 0.32 },
            summer: { colorA: '#d3ca3f', colorB: '#d9e374', strength: 0.08 },
            autumn: { colorA: '#d3542d', colorB: '#f3a23d', strength: 0.78 },
            winter: { colorA: '#b7c7d4', colorB: '#e2e7ef', strength: 0.72 },
        }[season] ?? { colorA: '#d3ca3f', colorB: '#d9e374', strength: 0.08 }

        this.seasonColorA.set(profile.colorA)
        this.seasonColorB.set(profile.colorB)
        this.leavesColorANode.value.copy(this.baseColorA).lerp(this.seasonColorA, profile.strength)
        this.leavesColorBNode.value.copy(this.baseColorB).lerp(this.seasonColorB, profile.strength)
    }
}