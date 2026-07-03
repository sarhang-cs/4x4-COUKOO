import { Events } from './Events.js'

const STORAGE_KEY = '4x4-coukoo-save-v1'
const SAVE_VERSION = 6

const now = () => Date.now()

const clone = (value) =>
{
    if(value === undefined)
        return undefined

    try
    {
        return typeof structuredClone === 'function'
            ? structuredClone(value)
            : JSON.parse(JSON.stringify(value))
    }
    catch(error)
    {
        return value
    }
}

const isPlainObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const toFiniteNumber = (value, fallback = 0) =>
{
    const number = Number(value)
    return Number.isFinite(number) && number >= 0 ? number : fallback
}

const toQualityLevel = (value) =>
{
    const number = Number.parseInt(value, 10)
    return number === 0 || number === 1 || number === 2 ? number : null
}

const toUnitInterval = (value, fallback = 1) =>
{
    const number = Number(value)
    return Number.isFinite(number) ? Math.max(0, Math.min(1, number)) : fallback
}

const toShadowMode = (value) => [ 'auto', 'on', 'off' ].includes(value) ? value : 'auto'
const toVisualEffectsMode = (value) => [ 'auto', 'on', 'off' ].includes(value) ? value : 'auto'
const toSeasonMode = (value) => [ 'auto', 'spring', 'summer', 'autumn', 'winter' ].includes(value) ? value : 'auto'
const toWeatherMode = (value) => [ 'auto', 'clear', 'rain', 'storm', 'snow' ].includes(value) ? value : 'auto'

const toFpsLimit = (value) =>
{
    const number = Number(value)
    return [ -1, 30, 45, 60, 90, 120, 121 ].includes(number) ? number : -1
}

const toDayKey = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null

const toCircuitTime = (value) =>
{
    const number = Number(value)
    return Number.isFinite(number) && number > 0 && number <= 86_400_000 ? Math.round(number) : 0
}

const readLegacyJson = (storage, key, fallback) =>
{
    try
    {
        const value = storage.getItem(key)
        return value ? JSON.parse(value) : fallback
    }
    catch(error)
    {
        return fallback
    }
}

export class Save
{
    static STORAGE_KEY = STORAGE_KEY
    static VERSION = SAVE_VERSION

    constructor()
    {
        this.events = new Events()
        this.storage = this.getStorage()
        this.available = Boolean(this.storage)
        this.writeTimer = null
        this.data = this.load()

        const flush = () => this.flush()
        globalThis.addEventListener?.('pagehide', flush)
        globalThis.addEventListener?.('beforeunload', flush)
        globalThis.addEventListener?.('storage', (event) =>
        {
            if(event.key !== STORAGE_KEY || !event.newValue)
                return

            const incoming = this.parse(event.newValue)
            if(incoming)
            {
                this.data = incoming
                this.events.trigger('synced', [ this.snapshot() ])
            }
        })
    }

    getStorage()
    {
        try
        {
            const storage = globalThis.localStorage
            if(!storage)
                return null

            const probeKey = '__4x4_coukoo_storage_probe__'
            storage.setItem(probeKey, '1')
            storage.removeItem(probeKey)
            return storage
        }
        catch(error)
        {
            return null
        }
    }

    createDefault()
    {
        const timestamp = now()

        return {
            version: SAVE_VERSION,
            meta: {
                createdAt: timestamp,
                updatedAt: timestamp,
                lastPlayedAt: timestamp,
            },
            settings: {
                quality: null,
                audioMuted: false,
                audioVolume: 0.8,
                shadows: 'auto',
                fpsLimit: -1,
                vibration: true,
                visualEffects: 'auto',
                seasonMode: 'auto',
                weatherMode: 'auto',
                countryCode: 'ku',
            },
            progress: {
                distanceDriven: 0,
                timePlayed: 0,
                achievements: {},
                achievementsTimeStart: 0,
                achievementsTimeEnd: 0,
                achievementReward: null,
                tutorialCompleted: false,
                circuit: {
                    bestTimeMs: 0,
                    lastTimeMs: 0,
                    lastRunAt: 0,
                    runs: 0,
                    todayKey: null,
                    todayBestTimeMs: 0,
                },
            },
            session: {
                uuid: null,
            },
        }
    }

    parse(value)
    {
        try
        {
            const parsed = typeof value === 'string' ? JSON.parse(value) : value
            return isPlainObject(parsed) ? this.normalize(parsed) : null
        }
        catch(error)
        {
            return null
        }
    }

