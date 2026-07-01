# Phase 9 — Daily Rewards, Sharing & Controller Reliability

## Added

- Seven-day, save-backed daily reward streak in the Garage.
- Local circuit run history: last time, all-time personal best, daily best, run count, and timestamp.
- Circuit completion modal now opens offline as well, so players can see personal-best feedback and share results without a multiplayer server.
- Native browser sharing via the Web Share API, with clipboard fallback where it is unavailable.
- Controller connection/disconnection handling, including release of held actions after a controller is unplugged and a short status indicator.
- A server contract document for the optional live leaderboard WebSocket and the validation the trusted server must enforce.

## Important

- The deploy ZIP is a static website. It cannot host an authoritative global leaderboard by itself.
- Official leaderboard mode activates only when a trusted `VITE_SERVER_URL` WebSocket server is supplied at build time.
- Daily rewards and personal bests are intentionally local browser progression and therefore are not an anti-cheat currency system.
