import * as THREE from 'three/webgpu'
import { Howl, Howler } from 'howler'
import { Game } from './Game.js'
import { remap, remapClamp, clamp } from './utilities/maths.js'
import gsap from 'gsap'
import { Events } from './Events.js'

export class Audio
{
    constructor()
    {
        this.game = Game.getInstance()

        this.initiated = false
        this.paused = false
        this.groups = new Map()
        this.events = new Events()

        // Howler's built-in auto unlock/suspend can trigger Chromium
        // autoplay warnings before the intro interaction on some Android
        // browsers. The game already manages resume/pause itself.
        Howler.autoUnlock = false
        Howler.autoSuspend = false

        this.setVolume()
        this.setMute()
        this.setAudioUnlock()

        // One quality system controls the playlist source as well as rendering.
        // High uses the retained lossless masters; Medium and Low keep the MP3
        // files so mobile users do not download them by accident.
        this.game.quality.events.on('change', () => this.refreshPlaylistQuality())

        this.game.ticker.events.on('tick', () =>
        {
            this.update()
        }, 14)
    }

    setAudioUnlock()
    {
        this.unlock = () =>
        {
            if(!this.initiated)
                return

            const context = Howler.ctx
            if(context?.state === 'suspended')
                context.resume().catch(() => {})
        }

        // Android browsers can suspend an AudioContext after a tab switch or
        // power-saving transition. Any real player gesture unlocks the same
        // original archive sounds again without creating replacement audio.
        for(const eventName of [ 'pointerdown', 'touchend', 'keydown' ])
            window.addEventListener(eventName, this.unlock, { passive: true })

        document.addEventListener('visibilitychange', () =>
        {
            if(document.visibilityState === 'visible')
                this.unlock()
        }, { passive: true })
    }

    pause()
    {
        if(this.paused || !this.initiated)
            return

        this.paused = true
        Howler.ctx?.suspend?.().catch(() => {})
    }

    resume()
    {
        if(!this.paused || !this.initiated)
            return

        this.paused = false
        Howler.ctx?.resume?.().catch(() => {})
    }

    init()
    {
        if(this.initiated)
        {
            this.unlock()
            return
        }

        this.initiated = true
        this.unlock()

        this.setPlaylist()
        this.setAmbiants()
        this.setOneOffs()

        // Play all autoplays that didn't start because not initated
        this.groups.forEach((group, name) =>
        {
            for(const item of group.items)
            {
                if(item.autoplay && !item.playing)
                    item.play()
            }
        })
    }

