import gsap from 'gsap'
import { Events } from './Events.js'
import { Game } from './Game.js'
import { lerp, remapClamp } from './utilities/maths.js'

const SEASON_MODES = Object.freeze([ 'auto', 'spring', 'summer', 'autumn', 'winter' ])
const WEATHER_MODES = Object.freeze([ 'auto', 'clear', 'rain', 'storm', 'snow' ])

const SEASONS = Object.freeze({
    spring: { label: 'Spring', progress: 0.375 },
    summer: { label: 'Summer', progress: 0.625 },
    autumn: { label: 'Autumn', progress: 0.875 },
    winter: { label: 'Winter', progress: 0.125 },
})

const WEATHER_PRESETS = Object.freeze({
    clear: {
        label: 'Clear',
        values: { humidity: 0.2, clouds: 0.08, wind: 0.14, electricField: -0.8, rain: 0, snow: -1 },
    },
    rain: {
        label: 'Rain',
        values: { humidity: 0.98, clouds: 0.92, wind: 0.42, electricField: 0.16, rain: 0.88, snow: -1 },
    },
    storm: {
        label: 'Storm',
        values: { humidity: 1, clouds: 1, wind: 0.82, electricField: 1, rain: 1, snow: -1 },
    },
    snow: {
        label: 'Snow',
        values: { temperature: -9, humidity: 0.96, clouds: 0.9, wind: 0.48, electricField: 0.08, rain: 0.82, snow: 1 },
    },
})

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))
const validSeason = (value) => SEASON_MODES.includes(value) ? value : 'auto'
const validWeather = (value) => WEATHER_MODES.includes(value) ? value : 'auto'

export class Weather
{
    constructor()
    {
        this.game = Game.getInstance()
        this.events = new Events()
        this.environment = {
            activeSeason: null,
            activeWeather: null,
            lastAutoSeason: null,
            lastAutoWeather: null,
        }

        // Debug
        if(this.game.debug.active)
        {
            this.debugPanel = this.game.debug.panel.addFolder({
                title: '🌦️ Weather',
                expanded: false,
            })
        }

        this.properties = []
        this.setOverride()

        // Temperature
        this.addProperty(
            'temperature',
            -15,
            40,
            () =>
            {
                const yearValue = this.game.yearCycles.properties.temperature.value
                const dayValue = this.game.dayCycles.properties.temperature.value
                const variation = this.noise(this.game.dayCycles.absoluteProgress * 0.4) * 7.5
                return clamp(yearValue + dayValue + variation, -15, 40)
            }
        )

        // Humidity
        this.addProperty(
            'humidity',
            0,
            1,
            () =>
            {
                const yearValue = this.game.yearCycles.properties.humidity.value
                const variation = this.noise(this.game.dayCycles.absoluteProgress * 0.36) * 0.18
                return clamp(yearValue + variation, 0, 1)
            }
        )

        // Electric field
        this.addProperty(
            'electricField',
            -1,
            1,
            () =>
            {
                const dayValue = this.game.dayCycles.properties.electricField.value
                const variation = this.noise(this.game.dayCycles.absoluteProgress * 0.53)
                return dayValue * variation
            }
        )

        // Clouds: the previous implementation ignored the seasonal cloud value,
        // which made rain and storms extremely rare. This now uses the seasonal
        // baseline plus day-scale movement, so spring/fall really look wetter.
        this.addProperty(
            'clouds',
            0,
            1,
            () =>
            {
                const yearValue = this.game.yearCycles.properties.clouds.value
                const variation = this.noise(this.game.dayCycles.absoluteProgress * 0.44) * 0.42
                return clamp(yearValue + variation, 0, 1)
            }
        )

        // Wind
        this.addProperty(
            'wind',
            0,
            1,
            () =>
            {
                const yearValue = this.game.yearCycles.properties.wind.value
                const variation = this.noise(this.game.dayCycles.absoluteProgress) * 0.32 + 0.22
                return clamp(yearValue + variation, 0, 1)
            }
        )

        // Rain
        this.addProperty(
            'rain',
            0,
            1,
            () =>
            {
                const humidity = remapClamp(this.humidity.value, 0.45, 0.85, 0, 1)
                const clouds = remapClamp(this.clouds.value, 0.35, 0.78, 0, 1)
                return clamp(humidity * clouds, 0, 1)
            }
        )

        // Snow
        this.addProperty(
            'snow',
            -1,
            1,
            () =>
            {
                const rainRatio = remapClamp(this.rain.value, 0.05, 0.3, 0, 1)
                const freezeRatio = remapClamp(this.temperature.value, 0, -5, 0, 1)
                const meltRatio = remapClamp(this.temperature.value, 0, 10, 0, -1)

                return rainRatio * freezeRatio + meltRatio
            }
        )

        this.syncEnvironment({ immediate: true, silent: true })

        this.game.save.events.on('synced', () => this.syncEnvironment({ immediate: true }))
        this.game.ticker.events.on('tick', () => this.update(), 8)
    }

    noise(x)
    {
        return Math.sin(x) * Math.sin(x * 1.678) * Math.sin(x * 2.345)
    }

    getSeasonMode()
    {
        return validSeason(this.game.save.get('settings.seasonMode', 'auto'))
    }

    getWeatherMode()
    {
        return validWeather(this.game.save.get('settings.weatherMode', 'auto'))
    }

