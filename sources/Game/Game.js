import * as THREE from 'three/webgpu'

import { Inputs } from './Inputs/Inputs.js'
import { Physics } from './Physics/Physics.js'
import { Rendering } from './Rendering.js'
import { ResourcesLoader } from './ResourcesLoader.js'
import { Ticker } from './Ticker.js'
import { Time } from './Time.js'
import { Player } from './Player.js'
import { View } from './View.js'
import { Viewport } from './Viewport.js'
import { World } from './World/World.js'
import { Tracks } from './Tracks.js'
import { Lighting } from './Ligthing.js'
import { Materials } from './Materials.js'
import { Objects } from './Objects.js'
import { Fog } from './Fog.js'
import { DayCycles } from './Cycles/DayCycles.js'
import { Weather } from './Weather.js'
import { Noises } from './Noises.js'
import { Wind } from './Wind.js'
import { Terrain } from './Terrain.js'
import { Explosions } from './Explosions.js'
import { YearCycles } from './Cycles/YearCycles.js'
import { Server } from './Server.js'
import { Modals } from './Modals.js'
import { PhysicsVehicle } from './Physics/PhysicsVehicle.js'
import { PhysicsWireframe } from './Physics/PhysicsWireframe.js'
import { Zones } from './Zones.js'
import { Overlay } from './Overlay.js'
import { Tornado } from './Tornado.js'
import { InteractivePoints } from './InteractivePoints.js'
import { Respawns } from './Respawns.js'
import { Audio } from './Audio.js'
import { ClosingManager } from './ClosingManager.js'
import { RayCursor } from './RayCursor.js'
import { Water } from './Water.js'
import { Reveal } from './Reveal.js'
import { KonamiCode } from './KonamiCode.js'
import { Achievements } from './Achievements.js'
import { Notifications } from './Notifications.js'
import { Quality } from './Quality.js'
import { Menu } from './Menu.js'
import { Title } from './Title.js'
import { PreRenderer } from './PreRenderer.js'
import { Options } from './Options.js'
import gsap from 'gsap'
import { Map } from './Map.js'
import { Save } from './Save.js'
import { Haptics } from './Haptics.js'
import { Tutorial } from './Tutorial.js'
import { Pause } from './Pause.js'
import { VisualEffects } from './VisualEffects.js'
import { Missions } from './Missions.js'
import { Garage } from './Garage.js'
import { DailyRewards } from './DailyRewards.js'
import { SocialShare } from './SocialShare.js'
import { ControllerStatus } from './ControllerStatus.js'

export class Game
{
    static getInstance()
    {
        return Game.instance
    }

    constructor(_options = {})
    {
        // Singleton
        if(Game.instance)
            return Game.instance

        Game.instance = this
        this.startupScreen = _options.startupScreen ?? window.coukooStartupScreen ?? null
        this.ready = this.init()
    }