    register(options = {})
    {
        // Group
        const groupName = options.group ?? 'all'
        let group = this.groups.get(groupName)

        if(!group)
        {
            group = {}
            group.items = []
            group.lastPlayedId = -1
            group.playRandomNext = (...parameters) =>
            {
                const delta = 1 + Math.floor(Math.random() * (group.items.length - 2))
                const id = (group.lastPlayedId + delta) % group.items.length

                const item = group.items[id]
                item.play(...parameters)
            }
            group.play = (...parameters) =>
            {
                const id = (group.lastPlayedId + 1) % group.items.length

                const item = group.items[id]
                item.play(...parameters)
            }
            this.groups.set(groupName, group)
        }

        const item = {}
        item.howl = null
        item.createHowl = () =>
        {
            if(item.howl)
                return item.howl

            // Creating an AudioContext before a pointer/keyboard gesture triggers
            // Chromium autoplay warnings. Construction and loading are deferred
            // until Audio.init() has been reached from the intro interaction.
            item.howl = new Howl({
                src: [ options.path ],
                pool: 2,
                autoplay: false,
                loop: options.loop ?? false,
                volume: options.volume ?? 0.5,
                // The original archive file is preloaded after the player's
                // first gesture. This avoids the unreliable load+play race that
                // caused silent rain/thunder on some mobile Chromium builds.
                preload: true,
                onloaderror: (_id, error) =>
                {
                    console.error(`Audio > Load error > ${options.path}`, error, options)
                },
                onplayerror: () =>
                {
                    this.unlock()
                },
                onend: () =>
                {
                    item.playing = false
                }
            })

            return item.howl
        }
        item.positions = options.positions ?? null
        if(item.positions !== null && !(item.positions instanceof Array))
            item.positions = [ item.positions ]
        item.distanceFade = options.distanceFade ?? null
        item.rate = options.rate ?? 1
        item.volume = options.volume ?? 0.5
        item.antiSpam = options.antiSpam ?? 0.1
        item.lastPlay = -Infinity
        item.onPlaying = options.onPlaying ?? null
        item.onPlay = options.onPlay ?? null
        item.loaded = false
        item.waitingForLoad = false
        item.autoplay = options.autoplay ?? false
        item.playing = (this.initiated && options.autoplay) ?? false
        item.id = group.items.length

        item.play = (...parameters) =>
        {
            if(!this.initiated)
                return

            const howl = item.createHowl()

            // Anti spam
            if(item.antiSpam && this.game.ticker.elapsed - item.lastPlay < item.antiSpam)
                return

            // Play binding must run before loading so positional/rate/volume
            // values are ready when the original sound begins.
            if(typeof item.onPlay === 'function')
                item.onPlay(item, ...parameters)

            item.lastPlay = this.game.ticker.elapsed
            item.playing = true
            group.lastPlayedId = item.id

            const startPlayback = () =>
            {
                item.waitingForLoad = false
                this.unlock()
                howl.rate(clamp(item.rate * (this.globalRate ?? 1), 0.5, 4))
                howl.volume(item.volume)
                howl.mute(item.volume < 0.01)
                howl.play()
            }

            if(howl.state() !== 'loaded')
            {
                // One queued start is enough for loop sounds and avoids a burst
                // of duplicate thunder/rain after a slow network decode.
                if(!item.waitingForLoad)
                {
                    item.waitingForLoad = true
                    howl.once('load', startPlayback)
                    howl.once('loaderror', () => { item.waitingForLoad = false; item.playing = false })
                    howl.load()
                }
                return
            }

            startPlayback()
        }

        group.items.push(item)

        return item
    }

    getPlaylistPath(song)
    {
        const assetProfile = this.game.quality.getAssetProfile()
        return `${assetProfile.musicPath}/${song.id}.${assetProfile.musicFormat}`
    }

    createPlaylistHowl(song)
    {
        return new Howl({
            src: [ song.path ],
            pool: 0,
            autoplay: false,
            loop: false,
            preload: true,
            volume: 0.2,
            onplayerror: () => this.unlock(),
            onend: () =>
            {
                this.playlist?.next()
            }
        })
    }

    refreshPlaylistQuality()
    {
        if(!this.playlist)
            return

        // A disc transition deliberately lasts three seconds. If the player
        // changes High/Medium while that transition is active, do not lose the
        // request: apply the new MP3/WAV source immediately after it finishes.
        if(this.playlist.switching)
        {
            this.playlist.qualityRefreshPending = true
            return
        }

        const current = this.playlist.current
        const wasPlaying = Boolean(current?.sound?.playing?.())

        for(const song of this.playlist.songs)
        {
            const nextPath = this.getPlaylistPath(song)
            if(song.path === nextPath)
                continue

            song.sound?.stop()
            song.sound?.unload()
            song.path = nextPath
            song.name = `${song.id}.${this.game.quality.getAssetProfile().musicFormat}`
            song.loaded = false
            song.sound = this.createPlaylistHowl(song)
        }

        if(wasPlaying && current)
        {
            current.loaded = true
            current.sound.load()
            current.sound.play()
        }
    }