    normalize(value)
    {
        const defaults = this.createDefault()
        const normalized = {
            ...defaults,
            ...value,
            version: SAVE_VERSION,
            meta: { ...defaults.meta, ...(isPlainObject(value.meta) ? value.meta : {}) },
            settings: { ...defaults.settings, ...(isPlainObject(value.settings) ? value.settings : {}) },
            progress: { ...defaults.progress, ...(isPlainObject(value.progress) ? value.progress : {}) },
            session: { ...defaults.session, ...(isPlainObject(value.session) ? value.session : {}) },
        }

        normalized.meta.createdAt = toFiniteNumber(normalized.meta.createdAt, defaults.meta.createdAt)
        normalized.meta.updatedAt = toFiniteNumber(normalized.meta.updatedAt, defaults.meta.updatedAt)
        normalized.meta.lastPlayedAt = toFiniteNumber(normalized.meta.lastPlayedAt, defaults.meta.lastPlayedAt)
        normalized.settings.quality = toQualityLevel(normalized.settings.quality)
        normalized.settings.audioMuted = Boolean(normalized.settings.audioMuted)
        normalized.settings.audioVolume = toUnitInterval(normalized.settings.audioVolume, defaults.settings.audioVolume)
        normalized.settings.shadows = toShadowMode(normalized.settings.shadows)
        normalized.settings.fpsLimit = toFpsLimit(normalized.settings.fpsLimit)
        normalized.settings.vibration = normalized.settings.vibration !== false
        normalized.settings.visualEffects = toVisualEffectsMode(normalized.settings.visualEffects)
        normalized.settings.seasonMode = toSeasonMode(normalized.settings.seasonMode)
        normalized.settings.weatherMode = toWeatherMode(normalized.settings.weatherMode)
        normalized.settings.countryCode = typeof normalized.settings.countryCode === 'string' && normalized.settings.countryCode.trim()
            ? normalized.settings.countryCode.trim().toLowerCase().slice(0, 8)
            : defaults.settings.countryCode
        normalized.progress.distanceDriven = toFiniteNumber(normalized.progress.distanceDriven)
        normalized.progress.timePlayed = toFiniteNumber(normalized.progress.timePlayed)
        normalized.progress.achievements = isPlainObject(normalized.progress.achievements) ? normalized.progress.achievements : {}
        normalized.progress.achievementsTimeStart = toFiniteNumber(normalized.progress.achievementsTimeStart)
        normalized.progress.achievementsTimeEnd = toFiniteNumber(normalized.progress.achievementsTimeEnd)
        normalized.progress.achievementReward = typeof normalized.progress.achievementReward === 'string'
            ? normalized.progress.achievementReward.slice(0, 120)
            : null
        normalized.progress.tutorialCompleted = normalized.progress.tutorialCompleted === true

        // v6 removes the former Coukoo Garage currency, daily reward and
        // mission economy from the root game. Keep no stale values in the
        // persisted profile after the migration.
        delete normalized.progress.coins
        delete normalized.progress.totalCoins
        delete normalized.progress.missions
        delete normalized.progress.vehicles
        delete normalized.progress.activeVehicle
        delete normalized.progress.dailyReward
        normalized.progress.circuit = isPlainObject(normalized.progress.circuit) ? normalized.progress.circuit : {}
        normalized.progress.circuit.bestTimeMs = toCircuitTime(normalized.progress.circuit.bestTimeMs)
        normalized.progress.circuit.lastTimeMs = toCircuitTime(normalized.progress.circuit.lastTimeMs)
        normalized.progress.circuit.lastRunAt = toFiniteNumber(normalized.progress.circuit.lastRunAt)
        normalized.progress.circuit.runs = Math.floor(toFiniteNumber(normalized.progress.circuit.runs))
        normalized.progress.circuit.todayKey = toDayKey(normalized.progress.circuit.todayKey)
        normalized.progress.circuit.todayBestTimeMs = toCircuitTime(normalized.progress.circuit.todayBestTimeMs)
        normalized.session.uuid = typeof normalized.session.uuid === 'string' && normalized.session.uuid.length <= 160
            ? normalized.session.uuid
            : null

        return normalized
    }

    migrateLegacy()
    {
        const data = this.createDefault()
        if(!this.storage)
            return data

        const quality = toQualityLevel(this.storage.getItem('4x4-coukoo-quality'))
        if(quality !== null)
            data.settings.quality = quality

        data.settings.audioMuted = this.storage.getItem('soundToggle') === '1'

        const country = this.storage.getItem('countryCode')
        if(country)
            data.settings.countryCode = country

        data.progress.distanceDriven = toFiniteNumber(this.storage.getItem('distanceDriven'))
        data.progress.timePlayed = toFiniteNumber(this.storage.getItem('timePlayed'))
        data.progress.achievements = readLegacyJson(this.storage, 'achievements', {})
        data.progress.achievementsTimeStart = toFiniteNumber(this.storage.getItem('achievementsTimeStart'))
        data.progress.achievementsTimeEnd = toFiniteNumber(this.storage.getItem('achievementsTimeEnd'))

        const reward = this.storage.getItem('achievementsReward')
        if(reward)
            data.progress.achievementReward = reward

        const uuid = this.storage.getItem('uuid')
        if(uuid)
            data.session.uuid = uuid

        return this.normalize(data)
    }

