import * as THREE from 'three'
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js'
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js'
import helvetikerBoldFont from 'three/examples/fonts/helvetiker_bold.typeface.json'

const LANDING_NAME = 'SARHANG'
const LETTER_GAP = 0.19
const GEOMETRY_PADDING = 0.08
const FONT = new FontLoader().parse(helvetikerBoldFont)

const getLetterTemplates = (model) =>
{
    return model.children.filter((_child) => _child.name.startsWith('refLettersPhysicalDynamic'))
}

const getColliderScale = (mesh) =>
{
    const collider = mesh.children.find((_child) => _child.name.match(/^cuboid/i))

    if(!collider)
        return new THREE.Vector3(1, 1, 1)

    return collider.scale.clone()
}

const createLetterGeometry = (character, scaleFactor, targetDepth) =>
{
    const geometry = new TextGeometry(character, {
        font: FONT,
        size: 1,
        depth: targetDepth,
        curveSegments: 8,
        bevelEnabled: true,
        bevelThickness: 0.04,
        bevelSize: 0.035,
        bevelOffset: 0,
        bevelSegments: 4
    })

    geometry.scale(scaleFactor, scaleFactor, scaleFactor)
    geometry.computeBoundingBox()

    const center = new THREE.Vector3()
    geometry.boundingBox.getCenter(center)
    geometry.translate(- center.x, - center.y, - center.z)
    geometry.computeBoundingBox()

    return geometry
}

const createLetterMesh = (geometry, material, quaternion, position, colliderScale, userData, index) =>
{
    const letter = new THREE.Mesh(geometry, material)
    letter.name = `refLettersPhysicalDynamic${String(index).padStart(3, '0')}`
    letter.position.copy(position)
    letter.quaternion.copy(quaternion)
    letter.userData = { ...userData }

    const cuboid = new THREE.Object3D()
    cuboid.name = `cuboid${String(index).padStart(3, '0')}`
    cuboid.scale.copy(colliderScale)
    letter.add(cuboid)

    return letter
}

export const prepareLandingName = (model) =>
{
    const templates = getLetterTemplates(model)

    if(templates.length === 0)
        return

    const templateMaterial = templates[0].material
    const templateQuaternion = templates[0].quaternion.clone()
    const templateUserData = { ...templates[0].userData }
    const templateScales = templates.map(getColliderScale)
    const averageColliderScale = templateScales.reduce((result, scale) => result.add(scale), new THREE.Vector3()).divideScalar(templateScales.length)

    const direction = templates.at(- 1).position.clone().sub(templates[0].position)
    direction.y = 0
    direction.normalize()

    const lateralDirection = new THREE.Vector3(- direction.z, 0, direction.x)
    const lateralOffset = templates.reduce((result, template) => result + lateralDirection.dot(template.position), 0) / templates.length
    const averageY = templates.reduce((result, template) => result + template.position.y, 0) / templates.length

    const originalExtents = templates
        .map((template, index) => ({
            projection: direction.dot(template.position),
            width: templateScales[index].x
        }))
        .sort((a, b) => a.projection - b.projection)

    const originalMin = Math.min(...originalExtents.map(({ projection, width }) => projection - width * 0.5))
    const originalMax = Math.max(...originalExtents.map(({ projection, width }) => projection + width * 0.5))
    const originalCenter = (originalMin + originalMax) * 0.5

    const baseGeometry = createLetterGeometry('H', 1, averageColliderScale.z * 0.8)
    const baseSize = new THREE.Vector3()
    baseGeometry.boundingBox.getSize(baseSize)
    const scaleFactor = averageColliderScale.y / baseSize.y
    baseGeometry.dispose()

    const letters = LANDING_NAME.split('')
    const letterData = letters.map((letter) =>
    {
        const geometry = createLetterGeometry(letter, scaleFactor, averageColliderScale.z * 0.8)
        const size = new THREE.Vector3()
        geometry.boundingBox.getSize(size)

        return {
            letter,
            geometry,
            size
        }
    })

    const totalWidth = letterData.reduce((result, item) => result + item.size.x, 0) + LETTER_GAP * Math.max(letterData.length - 1, 0)
    let cursor = originalCenter - totalWidth * 0.5

    for(const template of templates)
    {
        if(template.geometry)
            template.geometry.dispose()

        template.removeFromParent()
    }

    for(const [index, item] of letterData.entries())
    {
        const projectedCenter = cursor + item.size.x * 0.5
        const position = direction.clone().multiplyScalar(projectedCenter)
        position.add(lateralDirection.clone().multiplyScalar(lateralOffset))
        position.y = averageY

        const colliderScale = new THREE.Vector3(
            item.size.x + GEOMETRY_PADDING,
            item.size.y + GEOMETRY_PADDING,
            Math.max(item.size.z + GEOMETRY_PADDING, averageColliderScale.z)
        )

        const letterMesh = createLetterMesh(
            item.geometry,
            templateMaterial,
            templateQuaternion,
            position,
            colliderScale,
            templateUserData,
            index + 10
        )

        model.add(letterMesh)

        cursor += item.size.x + LETTER_GAP
    }
}