    async init()
    {
        // Setup
        this.domElement = document.querySelector('.game')
        this.canvasElement = this.domElement.querySelector('.js-canvas')
        this.startupScreen?.setStage('Preparing the 3D engine')
        this.startupScreen?.setProgress(12)
        document.documentElement.classList.add('is-started')

        // First batch for intro
        this.scene = new THREE.Scene()
        const { Debug } = await import('./Debug.js')
        this.debug = new Debug()
        await this.debug.ready
        this.resourcesLoader = new ResourcesLoader()
        this.save = new Save()
        this.haptics = new Haptics()
        this.quality = new Quality()
        this.quality.events.on('change', (_level, _profile, details) =>
        {
            if(details?.requiresWorldReload)
                this.reloadForQualityAssets(details.assetProfile)
        })
        this.server = new Server()
        this.ticker = new Ticker()
        this.time = new Time()
        this.dayCycles = new DayCycles()
        this.yearCycles = new YearCycles()
        this.inputs = new Inputs([], [ 'intro' ])
        this.audio = new Audio()
        this.notifications = new Notifications()
        this.pwa = window.coukooPwa ?? null
        this.pwa?.attachGame(this)
        this.rayCursor = new RayCursor()
        this.viewport = new Viewport(this.domElement)
        this.modals = new Modals()
        this.menu = new Menu()
        this.rendering = new Rendering()
        await this.rendering.setRenderer()
        this.startupScreen?.setStage('Loading the starting area')
        this.startupScreen?.setProgress(18)

        // High and Medium retain the full original PNG/GLB runtime assets.
        // Low keeps the existing Phase 10 KTX/Draco variants. The selected
        // profile is read before any world resource starts loading.
        const assetProfile = this.quality.getAssetProfile()
        const compressedModelSuffix = assetProfile.modelSuffix
        const compressedTextureFormat = assetProfile.textureLoader
        const compressedTextureExtension = assetProfile.textureExtension

        const cb = '?cb=1'
        this.resources = await this.resourcesLoader.load([
            [ 'respawnsReferencesModel',    `respawns/respawnsReferences${compressedModelSuffix}.glb${cb}`, 'gltf' ],
            [ 'behindTheSceneStarsTexture', `behindTheScene/stars.${compressedTextureExtension}${cb}`,      compressedTextureFormat, (resource) => { resource.colorSpace = THREE.SRGBColorSpace; resource.minFilter = THREE.NearestFilter; resource.magFilter = THREE.NearestFilter; resource.generateMipmaps = false; resource.wrapS = THREE.RepeatWrapping; resource.wrapT = THREE.RepeatWrapping; } ],
            [ 'soundTexture',               `intro/sound.${compressedTextureExtension}${cb}`,               compressedTextureFormat, (resource) => { resource.minFilter = THREE.LinearFilter; resource.magFilter = THREE.LinearFilter; resource.generateMipmaps = false; resource.repeat.x = 0.5; } ],
            [ 'paletteTexture',             `palette.${compressedTextureExtension}${cb}`,                   compressedTextureFormat, (resource) => { resource.minFilter = THREE.NearestFilter; resource.magFilter = THREE.NearestFilter; resource.generateMipmaps = false; resource.colorSpace = THREE.SRGBColorSpace; } ],

        ], (toLoad, total) =>
        {
            this.startupScreen?.setProgress(18 + (1 - toLoad / total) * 12)
        })
        this.startupScreen?.setStage('Building the driving world')
        this.startupScreen?.setProgress(31)
        this.visualEffects = new VisualEffects()
        this.respawns = new Respawns(import.meta.env.VITE_PLAYER_SPAWN || 'landing')
        this.view = new View()
        this.rendering.setPostprocessing()
        this.rendering.start()
        this.reveal = new Reveal()
        this.noises = new Noises()
        this.weather = new Weather()
        // Options needs the weather/environment controller so the Season and
        // Weather controls always reflect live data instead of an empty shell.
        this.options = new Options()
        this.wind = new Wind()
        this.tracks = new Tracks()
        this.lighting = new Lighting()
        this.fog = new Fog()
        this.water = new Water()
        this.materials = new Materials()
        this.objects = new Objects()
        this.explosions = new Explosions()
        this.world = new World()

        // Load and init RAPIER
        const rapierPromise = import('@dimforge/rapier3d')

        // Load rest of resources
        const resourcesPromise = this.resourcesLoader.load(
            [
                [ 'foliageTexture',                        `foliage/foliageSDF.${compressedTextureExtension}${cb}`,                              compressedTextureFormat, (resource) => { resource.minFilter = THREE.NearestFilter; resource.magFilter = THREE.NearestFilter; resource.generateMipmaps = false; } ],
                [ 'bushesReferences',                      `bushes/bushesReferences${compressedModelSuffix}.glb${cb}`,                           'gltf' ],
                [ 'vehicle',                               `vehicle/default${compressedModelSuffix}.glb${cb}`,                                   'gltf' ],
                [ 'playgroundVisual',                      `playground/playgroundVisual${compressedModelSuffix}.glb${cb}`,                       'gltf' ],
                [ 'playgroundPhysical',                    `playground/playgroundPhysical${compressedModelSuffix}.glb${cb}`,                     'gltf' ],
                [ 'flowersReferencesModel',                `flowers/flowersReferences${compressedModelSuffix}.glb${cb}`,                         'gltf' ],
                [ 'bricksModel',                           `bricks/bricks${compressedModelSuffix}.glb${cb}`,                                     'gltf' ],
                [ 'fencesModel',                           `fences/fences${compressedModelSuffix}.glb${cb}`,                                     'gltf' ],
                [ 'benchesModel',                          `benches/benches${compressedModelSuffix}.glb${cb}`,                                   'gltf' ],
                [ 'explosiveCratesModel',                  `explosiveCrates/explosiveCrates${compressedModelSuffix}.glb${cb}`,                   'gltf' ],
                [ 'lanternsModel',                         `lanterns/lanterns${compressedModelSuffix}.glb${cb}`,                                 'gltf' ],
                [ 'terrainTexture',                        `terrain/terrain.${compressedTextureExtension}${cb}`,                                 compressedTextureFormat, (resource) => { resource.flipY = false; } ],
                [ 'terrainModel',                          `terrain/terrain${compressedModelSuffix}.glb${cb}`,                                   'gltf' ],
                [ 'floorSlabsTexture',                     `floor/slabs.${compressedTextureExtension}`,                                     compressedTextureFormat, (resource) => { resource.wrapS = THREE.RepeatWrapping; resource.wrapT = THREE.RepeatWrapping; resource.minFilter = THREE.LinearFilter; resource.magFilter = THREE.LinearFilter; resource.generateMipmaps = false } ],
                [ 'birchTreesVisualModel',                 `birchTrees/birchTreesVisual${compressedModelSuffix}.glb${cb}`,                       'gltf' ],
                [ 'birchTreesReferencesModel',             `birchTrees/birchTreesReferences${compressedModelSuffix}.glb${cb}`,                   'gltf' ],
                [ 'oakTreesVisualModel',                   `oakTrees/oakTreesVisual${compressedModelSuffix}.glb${cb}`,                           'gltf' ],
                [ 'oakTreesReferencesModel',               `oakTrees/oakTreesReferences${compressedModelSuffix}.glb${cb}`,                                               'gltf' ],
                [ 'cherryTreesVisualModel',                `cherryTrees/cherryTreesVisual${compressedModelSuffix}.glb${cb}`,                     'gltf' ],
                [ 'cherryTreesReferencesModel',            `cherryTrees/cherryTreesReferences${compressedModelSuffix}.glb${cb}`,                 'gltf' ],
                [ 'sceneryModel',                          `scenery/scenery${compressedModelSuffix}.glb${cb}`,                                   'gltf' ],
                [ 'areasModel',                            `areas/areas.glb${cb}`,                                                                'gltf' ],
                [ 'poleLightsModel',                       `poleLights/poleLights${compressedModelSuffix}.glb${cb}`,                             'gltf' ],
                [ 'whisperFlameTexture',                   `whispers/whisperFlame.${compressedTextureExtension}${cb}`,                           compressedTextureFormat, (resource) => { resource.minFilter = THREE.LinearFilter; resource.magFilter = THREE.LinearFilter; resource.generateMipmaps = false } ],
                [ 'satanStarTexture',                      `areas/satanStar.${compressedTextureExtension}${cb}`,                                 compressedTextureFormat, (resource) => { resource.minFilter = THREE.LinearFilter; resource.magFilter = THREE.LinearFilter; resource.generateMipmaps = false } ],
                [ 'tornadoPathReferencesModel',            `tornado/tornadoPathReferences${compressedModelSuffix}.glb${cb}`,                     'gltf' ],
                [ 'overlayPatternTexture',                 `overlay/overlayPattern.${compressedTextureExtension}${cb}`,                          compressedTextureFormat, (resource) => { resource.wrapS = THREE.RepeatWrapping; resource.wrapT = THREE.RepeatWrapping; resource.magFilter = THREE.NearestFilter; resource.minFilter = THREE.NearestFilter; resource.generateMipmaps = false } ],
                [ 'interactivePointsKeyIconCrossTexture',  `interactivePoints/interactivePointsKeyIconCross.${compressedTextureExtension}${cb}`, compressedTextureFormat, (resource) => { resource.minFilter = THREE.NearestFilter; resource.magFilter = THREE.NearestFilter; resource.generateMipmaps = false } ],
                [ 'interactivePointsKeyIconEnterTexture',  `interactivePoints/interactivePointsKeyIconEnter.${compressedTextureExtension}${cb}`, compressedTextureFormat, (resource) => { resource.minFilter = THREE.NearestFilter; resource.magFilter = THREE.NearestFilter; resource.generateMipmaps = false } ],
                [ 'interactivePointsKeyIconATexture',      `interactivePoints/interactivePointsKeyIconA.${compressedTextureExtension}${cb}`,     compressedTextureFormat, (resource) => { resource.minFilter = THREE.NearestFilter; resource.magFilter = THREE.NearestFilter; resource.generateMipmaps = false } ],
                [ 'jukeboxMusicNotes',                     `jukebox/jukeboxMusicNotes.${compressedTextureExtension}${cb}`,                       compressedTextureFormat, (resource) => { resource.minFilter = THREE.LinearFilter; resource.magFilter = THREE.LinearFilter; resource.generateMipmaps = false } ],
                [ 'achievementsGlyphsTexture',             `achievements/glyphs.${compressedTextureExtension}${cb}`,                             compressedTextureFormat, (resource) => { resource.minFilter = THREE.LinearFilter; resource.magFilter = THREE.LinearFilter; resource.generateMipmaps = false; resource.wrapS = THREE.RepeatWrapping; } ],
                [ 'careerFreelancerTexture',               `career/careerFreelancer.${compressedTextureExtension}${cb}`,                         compressedTextureFormat, (resource) => { resource.flipY = false; resource.minFilter = THREE.LinearFilter; resource.magFilter = THREE.LinearFilter; resource.generateMipmaps = false; resource.wrapS = THREE.ClampToEdgeWrapping; resource.wrapT = THREE.ClampToEdgeWrapping; } ],
                [ 'careerHeticTexture',                    `career/careerHetic.${compressedTextureExtension}${cb}`,                              compressedTextureFormat, (resource) => { resource.flipY = false; resource.minFilter = THREE.LinearFilter; resource.magFilter = THREE.LinearFilter; resource.generateMipmaps = false; resource.wrapS = THREE.ClampToEdgeWrapping; resource.wrapT = THREE.ClampToEdgeWrapping; } ],
                [ 'careerImmersiveGardenTexture',          `career/careerImmersiveGarden.${compressedTextureExtension}${cb}`,                    compressedTextureFormat, (resource) => { resource.flipY = false; resource.minFilter = THREE.LinearFilter; resource.magFilter = THREE.LinearFilter; resource.generateMipmaps = false; resource.wrapS = THREE.ClampToEdgeWrapping; resource.wrapT = THREE.ClampToEdgeWrapping; } ],
                [ 'careerIRLTeacherTexture',               `career/careerIRLTeacher.${compressedTextureExtension}${cb}`,                         compressedTextureFormat, (resource) => { resource.flipY = false; resource.minFilter = THREE.LinearFilter; resource.magFilter = THREE.LinearFilter; resource.generateMipmaps = false; resource.wrapS = THREE.ClampToEdgeWrapping; resource.wrapT = THREE.ClampToEdgeWrapping; } ],
                [ 'careerOnlineTeacherTexture',            `career/careerOnlineTeacher.${compressedTextureExtension}${cb}`,                      compressedTextureFormat, (resource) => { resource.flipY = false; resource.minFilter = THREE.LinearFilter; resource.magFilter = THREE.LinearFilter; resource.generateMipmaps = false; resource.wrapS = THREE.ClampToEdgeWrapping; resource.wrapT = THREE.ClampToEdgeWrapping; } ],
                [ 'careerUzikTexture',                     `career/careerUzik.${compressedTextureExtension}${cb}`,                               compressedTextureFormat, (resource) => { resource.flipY = false; resource.minFilter = THREE.LinearFilter; resource.magFilter = THREE.LinearFilter; resource.generateMipmaps = false; resource.wrapS = THREE.ClampToEdgeWrapping; resource.wrapT = THREE.ClampToEdgeWrapping; } ],
                [ 'timeMachineScreenMGSTexture',           `timeMachine/timeMachineScreenMGS.${compressedTextureExtension}${cb}`,                compressedTextureFormat, (resource) => { resource.minFilter = THREE.NearestFilter; resource.magFilter = THREE.NearestFilter; resource.generateMipmaps = false; resource.wrapS = THREE.ClampToEdgeWrapping; resource.wrapT = THREE.ClampToEdgeWrapping; resource.colorSpace = THREE.SRGBColorSpace; } ],
                [ 'timeMachineScreen4X4Texture',         `timeMachine/timeMachineScreen4X4.${compressedTextureExtension}${cb}`,              compressedTextureFormat, (resource) => { resource.minFilter = THREE.NearestFilter; resource.magFilter = THREE.NearestFilter; resource.generateMipmaps = false; resource.wrapS = THREE.ClampToEdgeWrapping; resource.wrapT = THREE.ClampToEdgeWrapping; resource.colorSpace = THREE.SRGBColorSpace; } ],
            ],
            (toLoad, total) =>
            {
                const progress = 1 - toLoad / total
                this.world.intro.updateProgress(progress)
                this.startupScreen?.setProgress(31 + progress * 61)
            }
        )

        this.startupScreen?.setStage('Finalizing physics and controls')
        const [ newResources, RAPIER ] = await Promise.all([ resourcesPromise, rapierPromise ])
        this.startupScreen?.setProgress(94)
        this.RAPIER = RAPIER
        this.resources = { ...newResources, ...this.resources }

        this.terrain = new Terrain()
        this.physics = new Physics()
        this.wireframe = new PhysicsWireframe()
        this.physicalVehicle = new PhysicsVehicle()
        this.zones = new Zones()
        this.player = new Player()
        this.closingManager = new ClosingManager()
        this.interactivePoints = new InteractivePoints()
        this.konamiCode = new KonamiCode()
        this.achievements = new Achievements()
        this.tornado = new Tornado()
        this.map = new Map()
        this.title = new Title()
        this.pause = new Pause()
        this.missions = new Missions()
        this.dailyRewards = new DailyRewards()
        this.garage = new Garage()
        this.socialShare = new SocialShare()
        this.controllerStatus = new ControllerStatus()
        this.tutorial = new Tutorial()
        this.world.step(1)
        this.overlay = new Overlay()
        this.startupScreen?.setStage('Ready to drive')
        this.startupScreen?.setProgress(99)
        this.startupScreen?.hide()

        // Probe the browser/display cadence after the loading work has settled.
        // This keeps the FPS menu tied to what the current device can actually
        // present, rather than a generic hardware guess.
        this.quality.startFrameRateProbe({ delay: 900 })

        // Pre-render if quality high
        if(this.quality.level === 0 && this.rendering.renderer.backend.isWebGPUBackend)
            PreRenderer.render()

        this.ticker.wait(3, () =>
        {
            this.reveal.updateStep(0)
        })

        // Debug achievement
        if(this.debug.active)
        {
            this.achievements.setProgress('debug', 1)
        }
    }