    setPlaylist()
    {
        this.playlist = {}
        this.playlist.songs = [
            { id: 'Sudo' },
            { id: 'Boy' },
            { id: 'Baguira' },
        ]
        this.playlist.index = (Math.floor(Date.now() / 1000 / 60 / 3) % this.playlist.songs.length) // Different music every X minutes
        this.playlist.current = null
        this.playlist.switching = false
        this.playlist.qualityRefreshPending = false

        for(const song of this.playlist.songs)
        {
            song.path = this.getPlaylistPath(song)
            song.name = `${song.id}.${this.game.quality.getAssetProfile().musicFormat}`
            song.loaded = false
            song.sound = this.createPlaylistHowl(song)
        }

        this.playlist.next = () =>
        {
            if(this.playlist.switching)
                return

            this.playlist.switching = true

            // Disc change sound
            this.game.audio.groups.get('discChange').play()

            // Old one
            if(this.playlist.current)
                this.playlist.current.sound.stop()

            gsap.delayedCall(3, () =>
            {
                this.playlist.index++

                if(this.playlist.index >= this.playlist.songs.length)
                    this.playlist.index = 0

                // New one
                this.playlist.current = this.playlist.songs[this.playlist.index]

                if(!this.playlist.current.loaded)
                {
                    this.playlist.current.loaded = true
                    this.playlist.current.sound.load()
                }

                this.playlist.current.sound.play()

                // Notification
                const html = /* html */`
                    <div class="top">
                        <div class="title">Now playing<br /><span class="song-name">${this.playlist.current.name}</span></div>
                        <div class="music-note-icon"></div>
                    </div>
                `

                this.game.notifications.show(
                    html,
                    'song',
                    5,
                )

                this.playlist.switching = false

                if(this.playlist.qualityRefreshPending)
                {
                    this.playlist.qualityRefreshPending = false
                    this.refreshPlaylistQuality()
                }
            })
        }

        this.playlist.play = () =>
        {
            this.playlist.current = this.playlist.songs[this.playlist.index]

            if(!this.playlist.current.loaded)
            {
                this.playlist.current.loaded = true
                this.playlist.current.sound.load()
            }

            this.playlist.current.sound.play()
        }

        if(import.meta.env.VITE_MUSIC)
            this.playlist.play()
    }

