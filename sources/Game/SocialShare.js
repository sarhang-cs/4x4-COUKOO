import { Game } from './Game.js'
import { timeToRaceString } from './utilities/time.js'

const cleanUrl = () =>
{
    try
    {
        const url = new URL(globalThis.location?.href ?? '')
        url.hash = ''
        return url.href
    }
    catch(error)
    {
        return ''
    }
}

export class SocialShare
{
    constructor()
    {
        this.game = Game.getInstance()
    }

    formatCircuitMessage({ durationMs, isPersonalBest = false } = {})
    {
        const time = timeToRaceString(Math.max(0, Number(durationMs) || 0) / 1000)
        const suffix = isPersonalBest ? ' New personal best!' : ''
        return `I finished the 4X4 COUKOO Circuit in ${time}.${suffix} Can you beat my time?`
    }

    async shareCircuitRun(result = {})
    {
        const text = this.formatCircuitMessage(result)
        const url = cleanUrl()
        const payload = {
            title: '4X4 COUKOO Circuit',
            text,
            url,
        }

        try
        {
            if(typeof globalThis.navigator?.share === 'function')
            {
                await globalThis.navigator.share(payload)
                this.notify('Score shared', 'Your circuit result is ready for your friends.')
                return { shared: true, method: 'native' }
            }
        }
        catch(error)
        {
            if(error?.name === 'AbortError')
                return { shared: false, cancelled: true }
        }

        const fallbackText = url ? `${text}\n${url}` : text
        try
        {
            if(typeof globalThis.navigator?.clipboard?.writeText === 'function')
            {
                await globalThis.navigator.clipboard.writeText(fallbackText)
                this.notify('Score copied', 'Paste your circuit result anywhere you want to share it.')
                return { shared: true, method: 'clipboard' }
            }
        }
        catch(error)
        {
            console.warn('Unable to copy shared circuit result.', error)
        }

        this.notify('Sharing unavailable', 'Your browser does not support sharing or clipboard access.')
        return { shared: false, method: 'unsupported' }
    }

    notify(title, description)
    {
        this.game.notifications?.show(
            `<div class="top"><div class="title">${title}</div></div><div class="bottom"><div class="description">${description}</div></div>`,
            'share',
            4,
            null,
            `share-${title}`
        )
    }
}
