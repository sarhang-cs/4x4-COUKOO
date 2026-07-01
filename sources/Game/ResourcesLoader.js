import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js'
import * as THREE from 'three/webgpu'
import { Game } from './Game.js'

export class ResourcesLoader
{
    constructor()
    {
        this.game = Game.getInstance()
        this.loaders = new Map()
        this.cache = new Map()
    }

    getLoader(_type)
    {
        if(this.loaders.has(_type))
            return this.loaders.get(_type)

        let loader = null

        if(_type === 'texture')
        {
            loader = new THREE.TextureLoader()
        }
        else if(_type === 'textureKtx')
        {
            loader = new KTX2Loader()
            loader.setTranscoderPath('./basis/')
            loader.detectSupport(this.game.rendering.renderer)
        }
        else if(_type === 'draco')
        {
            loader = new DRACOLoader()
            loader.setDecoderPath('./draco/')
            loader.preload()
        }
        else if(_type === 'gltf')
        {
            const dracoLoader = this.getLoader('draco')
            const ktx2Loader = this.getLoader('textureKtx')

            loader = new GLTFLoader()
            loader.setDRACOLoader(dracoLoader)
            loader.setKTX2Loader(ktx2Loader)
        }

        this.loaders.set(_type, loader)

        return loader
    }

    getConcurrency()
    {
        const device = this.game.quality?.device
        const connection = device?.connection

        if(connection?.saveData || /(^|-)2g|slow-2g/i.test(connection?.effectiveType ?? ''))
            return 2

        if(device?.isMobile)
            return device.isConstrained ? 3 : 4

        return device?.isConstrained ? 5 : 8
    }

    load(_files, _progressCallback = null)
    {
        return new Promise((resolve, reject) =>
        {
            if(!_files.length)
            {
                resolve({})
                return
            }

            let cursor = 0
            let pending = 0
            let completed = 0
            let settled = false
            const concurrency = Math.min(this.getConcurrency(), _files.length)
            const loadedResources = {}

            const progress = () =>
            {
                completed++

                if(typeof _progressCallback === 'function')
                    _progressCallback(_files.length - completed, _files.length)

                if(completed === _files.length && !settled)
                {
                    settled = true
                    resolve(loadedResources)
                }
            }

            const save = (_file, _resource) =>
            {
                if(typeof _file[3] !== 'undefined')
                    _file[3](_resource)

                loadedResources[_file[0]] = _resource
                this.cache.set(_file[1], _resource)
            }

            const fail = (_file, error) =>
            {
                if(settled)
                    return

                settled = true
                console.error(`Resources > Couldn't load file ${_file[1]}`, error)
                const startupError = new Error(`Couldn't load resource: ${_file[1]}`)
                startupError.code = 'RESOURCE_LOAD_FAILED'
                reject(startupError)
            }

            const pump = () =>
            {
                if(settled)
                    return

                while(pending < concurrency && cursor < _files.length)
                {
                    const file = _files[cursor++]

                    if(this.cache.has(file[1]))
                    {
                        loadedResources[file[0]] = this.cache.get(file[1])
                        progress()
                        continue
                    }

                    let loader
                    try
                    {
                        loader = this.getLoader(file[2])
                    }
                    catch(error)
                    {
                        fail(file, error)
                        return
                    }

                    pending++
                    loader.load(
                        file[1],
                        (resource) =>
                        {
                            if(settled)
                                return

                            pending--

                            try
                            {
                                save(file, resource)
                                progress()
                                pump()
                            }
                            catch(error)
                            {
                                fail(file, error)
                            }
                        },
                        undefined,
                        (error) =>
                        {
                            pending--
                            fail(file, error)
                        }
                    )
                }
            }

            pump()
        })
    }
}