    setAmbiants()
    {
        const getRandomDirection = (distance = 30) =>
        {
            return new THREE.Vector3(
                this.game.view.focusPoint.position.x + ((Math.random() < 0.5) ? distance : - distance),
                this.game.view.focusPoint.position.y,
                this.game.view.focusPoint.position.z + ((Math.random() < 0.5) ? distance : - distance)
            )
        }
        
        // Birds tweets
        {
            const tweetsPaths = [
                'sounds/birdTweets/24074 small bird tweet calling-full-1.mp3',
                'sounds/birdTweets/24074 small bird tweet calling-full-2.mp3',
                'sounds/birdTweets/20711 finch bird isolated tweet-full.mp3',
                'sounds/birdTweets/30673 Yellowhammer bird tweet 3-full.mp3',
                'sounds/birdTweets/31062 Ortolan bird tweet-full.mp3',
                'sounds/birdTweets/31451 Ortolan bunting bird isolated tweet-full.mp3',
            ]

            const tweets = []
            for(const path of tweetsPaths)
                tweets.push(
                    this.register({
                        group: 'birdTweet',
                        path: path,
                        autoplay: false,
                        loop: false,
                        volume: 0.3,
                        positions: new THREE.Vector3(),
                        onPlay: (item) =>
                        {
                            item.volume = 0.2 + Math.random() * 0.3
                            item.rate = 1 + Math.random() * 0.7
                            item.positions[0].copy(getRandomDirection())
                        }
                    })
                )


            const tryPlay = () =>
            {
                // Chance to trigger
                if(!this.game.dayCycles.intervalEvents.get('night').inInterval && Math.random() < 0.5)
                {
                    const sound = tweets[Math.floor(Math.random() * tweets.length)]
                    sound.play()
                }

                // Wait before trying again
                gsap.delayedCall(0.5 + Math.random() * 5, tryPlay)
            }
            tryPlay()
        }
        
        // Owl
        {
            const sound = this.register({
                group: 'owl',
                path: 'sounds/owl/OwlHootingReverberantSeveral_Rik8a_03.mp3',
                autoplay: false,
                loop: false,
                volume: 0.3,
                positions: new THREE.Vector3(),
                onPlay: (item) =>
                {
                    item.volume = 0.2 + Math.random() * 0.25
                    item.rate = 1 + Math.random() * 0.3
                    item.positions[0].copy(getRandomDirection())
                }
            })

            const tryPlay = () =>
            {
                // Chance to trigger
                if(this.game.dayCycles.intervalEvents.get('night').inInterval && Math.random() < 0.5)
                {
                    sound.play()
                }

                // Wait before trying again
                gsap.delayedCall(30 + Math.random() * 60, tryPlay)
            }
            gsap.delayedCall(30 + Math.random() * 60, tryPlay)
        }

        // Rooster
        {
            const sound = this.register({
                group: 'rooster',
                path: 'sounds/rooster/rooster-crowing.mp3',
                autoplay: false,
                loop: false,
                volume: 0.1,
                positions: new THREE.Vector3(),
                onPlay: (item) =>
                {   
                    item.volume = 0.1 + Math.random() * 0.2
                    item.positions[0].copy(getRandomDirection())
                }
            })

            this.game.dayCycles.events.on('night', (inInterval) =>
            {
                if(!inInterval)
                    sound.play()
            })
        }

        // Wolf
        {
            const sound = this.register({
                group: 'wolf',
                path: 'sounds/wolf/TimberWolvesGroupHowlingSomeWhimpering_S2h0E_04.mp3',
                autoplay: false,
                loop: false,
                volume: 0.1,
                positions: new THREE.Vector3(),
                onPlay: (item) =>
                {   
                    item.volume = 0.1 + Math.random() * 0.2
                    item.positions[0].copy(getRandomDirection())
                }
            })

            this.game.dayCycles.events.on('deepNight', (inInterval) =>
            {
                if(inInterval)
                    sound.play()
            })
        }

        // Crickets
        {
            const sound = this.register({
                group: 'crickets',
                    path: 'sounds/crickets/Crickets.mp3',
                autoplay: true,
                loop: true,
                volume: this.game.dayCycles.intervalEvents.get('night').inInterval ? 0.65 : 0
            })

            this.game.dayCycles.events.on('night', (inInterval) =>
            {
                gsap.to(sound, { volume: inInterval ? 0.65 : 0, duration: 15, overwrite: true })
            })
        }

        // Jingle bells
        this.register({
            group: 'jingleBells',
            path: 'sounds/jingleBells/Mountain Audio - Christmas Bells.mp3',
            autoplay: true,
            loop: true,
            volume: 0,
            onPlaying: (item) =>
            {
                const sine = Math.sin(this.game.ticker.elapsedScaled * 0.1) * 0.5 + 0.5
                const targetVolume = Math.max(0, this.game.weather.snow.value) * 0.35 * sine

                const easing = targetVolume > item.volume ? 0.005 : 0.05
                item.volume += (targetVolume - item.volume) * this.game.ticker.deltaScaled * easing
            }
        })

        // Rain
        this.register({
            group: 'rain',
            path: 'sounds/rain/soundjay_rain-on-leaves_main-01.mp3',
            autoplay: true,
            loop: true,
            volume: 0,
            onPlaying: (item) =>
            {
                const snowAttenuation = remapClamp(this.game.weather.snow.value, 0, 0.6, 1, 0)
                const rainVolume = remapClamp(this.game.weather.rain.value, 0.1, 0.6, 0, 1)
                item.volume = rainVolume * snowAttenuation
            }
        })

        // Wind
        this.register({
            group: 'wind',
            path: 'sounds/wind/13582-wind-in-forest-loop.mp3',
            autoplay: true,
            loop: true,
            volume: 0,
            onPlaying: (item) =>
            {
                item.volume = Math.pow(remapClamp(this.game.weather.wind.value, 0.3, 1, 0, 1), 3) * 0.7
            }
        })

        // Waves
        this.register({
            group: 'waves',
            path: 'sounds/waves/lake-waves.mp3',
            autoplay: true,
            loop: true,
            volume: 0,
            onPlaying: (item) =>
            {
                const distanceToSide = Math.min(
                    this.game.terrain.size / 2 - Math.abs(this.game.player.position.x),
                    this.game.terrain.size / 2 - Math.abs(this.game.player.position.z)
                )
                item.volume = Math.pow(remapClamp(distanceToSide, 0, 40, 1, 0.1), 2) * 0.7
            }
        })

        // Oven fire (Project Area + Cookie Area)
        {
            const positions = []
            if(this.game.world.areas?.cookie)
                positions.push(this.game.world.areas.cookie.references.items.get('spawner')[0].position)
            if(this.game.world.areas?.projects)
                positions.push(this.game.world.areas.projects.references.items.get('oven')[0].position)

            if(positions.length)
            {
                this.game.audio.register({
                    group: 'ovenFire',
                    path: 'sounds/fire/Mountain Audio - Fire Burning in a Wood Stove 1.mp3',
                    autoplay: true,
                    loop: true,
                    volume: 0.8,
                    positions: positions,
                    distanceFade: 13,
                })
            }
        }

        // Campfire (Lab Area + Bonfire Area)
        {
            const positions = []
            if(this.game.world.areas?.lab)
                positions.push(this.game.world.areas.lab.references.items.get('fire')[0].position)

            if(positions.length)
            {
                this.game.audio.register({
                    group: 'campfire',
                    path: 'sounds/fire/Fire Burning.mp3',
                    autoplay: true,
                    loop: true,
                    volume: 1,
                    positions: positions,
                    distanceFade: 13,
                })
            }
        }
    }

