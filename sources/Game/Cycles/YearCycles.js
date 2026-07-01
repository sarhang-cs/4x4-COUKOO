import * as THREE from 'three/webgpu'
import { Cycles } from './Cycles.js'

export class YearCycles extends Cycles
{
    constructor()
    {
        const forcedProgress = import.meta.env.VITE_YEAR_CYCLE_PROGRESS ? parseFloat(import.meta.env.VITE_YEAR_CYCLE_PROGRESS) : null
        // A real 365-day duration made the seasonal content effectively invisible
        // during normal play. One complete in-game year now takes 12 minutes,
        // giving every season roughly three minutes while manual selection can
        // still lock a season instantly from Settings.
        super('🕜 Year Cycles', 12 * 60, forcedProgress, false)
    }

    getKeyframesDescriptions()
    {
        const presets = {
            winter: { leaves: 0.25, temperature: 5,  humidity: 0.8, clouds: 0.65, wind: 0.3 },
            spring: { leaves: 0, temperature: 15, humidity: 0.65, clouds: 0.45, wind: 0.2 },
            summer: { leaves: 0.25, temperature: 25, humidity: 0.5, clouds: 0.3,  wind: 0.1 },
            fall:   { leaves: 1, temperature: 15, humidity: 0.65, clouds: 0.65, wind: 0.25 },
        }
        
        return [
            [
                { properties: presets.winter, stop: 0 + 0.125 },
                { properties: presets.spring, stop: 0.25 + 0.125 },
                { properties: presets.summer, stop: 0.5 + 0.125 },
                { properties: presets.fall, stop: 0.75 + 0.125 },
            ]
        ]
    }
}