export const MAX_CIRCUIT_LEADERBOARD_SCORES = 10

const MAX_CIRCUIT_DURATION_MS = 24 * 60 * 60 * 1000
const TAG_FALLBACK = '---'

const normalizeTag = (value) =>
{
    if(typeof value !== 'string')
        return TAG_FALLBACK

    const tag = value
        .normalize('NFKC')
        .replace(/[^a-z]/gi, '')
        .slice(0, 3)
        .toUpperCase()

    return tag || TAG_FALLBACK
}

const normalizeCountryCode = (value) =>
{
    if(typeof value !== 'string')
        return ''

    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z]/g, '')
        .slice(0, 2)
}

/**
 * Treat multiplayer data as untrusted at the UI boundary. The renderer and DOM
 * only receive stable score tuples, so malformed or oversized payloads cannot
 * break the leaderboard or inject markup.
 */
export const normalizeCircuitLeaderboard = (value) =>
{
    if(value === null)
        return null

    if(!Array.isArray(value))
        return []

    const scores = []

    for(const item of value)
    {
        if(scores.length >= MAX_CIRCUIT_LEADERBOARD_SCORES)
            break

        if(!Array.isArray(item))
            continue

        const duration = Number(item[2])
        if(!Number.isFinite(duration) || duration < 0 || duration > MAX_CIRCUIT_DURATION_MS)
            continue

        scores.push([
            normalizeTag(item[0]),
            normalizeCountryCode(item[1]),
            Math.round(duration)
        ])
    }

    return scores
}

export const normalizeCircuitResetTime = (value) =>
{
    const resetTime = Number(value)

    if(!Number.isFinite(resetTime) || resetTime <= 0)
        return null

    return resetTime
}