    setOneOffs()
    {
        this.register({
            group: 'discChange',
            path: 'sounds/jukebox/DVDPlayerChangeDisc_BW.49824.mp3',
            autoplay: false,
            loop: false,
            volume: 0.3,
        })
        
        this.register({
            group: 'slide',
            path: 'sounds/mecanism/slide.mp3',
            autoplay: false,
            volume: 0.18
        })

        this.register({
            group: 'click',
            path: 'sounds/mecanism/click.mp3',
            autoplay: false,
            volume: 0.25,
            onPlay: (item, isOpen = true) =>
            {
                item.rate = isOpen ? 1 : 0.6
            }
        })

        this.register({
            group: 'assemble',
            path: 'sounds/mecanism/assemble.mp3',
            autoplay: false,
            volume: 0.3
        })

        // Hits default
        {
            const paths = [
                [ 'sounds/hits/defaults/Stone_Hit_Crash_106-2.mp3', 0.35 ],
                [ 'sounds/hits/defaults/Stone_Hit_Crash_071-1.mp3', 0.35 ],
                [ 'sounds/hits/defaults/Stone_Hit_Crash_106-1.mp3', 0.35 ],
                [ 'sounds/hits/defaults/Impact Soft 01.mp3', 0.8 ],
                [ 'sounds/hits/defaults/Impact Soft 02.mp3', 0.8 ],
                [ 'sounds/hits/defaults/Impact Soft 03.mp3', 0.8 ],
                [ 'sounds/hits/defaults/Impact Soft 04.mp3', 0.8 ],
            ]

            for(const [path, baseVolume] of paths)
            {
                this.register({
                    group: 'hitDefault',
                    path: path,
                    autoplay: false,
                    volume: baseVolume,
                    antiSpam: 0.1,
                    positions: new THREE.Vector3(),
                    distanceFade: 20,
                    onPlay: (item, force, position) =>
                    {
                        item.positions[0].copy(position)
                        const forceVolume = remapClamp(force, 0, 200, 0, 1)
                        item.volume = baseVolume * forceVolume
                        item.rate = 0.9 + Math.random() * 0.2
                    }
                })
            }
        }

        // Hits bricks
        {
            const paths = [
                [ 'sounds/hits/bricks/24445 brick light hitting-full-2.mp3', 0.6 ],
                [ 'sounds/hits/bricks/41559 Stone brick fall hit 01-full-1.mp3', 0.6 ],
                [ 'sounds/hits/bricks/41563 Stone brick fall hit 05-full-1.mp3', 0.6 ],
                [ 'sounds/hits/bricks/BrickSetDown_BW.5803-1.mp3', 0.6 ],
            ]

            for(const [path, baseVolume] of paths)
            {
                this.register({
                    group: 'hitBrick',
                    path: path,
                    autoplay: false,
                    volume: baseVolume,
                    antiSpam: 0.1,
                    positions: new THREE.Vector3(),
                    distanceFade: 20,
                    onPlay: (item, force, position) =>
                    {
                        item.positions[0].copy(position)
                        item.volume = baseVolume * Math.pow(remapClamp(force, 5, 20, 0, 1), 2)
                        item.rate = 0.9 + Math.random() * 0.2
                    }
                })
            }
        }

        // Hits metal
        {
            const paths = [
                [ 'sounds/hits/metal/EQUIPTact_Fire Gear_SDFIRE0411.mp3', 0.6 ],
                [ 'sounds/hits/metal/Metal Clip Hit.mp3', 0.6 ],
                [ 'sounds/hits/metal/Metalic 3.mp3', 0.6 ],
            ]

            for(const [path, baseVolume] of paths)
            {
                this.register({
                    group: 'hitMetal',
                    path: path,
                    autoplay: false,
                    volume: baseVolume,
                    antiSpam: 0.1,
                    positions: new THREE.Vector3(),
                    distanceFade: 20,
                    onPlay: (item, force, position) =>
                    {
                        item.positions[0].copy(position)
                        item.volume = baseVolume * Math.pow(remapClamp(force, 5, 20, 0, 1), 2)
                        item.rate = 0.9 + Math.random() * 0.2
                    }
                })
            }
        }
    }

