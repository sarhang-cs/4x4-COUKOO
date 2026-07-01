import assert from 'node:assert/strict'
import {
    MAX_CIRCUIT_LEADERBOARD_SCORES,
    normalizeCircuitLeaderboard,
    normalizeCircuitResetTime
} from '../sources/Game/utilities/leaderboard.js'

assert.equal(normalizeCircuitLeaderboard(null), null)
assert.deepEqual(normalizeCircuitLeaderboard({}), [])
assert.deepEqual(
    normalizeCircuitLeaderboard([
        [ '<img src=x onerror=alert(1)>', 'KU!', 25123.7 ],
        [ 'abc', 'us', -1 ],
        'bad-row'
    ]),
    [ [ 'IMG', 'ku', 25124 ] ]
)

const oversizedScores = Array.from(
    { length: MAX_CIRCUIT_LEADERBOARD_SCORES + 5 },
    (_, index) => [ `a${index}`, 'ku', index + 1 ]
)
assert.equal(normalizeCircuitLeaderboard(oversizedScores).length, MAX_CIRCUIT_LEADERBOARD_SCORES)
assert.equal(normalizeCircuitResetTime('1710000000000'), 1710000000000)
assert.equal(normalizeCircuitResetTime('not-a-time'), null)
assert.equal(normalizeCircuitResetTime(0), null)

console.log('Phase 1 safety tests passed.')