    load()
    {
        if(!this.storage)
            return this.createDefault()

        const saved = this.parse(this.storage.getItem(STORAGE_KEY))
        if(saved)
            return saved

        const migrated = this.migrateLegacy()
        this.data = migrated
        this.flush()
        return migrated
    }

    get(path, fallback = null)
    {
        const parts = Array.isArray(path) ? path : String(path).split('.').filter(Boolean)
        let value = this.data

        for(const part of parts)
        {
            if(!isPlainObject(value) && !Array.isArray(value))
                return clone(fallback)

            if(!(part in value))
                return clone(fallback)

            value = value[part]
        }

        return clone(value)
    }

    set(path, value, { immediate = false } = {})
    {
        const parts = Array.isArray(path) ? path : String(path).split('.').filter(Boolean)
        if(!parts.length)
            return false

        let target = this.data
        for(const part of parts.slice(0, -1))
        {
            if(!isPlainObject(target[part]))
                target[part] = {}
            target = target[part]
        }

        const key = parts.at(-1)
        const nextValue = clone(value)
        if(JSON.stringify(target[key]) === JSON.stringify(nextValue))
            return false

        target[key] = nextValue
        this.touch()
        this.queueFlush(immediate)
        this.events.trigger('change', [ parts.join('.'), clone(nextValue), this.snapshot() ])
        return true
    }

    remove(path, { immediate = false } = {})
    {
        const parts = Array.isArray(path) ? path : String(path).split('.').filter(Boolean)
        if(!parts.length)
            return false

        let target = this.data
        for(const part of parts.slice(0, -1))
        {
            if(!isPlainObject(target?.[part]))
                return false
            target = target[part]
        }

        const key = parts.at(-1)
        if(!(key in target))
            return false

        delete target[key]
        this.touch()
        this.queueFlush(immediate)
        this.events.trigger('change', [ parts.join('.'), undefined, this.snapshot() ])
        return true
    }

    touch()
    {
        const timestamp = now()
        this.data.meta.updatedAt = timestamp
        this.data.meta.lastPlayedAt = timestamp
    }

    queueFlush(immediate = false)
    {
        if(immediate)
        {
            this.flush()
            return
        }

        if(this.writeTimer)
            return

        this.writeTimer = globalThis.setTimeout(() =>
        {
            this.writeTimer = null
            this.flush()
        }, 300)
    }

    flush()
    {
        if(this.writeTimer)
        {
            globalThis.clearTimeout(this.writeTimer)
            this.writeTimer = null
        }

        if(!this.storage)
            return false

        try
        {
            this.data = this.normalize(this.data)
            this.storage.setItem(STORAGE_KEY, JSON.stringify(this.data))
            this.events.trigger('saved', [ this.snapshot() ])
            return true
        }
        catch(error)
        {
            this.available = false
            this.events.trigger('error', [ error ])
            return false
        }
    }

    snapshot()
    {
        return clone(this.data)
    }

    getLastSavedAt()
    {
        return this.get('meta.updatedAt', 0)
    }

    clearProgress()
    {
        const defaults = this.createDefault()
        this.data.progress = defaults.progress
        this.touch()
        this.flush()
        this.events.trigger('progressCleared', [ this.snapshot() ])
    }

    resetAll()
    {
        this.data = this.createDefault()
        this.flush()
        this.events.trigger('reset', [ this.snapshot() ])
    }

    exportBackup()
    {
        const payload = JSON.stringify(this.snapshot(), null, 2)
        const fileName = `4x4-coukoo-save-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.json`

        if(typeof document === 'undefined' || typeof URL === 'undefined' || typeof Blob === 'undefined')
            return { payload, fileName, downloaded: false }

        const url = URL.createObjectURL(new Blob([ payload ], { type: 'application/json' }))
        const link = document.createElement('a')
        link.href = url
        link.download = fileName
        link.rel = 'noopener'
        document.body.appendChild(link)
        link.click()
        link.remove()
        globalThis.setTimeout(() => URL.revokeObjectURL(url), 0)

        return { payload, fileName, downloaded: true }
    }
}