    setVolume()
    {
        this.volume = {}
        this.volume.value = Math.max(0, Math.min(1, Number(this.game.save.get('settings.audioVolume', 0.8))))

        this.volume.set = (value, { save = true } = {}) =>
        {
            const nextValue = Math.max(0, Math.min(1, Number(value)))
            if(!Number.isFinite(nextValue))
                return

            this.volume.value = nextValue
            Howler.volume(nextValue)

            if(save)
                this.game.save.set('settings.audioVolume', nextValue, { immediate: true })

            this.events.trigger('volumeChange', [ nextValue ])
        }

        this.volume.set(this.volume.value, { save: false })
    }

    setMute()
    {
        this.mute = {}

        this.mute.active = false

        this.mute.toggle = () =>
        {
            if(this.mute.active)
                this.mute.deactivate()
            else
                this.mute.activate()
        }

        this.mute.activate = () =>
        {
            if(this.mute.active)
                return
            
            Howler.mute(true)
            this.mute.active = true
            this.game.save.set('settings.audioMuted', true, { immediate: true })
            document.documentElement.classList.add('is-audio-muted')
            this.events.trigger('muteChange', [ true ])
        }

        this.mute.deactivate = () =>
        {
            if(!this.mute.active)
                return
            
            Howler.mute(false)
            this.mute.active = false
            this.game.save.set('settings.audioMuted', false, { immediate: true })
            document.documentElement.classList.remove('is-audio-muted')
            this.events.trigger('muteChange', [ false ])
        }

        // From local storage
        const audioMuted = this.game.save.get('settings.audioMuted', false)
        if(audioMuted)
            this.mute.activate()

        // Inputs keyboard
        this.game.inputs.addActions([
            { name: 'mute', categories: [ 'intro', 'modal', 'menu', 'racing', 'cinematic', 'wandering' ], keys: [ 'Keyboard.l' ] },
        ])
        this.game.inputs.events.on('mute', (action) =>
        {
            if(action.active)
                this.mute.toggle()
        })

        // Tab focus / blur
        window.addEventListener('blur', () =>
        {
            Howler.mute(true)

            if(this.playlist?.current)
                this.playlist.current.sound.pause()
        })

        window.addEventListener('focus', () =>
        {
            if(!this.mute.active)
            {
                Howler.mute(false)

                if(this.playlist?.current)
                    this.playlist.current.sound.play()
            }
        })

    }

    update()
    {
        this.globalRate = this.game.time.scale / this.game.time.defaultScale
        this.groups.forEach((group) =>
        {
            for(const item of group.items)
            {
                // Apply tick binding
                if(typeof item.onPlaying === 'function')
                {
                    item.onPlaying(item)
                }

                // Positional and distance fade
                let distanceFadeMultiplier = 1
                if(item.howl && item.positions && item.howl.playing())
                {
                    let closestDistance = Infinity
                    let closestPosition = null

                    for(const position of item.positions)
                    {
                        const distance = position.distanceTo(this.game.view.focusPoint.position)

                        if(distance < closestDistance)
                        {
                            closestDistance = distance
                            closestPosition = position
                        }
                    }

                    const cameraRelativePosition = closestPosition.clone()
                    cameraRelativePosition.applyMatrix4(this.game.view.camera.matrixWorldInverse)
                    cameraRelativePosition.normalize()
                    cameraRelativePosition.z *= 0.1

                    if(item.distanceFade)
                    {
                        distanceFadeMultiplier = remapClamp(closestDistance, 0, item.distanceFade, 1, 0)
                    }

                    if(distanceFadeMultiplier > 0)
                        item.howl.pos(cameraRelativePosition.x, cameraRelativePosition.y, cameraRelativePosition.z)
                }

                // Rate (apply global too)
                if(!item.howl)
                    continue

                item.howl.rate(clamp(item.rate * this.globalRate, 0.5, 4))

                // Volume
                const volume = item.volume * distanceFadeMultiplier
                item.howl.volume(volume)

                item.howl.mute(volume < 0.01)
            }
        })
    }
}
