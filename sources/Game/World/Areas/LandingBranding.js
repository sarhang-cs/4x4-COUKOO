import * as THREE from 'three/webgpu'
import { color } from 'three/tsl'
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js'
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js'
import helvetikerBoldFont from 'three/examples/fonts/helvetiker_bold.typeface.json'
import { Game } from '../../Game.js'
import { MeshDefaultMaterial } from '../../Materials/MeshDefaultMaterial.js'

const FONT = new FontLoader().parse(helvetikerBoldFont)

export class LandingBranding
{
    constructor(options = {})
    {
        this.game = Game.getInstance()
        this.references = options.references
        this.hideables = options.hideables

        this.setLetterMaterial()
        this.setKurdistanLabel()
    }

    setLetterMaterial()
    {
        this.letterMaterial = new MeshDefaultMaterial({
            colorNode: color('#6f78ff'),
            hasWater: false,
            hasLightBounce: true,
            hasReveal: true
        })

        const letters = this.references.items.get('letters')

        for(const letter of letters)
            letter.material = this.letterMaterial
    }

    setKurdistanLabel()
    {
        const letters = [...this.references.items.get('letters')]
        const firstLetter = letters[0]
        const lastLetter = letters.at(- 1)

        const center = firstLetter.position.clone().add(lastLetter.position).multiplyScalar(0.5)

        const geometry = new TextGeometry('KURDISTAN', {
            font: FONT,
            size: 0.55,
            depth: 0.12,
            curveSegments: 8,
            bevelEnabled: true,
            bevelThickness: 0.025,
            bevelSize: 0.018,
            bevelOffset: 0,
            bevelSegments: 3
        })

        geometry.computeBoundingBox()

        const geometryCenter = new THREE.Vector3()
        geometry.boundingBox.getCenter(geometryCenter)
        geometry.translate(- geometryCenter.x, - geometryCenter.y, - geometryCenter.z)

        this.labelMaterial = new MeshDefaultMaterial({
            colorNode: color('#9d9cff'),
            hasWater: false,
            hasLightBounce: true,
            hasReveal: true
        })

        this.label = new THREE.Mesh(geometry, this.labelMaterial)
        this.label.name = 'landingKurdistanLabel'
        this.label.position.copy(center)
        this.label.position.y += 1.55
        this.label.quaternion.copy(firstLetter.quaternion)
        this.label.castShadow = true
        this.label.receiveShadow = true
        this.label.frustumCulled = false

        this.game.scene.add(this.label)
        this.hideables.push(this.label)
    }
}
