# Circuit leaderboard server contract

The static Phase 9 deploy package includes the **client** for the live Circuit leaderboard. A public, anti-cheat leaderboard still requires a separate trusted WebSocket server; a browser-only ZIP cannot securely validate race times or prevent fabricated scores.

## Client configuration

Set this at build time:

```text
VITE_SERVER_URL=wss://your-domain.example/coukoo
```

When it is blank, the game remains fully playable: daily rewards, saved personal bests, score sharing, missions, and garage progression all work locally. The official leaderboard is shown as offline.

## Transport

- WebSocket (`ws:` locally, `wss:` in production)
- MessagePack payloads via `@msgpack/msgpack`
- Every client message includes a generated `uuid` session field.

## Messages sent by the client

```js
{
  uuid: 'session-id',
  type: 'circuitInsert',
  countryCode: 'ku',
  tag: 'ABC',
  duration: 42123,
  checkpointTimings: [/* milliseconds */]
}
```

## Messages required from the server

Initial state after connection:

```js
{
  type: 'init',
  circuitResetTime: 1735689600000,
  circuitLeaderboard: [
    ['ABC', 'ku', 42123]
  ]
}
```

Leaderboard refresh after an accepted score:

```js
{
  type: 'circuitUpdate',
  circuitLeaderboard: [
    ['ABC', 'ku', 42123]
  ]
}
```

## Required server-side validation

Never trust `duration`, checkpoint data, country code, or tag from the browser. The backend should:

1. Require an authenticated or rate-limited session.
2. Accept only 3 uppercase A–Z tag characters and an allowlisted country code.
3. Enforce a plausible minimum/maximum time and checkpoint order/timing envelope.
4. Limit submissions per session and IP.
5. Store only the fastest valid score per player per reset period.
6. Publish at most the top 10 normalized tuples.

This keeps the public leaderboard authoritative while the local personal-best system remains private to the player’s browser.