    getAutoSeasonKey(progress = this.game.yearCycles.progress)
    {
        const normalized = ((progress % 1) + 1) % 1

        if(normalized < 0.25)
            return 'winter'
        if(normalized < 0.5)
            return 'spring'
        if(normalized < 0.75)
            return 'summer'
        return 'autumn'
    }

    getSeasonKey()
    {
        const mode = this.getSeasonMode()
        return mode === 'auto' ? this.getAutoSeasonKey() : mode
    }

    getSeasonLabel()
    {
        const mode = this.getSeasonMode()
        const season = SEASONS[this.getSeasonKey()] ?? SEASONS.spring
        return mode === 'auto' ? `Auto · ${season.label}` : season.label
    }

    getAutoWeatherLabel()
    {
        if(this.snow?.value > 0.38)
            return 'Snow'
        if(this.rain?.value > 0.6 && this.electricField?.value > 0.35)
            return 'Storm'
        if(this.rain?.value > 0.22)
            return 'Rain'
        return 'Clear'
    }

    getWeatherLabel()
    {
        const mode = this.getWeatherMode()
        return mode === 'auto' ? `Auto · ${this.getAutoWeatherLabel()}` : WEATHER_PRESETS[mode]?.label ?? 'Auto'
    }

    getSeasonDetails()
    {
        const key = this.getSeasonKey()
        const season = SEASONS[key] ?? SEASONS.spring
        return { key, ...season, automatic: this.getSeasonMode() === 'auto' }
    }

    setSeasonMode(mode = 'auto')
    {
        const next = validSeason(mode)
        if(next === this.getSeasonMode())
            return

        this.game.save.set('settings.seasonMode', next, { immediate: true })
        this.syncEnvironment()
    }

    setWeatherMode(mode = 'auto')
    {
        const next = validWeather(mode)
        if(next === this.getWeatherMode())
            return

        this.game.save.set('settings.weatherMode', next, { immediate: true })
        this.syncEnvironment()
    }

    syncEnvironment({ immediate = false, silent = false } = {})
    {
        const duration = immediate ? 0 : 0.55
        const seasonMode = this.getSeasonMode()
        const weatherMode = this.getWeatherMode()

        if(seasonMode === 'auto')
            this.game.yearCycles.override.end(duration)
        else
            this.game.yearCycles.override.start({ progress: SEASONS[seasonMode].progress }, duration)

        if(weatherMode === 'auto')
            this.override.end(duration)
        else
            this.override.start(WEATHER_PRESETS[weatherMode].values, duration)

        const nextSeason = this.getSeasonKey()
        this.environment.activeSeason = nextSeason
        this.environment.activeWeather = weatherMode
        this.environment.lastAutoSeason = this.getAutoSeasonKey()
        this.environment.lastAutoWeather = this.getAutoWeatherLabel()

        if(!silent)
            this.events.trigger('environmentChange', [ this.getSeasonDetails(), this.getWeatherMode() ])
    }

    addProperty(name, min, max, get)
    {
        const property = {}
        property.name = name
        property.manual = false
        property.min = min
        property.max = max

        property.value = get()
        property.overrideValue = null

        // Debug
        property.binding = this.game.debug.addManualBinding(
            this.debugPanel,
            property,
            'value',
            { label: name, min: property.min, max: property.max, step: 0.001 },
            () =>
            {
                let value = get()

                if(this.override.strength > 0 && property.overrideValue !== null)
                    value = lerp(value, property.overrideValue, this.override.strength)

                return value
            }
        )

        if(this.game.debug.active)
        {
            this.debugPanel.addBinding(property, 'value', { readonly: true })
            this.debugPanel.addBinding(
                property,
                'value',
                {
                    label: `${property.min} -> ${property.max}`,
                    readonly: true,
                    view: 'graph',
                    min: property.min,
                    max: property.max,
                }
            )
            this.debugPanel.addBlade({ view: 'separator' })
        }

        this[name] = property
        this.properties.push(property)
    }

    setOverride()
    {
        this.override = {}
        this.override.strength = 0

        this.override.start = (values = {}, duration = 5) =>
        {
            for(const property of this.properties)
            {
                property.overrideValue = typeof values[property.name] !== 'undefined'
                    ? values[property.name]
                    : null
            }

            if(duration === 0)
                this.override.strength = 1
            else
                gsap.to(this.override, { strength: 1, duration, overwrite: true })
        }

        this.override.end = (duration = 5) =>
        {
            if(duration === 0)
                this.override.strength = 0
            else
                gsap.to(this.override, { strength: 0, duration, overwrite: true })
        }
    }

    update()
    {
        for(const property of this.properties)
            property.binding.update()

        if(this.getSeasonMode() === 'auto')
        {
            const season = this.getAutoSeasonKey()
            if(season !== this.environment.lastAutoSeason)
            {
                this.environment.lastAutoSeason = season
                this.events.trigger('environmentChange', [ this.getSeasonDetails(), this.getWeatherMode() ])
            }
        }

        if(this.getWeatherMode() === 'auto')
        {
            const weather = this.getAutoWeatherLabel()
            if(weather !== this.environment.lastAutoWeather)
            {
                this.environment.lastAutoWeather = weather
                this.events.trigger('environmentChange', [ this.getSeasonDetails(), this.getWeatherMode() ])
            }
        }
    }
}