    reloadForQualityAssets(assetProfile)
    {
        this.requestControlledReload(`Loading ${assetProfile?.label ?? 'selected'} world assets…`)
    }

    requestControlledReload(stage = 'Preparing the selected game settings…')
    {
        if(this.qualityAssetReloadScheduled)
            return

        this.qualityAssetReloadScheduled = true
        // Bring back the exact same startup shell before navigation so a settings
        // switch never exposes a blank WebGL canvas while the browser reloads.
        this.startupScreen?.showForReload(stage)
        try
        {
            sessionStorage.setItem('4x4-coukoo-reload-stage', stage)
        }
        catch(error)
        {
            // The game can still reload in browsers that block session storage.
        }

        this.notifications?.show(
            `<div class="top"><div class="title">Settings saved</div></div><div class="bottom"><div class="description">${stage}</div></div>`,
            'quality-assets',
            1
        )

        window.setTimeout(() => window.location.reload(), 420)
    }

    reset()
    {
        // Interactive buttons
        this.inputs.interactiveButtons.clearItems()

        // Player respawn
        this.player.respawn(null, () =>
        {
            // Objects reset
            this.objects.resetAll()

            // Explosive crates
            if(this.world.explosiveCrates)
                this.world.explosiveCrates.reset()

            // Bowling
            if(this.world.areas.bowling)
                this.world.areas.bowling.restart()

            // Cookie
            if(this.world.areas.cookie)
                this.world.areas.cookie.cookies.instancedGroup.needsUpdate = true

            // Toilet
            if(this.world.areas.toilet)
                this.world.areas.toilet.cabin.down = false

            // Social
            if(this.world.areas.social)
            {
                this.world.areas.social.statue.down = false
                this.world.areas.social.fans.instancedGroup.needsUpdate = true
            }
            
            // Benches
            if(this.world.benches)
                this.world.benches.instancedGroup.needsUpdate = true
            
            // Fences
            if(this.world.fences)
                this.world.fences.instancedGroup.needsUpdate = true
            
            // Bricks
            if(this.world.bricks)
                this.world.bricks.instancedGroup.needsUpdate = true
            
            // Lanterns
            if(this.world.lanterns)
                this.world.lanterns.instancedGroup.needsUpdate = true

            // Achievement
            gsap.delayedCall(2, () =>
            {
                this.achievements.setProgress('reset', 1)
            })
        })
    }
}

