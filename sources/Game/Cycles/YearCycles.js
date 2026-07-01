import * as THREE from 'three/webgpu'
import { Cycles } from './Cycles.js'

// One full visual year lasts 40 minutes. Each season occupies ten minutes:
// eight minutes and thirty seconds of stable conditions followed by a gentle
// ninety-second transition to the following season. No asset is swapped here;
// this only drives the original world materials, weather and foliage values.
const YEAR_DURATION_SECONDS = 40 * 60
const SEASON_DURATION_SECONDS = YEAR_DURATION_SECONDS / 4
const TRANSITION_SECONDS = 90
const TRANSITION_RATIO = TRANSITION_SECONDS / YEAR_DURATION_SECONDS
const HOLD_RATIO = 0.25 - TRANSITION_RATIO

const normalize = (value) => ((value % 1) + 1) % 1

export class YearCycles extends Cycles
{
    constructor()
    {
        const forcedProgress = import.meta.env.VITE_YEAR_CYCLE_PROGRESS ? parseFloat(import.meta.env.VITE_YEAR_CYCLE_PROGRESS) : null
        super('🕜 Year Cycles', YEAR_DURATION_SECONDS, forcedProgress, false)

        this.seasonTiming = Object.freeze({
            yearDurationSeconds: YEAR_DURATION_SECONDS,
            seasonDurationSeconds: SEASON_DURATION_SECONDS,
            transitionSeconds: TRANSITION_SECONDS,
            stableSeconds: SEASON_DURATION_SECONDS - TRANSITION_SECONDS,
        })
    }

    getSeasonPhase(progress = this.progress)
    {
        const value = normalize(progress)
        const periods = [
            { key: 'winter', next: 'spring', start: 0 },
            { key: 'spring', next: 'summer', start: 0.25 },
            { key: 'summer', next: 'autumn', start: 0.5 },
            { key: 'autumn', next: 'winter', start: 0.75 },
        ]

        const period = periods.find((item, index) =>
        {
            const nextStart = periods[(index + 1) % periods.length].start
            return index === periods.length - 1
                ? value >= item.start || value < nextStart
                : value >= item.start && value < nextStart
        }) ?? periods[0]

        const local = normalize(value - period.start)
        const transitionStart = HOLD_RATIO
        const transitioning = local >= transitionStart && local < 0.25
        const mix = transitioning
            ? Math.max(0, Math.min(1, (local - transitionStart) / TRANSITION_RATIO))
            : 0

        return {
            key: transitioning && mix >= 0.5 ? period.next : period.key,
            from: period.key,
            to: period.next,
            mix,
            transitioning,
            ...this.seasonTiming,
        }
    }

    getKeyframesDescriptions()
    {
        const presets = {
            // The values remain based on the original archive cycle; only the
            // duration/hold timing is made playable in the game.
            winter: { leaves: 0.25, temperature: 5, humidity: 0.8, clouds: 0.65, wind: 0.3 },
            spring: { leaves: 0, temperature: 15, humidity: 0.65, clouds: 0.45, wind: 0.2 },
            summer: { leaves: 0.25, temperature: 25, humidity: 0.5, clouds: 0.3, wind: 0.1 },
            fall: { leaves: 1, temperature: 15, humidity: 0.65, clouds: 0.65, wind: 0.25 },
        }

        return [
            [
                { properties: presets.winter, stop: 0 },
                { properties: presets.winter, stop: HOLD_RATIO },
                { properties: presets.spring, stop: 0.25 },
                { properties: presets.spring, stop: 0.25 + HOLD_RATIO },
                { properties: presets.summer, stop: 0.5 },
                { properties: presets.summer, stop: 0.5 + HOLD_RATIO },
                { properties: presets.fall, stop: 0.75 },
                { properties: presets.fall, stop: 0.75 + HOLD_RATIO },
                { properties: presets.winter, stop: 1 },
            ]
        ]
    }
}
