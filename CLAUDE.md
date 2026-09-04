# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev            # Next + Socket.IO on :3000 (tsx server.ts)
npm run build          # next build && tsup server bundle -> .next/ + dist-server/
npm start              # production server (requires npm run build first)
npm run lint           # eslint, exit non-zero on error
```

### Unit tests (Vitest)

```bash
npx vitest run                                    # whole suite, once
npx vitest run src/lib/__tests__/trade.test.ts    # one file
npx vitest run -t "longest road"                  # one test by name
npx vitest run --coverage
```

**Use `npx vitest run`, not `npm run test`.** The `test` script is bare `vitest`, which
enters watch mode in an interactive terminal and will hang.

### E2E tests (Cypress)

```bash
npm run e2e            # starts dev server + opens the Cypress GUI (watch it run)
npm run e2e:headless   # starts dev server + headless run
```

Against an already-running server:

```bash
npx cypress run                                              # all specs
npx cypress run --spec cypress/e2e/six-players-expansion.cy.ts
```

**In a VS Code terminal you must `unset ELECTRON_RUN_AS_NODE` first.** VS Code sets it
to `1`, which forces Cypress's Electron binary into plain-Node mode; it then rejects its
own launch flags and fails with `Cypress.exe: bad option: --smoke-test`. This looks
exactly like a corrupt install and is not one — do not reinstall the binary. Unaffected
in CI.

## Architecture

### This is not a stock Next.js app

`server.ts` is a custom HTTP server that wraps the Next request handler and attaches
Socket.IO to the same port. There are no API routes; all multiplayer traffic is socket
events. Two build outputs exist: `.next/` (app) and `dist-server/` (tsup CJS bundle of
the server).

### Server-authoritative state

The browser holds **no** game logic. The full `GameState` lives in server memory
(`RoomStore`), and the client is a render surface plus an action emitter:

```
UI event -> performAction() -> socket 'game-action'
         -> server derives actor from the SEAT, rewrites the action, runs the reducer
         -> broadcasts 'game-update' { type: 'SYNC_STATE', payload: GameState }
         -> every client replaces its state wholesale
```

`useMultiplayerGame` ([src/hooks/useMultiplayerGame.ts](src/hooks/useMultiplayerGame.ts))
is the only socket boundary on the client. Request/response uses socket.io **acks**
(the client must learn which seat it got); broadcasts are fire-and-forget.

**There is no per-seat redaction yet.** `broadcastGame` emits `room.game` verbatim to the
whole socket room, so every client — players and spectators alike — receives every hand
and the dev-card deck. Nothing in the game is actually hidden information today; the UI
merely declines to render other players' cards. Any feature that depends on secrecy
(private hands, face-down dev cards) has to add a `GameState` → per-player view on the
server first — hiding it client-side is not hiding it. Tracked as issue #47.

### Reducer: command registry

[src/lib/game/reducer.ts](src/lib/game/reducer.ts) is a dispatch table, not a switch.
`commandRegistry` is typed as a mapped type over `GameAction['type']`, so **adding a new
action fails to compile until it is handled** in both:

1. [src/lib/game/commands/registry.ts](src/lib/game/commands/registry.ts) — the handler
2. [src/lib/server/actionGuards.ts](src/lib/server/actionGuards.ts) — its `actorRewriters` entry

Each handler is `(state, action) => GameState`, pure, one file in `commands/`.
`catanReducer` = `coreReducer` + `evaluateWinCondition`. Rejections return state with a
message prepended to `gameLog` rather than throwing.

The reducer is player-count agnostic (`% players.length`, `players.length - 1`). Do not
reintroduce any `% 4` or hardcoded seat count.

### Lobby → game lifecycle

`RoomStore` ([src/lib/server/rooms.ts](src/lib/server/rooms.ts)) is a pure state machine
with **no socket.io import** — that is deliberate, so every rule is unit-testable without
a socket. [src/lib/server/socketHandlers.ts](src/lib/server/socketHandlers.ts) does event
wiring only.

- Rooms are created lazily on `room:enter`, status `'lobby'`, no game state.
- Seats are claimed via `lobby:sit`; the first seat becomes host. Host-only `lobby:start`
  derives `boardKind` from seat count and calls `createInitialState`.
- Identity is a `localStorage` **clientId**, not `socket.id`, so a refresh recovers the
  seat. `crypto.randomUUID` requires a secure context and this may serve plain HTTP —
  the `Math.random` fallback in [src/lib/client-id.ts](src/lib/client-id.ts) is required.
- Game ids normalise to uppercase; `/game/abc` and `/game/ABC` are one room. Always route
  socket room names through `roomKey()`.

### Board generation

[src/lib/board-presets.ts](src/lib/board-presets.ts) derives coordinates from a row-width
table rather than a literal list, so one rule produces both boards. 5+ players ⇒
`'expansion'` automatically (`boardKindForPlayerCount`).

|           | hexes | nodes | harbours | deserts | dev cards |
|-----------|-------|-------|----------|---------|-----------|
| base      | 19    | 54    | 9        | 1       | 25        |
| expansion | 30    | 80    | 11       | 2       | 34        |

The expansion board's middle row has an even width, so it is **not centred on the
origin** — its centroid is half a hex left. Anything doing geometry about the board
centre must use the computed centroid (`generateHarbours` does). `GameBoard` derives its
viewBox from node bounds for the same reason; `HEX_SIZE` is baked into node ids and the
neighbour tolerance, so scale via viewBox only, never by changing `HEX_SIZE`.

Randomness is injectable (`Rng` in [src/lib/rng.ts](src/lib/rng.ts)) as a trailing
optional arg — the only way to reach the 6/8 repair fallback in tests.

## Invariants — breaking these causes silent corruption

**`players[i].id === i`.** The reducer indexes `state.players[playerId]` everywhere.
Seats compact while in the lobby and **freeze the moment the game starts**
(`recompute()` only compacts when `status === 'lobby'`). A player who leaves mid-game
keeps their seat, marked `connected: false`. Never renumber seats after start.

**The actor comes from the seat, never the payload.** `game-action` derives
`actor = seat.seatIndex` and passes the action through `withActor()` before the reducer.
Client-supplied `playerId` / `acceptorId` / `thiefId` is always overwritten. Without
this, a client can act as another player.

**`SYNC_STATE` must never be client-callable.** Its handler returns `action.payload`
verbatim, so accepting it from a client hands over the entire game state (arbitrary
resources, instant win). `isActionAllowedFor` rejects it outright. It exists only for
server→client broadcast.

**`LobbySeat` must never carry `clientId`.** `toSnapshot()` strips it; the snapshot is
broadcast to everyone, and a leaked clientId lets anyone take over that seat.

**`src/lib/server/*` must stay React/Next-free**, or the tsup CJS production bundle
breaks. `npm run build` catches this, but only at the very end.

## Conventions

- Player colour comes from `player.color`, never from seat index. `GameBoard` builds a
  memoised `playerColors: Record<number, PlayerColor>` and passes it to `SettlementNode`
  / `RoadLayer`.
- Player names go through `playerName` / `nameOf`
  ([src/lib/game/helpers/playerName.ts](src/lib/game/helpers/playerName.ts)), which takes
  `Pick<GameState,'players'>` so one helper serves both reducer log strings and
  components.
- Tailwind v4 cannot see template literals — colour class maps must be static strings
  (`PLAYER_COLOR_CLASSES` in constants).
- `data-cy` attributes exist for Cypress. Keep them on elements the specs target; adding
  new interactive UI generally means adding one.

## Testing

Unit tests live in `src/lib/__tests__/` (ESLint ignores `**/__tests__/**`). They cover
board generation, harbours, the reducer, longest road / largest army, the lobby state
machine, and action guards.

Several tests assert **exact log strings** containing `Player 1` / `Player 2`, which is
why the no-arg `createInitialState()` default must keep producing names exactly
`"Player 1".."Player 4"` (`DEFAULT_SEATS`).

### E2E structure

Specs are in `cypress/e2e/`. Extra players are **bots driven over real socket.io from the
Cypress Node task runner** ([cypress/support/simulatedPlayer.ts](cypress/support/simulatedPlayer.ts)),
not extra browser tabs — the visible browser stays one real human seat and reacts to the
bots live over the wire. `simulatedPlayer.ts` is deliberately free of `@/` imports;
Cypress bundles it with its own esbuild pass that does not know the alias.

Shared commands are in [cypress/support/commands.ts](cypress/support/commands.ts):

- **Always use `cy.createGameAsHost()` before `cy.addBot()`.** Bots are spawned from Node,
  which does not wait for the browser's socket round-trip, so a bot's `lobby:sit` can beat
  the browser's and make the *bot* the host — and only the host renders a Start button.
  `createGameAsHost` waits for seat 0 in the DOM to close that race. This has already
  caused a real intermittent failure.
- SVG elements need `.click({ force: true })`; jQuery's visibility heuristics treat the
  `<g>` wrappers as hidden.

`cypress/` is excluded from the root `tsconfig.json` (it has its own) so Cypress's globals
do not collide with Vitest's. Videos/screenshots are gitignored and recorded in CI only
(`video: !!process.env.CI`), then uploaded as artifacts.

## CI

[.github/workflows/ci.yml](.github/workflows/ci.yml):
`test` (lint + vitest) → `e2e` ‖ `build` → `docker-publish` → `deploy`.
`docker-publish` needs **both** `build` and `e2e`, so a broken lobby or board blocks
deployment. The e2e job runs against a **production** build via `npm start`.

`docker-publish` and `deploy` are **gated on tag pushes** (`startsWith(github.ref,
'refs/tags/')`) — a merge to `main` runs the tests and the build but ships nothing. To
release, push a tag. Everything above them runs on PRs to `main` as well.

The `test` job runs `npm run test` (bare `vitest`), which is safe there only because a
non-TTY runner makes vitest exit after one pass. Locally it watches — use `npx vitest run`.

[.github/workflows/claude.yml](.github/workflows/claude.yml) is separate from CI: it
answers `@claude` mentions on issues, PRs and reviews, and is restricted to
`github.actor == github.repository_owner`.

`dist-server/` is generated build output and is ESLint-ignored — before that ignore
existed, running `npm run build` then `npm run lint` locally failed on the minified
bundle's `require()` calls. CI never saw it because lint and build run on separate
runners.

### Docker

[dockerfile](dockerfile) (lower-case filename) is a four-stage build: `deps` (full
install) → `deps-prod` (`npm ci --omit=dev`) → `builder` (`npm run build`) → `runner`.
The runner copies `.next/`, `public/`, prod `node_modules`, and
**`dist-server/server.js` → `/app/server.js`**, then runs `node server.js` on port 3000 —
it never runs `next start`. So the tsup output path is load-bearing: renaming or
splitting the server bundle breaks the image even though `npm run build` still passes.
This is also where the React/Next-free rule for `src/lib/server/*` actually bites — the
runner stage has no dev dependencies to fall back on.

`deploy` SSHes to the server, pulls the new GHCR image and runs `docker compose up -d`
from `~/Catan`; the compose file lives on the server, not in this repo.

## Harbour Placement

Harbours on a Catan board are **not evenly spaced** — some ports sit one buildable node apart, others two. This is not randomness; it comes directly from the leftover-node arithmetic.

### The Math

Given `total` coastal nodes and `count` harbours:
- Each harbour occupies 2 adjacent nodes → 2 × count nodes consumed
- Remaining free nodes: `total - 2 * count`
- Distribute these across `count` gaps: `baseGap = floor(freeNodes / count)` gaps get the base spacing, and `freeNodes % count` gaps get one extra

**Base board**: 30 coastal nodes, 9 harbours → 12 free nodes → 6 gaps of 1 node + 3 gaps of 2 nodes (always)
**Expansion**: 38 coastal nodes, 11 harbours → 16 free nodes → 6 gaps of 1 node + 5 gaps of 2 nodes (always)

### Common Mistakes

1. **Fixed-step walking** (`Math.floor(total / count)` step size): leaves the remainder piled in one gap, creating an entire side of the board with no harbour. Visually obvious.
2. **Proportional index without shuffling**: produces the correct 1-and-2 mix but always in the same spots, so casual players never notice the variation.
3. **Angle-based testing**: angles are continuous but gaps are discrete; they can mislead.

### Correct Approach

[src/lib/hex-utils.ts:196-242](src/lib/hex-utils.ts#L196-L242):
- Compute the exact arithmetic: `baseGap`, `wideGapCount`
- **Shuffle which specific gaps get the extra node** so the layout varies each game
- Randomize the ring's starting point too
- Advance by `gap + 2` each iteration (harbour's own 2 nodes + free nodes before next)

### Testing

[src/lib/__tests__/harbours.test.ts:141-170](src/lib/__tests__/harbours.test.ts#L141-L170):
- **`coastalWalk(nodes)`**: walks the true node-adjacency cycle (the only reliable way to measure gaps)
- **Test 1**: assert the exact gap distribution every run (`baseGap` and `baseGap + 1` counts)
- **Test 2**: verify layouts vary across games (if this fails, the algorithm is deterministic)

Do NOT use angle approximations or fixed-step logic. Always use the exact arithmetic + shuffle.

## Writing GitHub issues

Issues are filed with `gh issue create --repo AbsenteeCrane4/catan`. Write the body to a
file and pass `--body-file` — the bodies are long and contain backticks and heredoc-hostile
characters. Label feature work `enhancement`.

Substantive issues follow a fixed shape (see #19, #40 for the reference examples). Keep
this order:

1. `# Title` heading restating the feature
2. A one-sentence user story, **bold-italic**, in the form `**_As a player, I want … so that …_**`
3. `## Description` — prose: what exists now, what must change, what is explicitly *not* in scope
4. One or more `## <Area> Requirements` sections — the bulk of the issue, grouped by concern rather than one flat list
5. `## Acceptance Criteria` — observable outcomes, not implementation
6. `## Tasks` — the implementation checklist, roughly in execution order
7. `## Definition of Done` — the ship gate, including which test suites must pass

**Every bullet from section 4 onward is a `- [ ]` checkbox**, including in Description-
adjacent lists. Closed issues have them ticked (#40), so the checkboxes are used as real
progress tracking, not decoration.

Two conventions worth keeping:

- Reference related issues by number (`tracked as issue #20`) rather than restating them.
- Where a requirement collides with something in this file — an invariant, the
  server-authoritative model, the no-redaction gap — call it out in the Description with
  a short `### ` subsection explaining *why* the naive implementation fails. #47 does this
  for hidden hands.

Short tracking issues with a title and no body exist too (#41, #45). Only write one of
those if asked for a placeholder.

## Scope notes

- Victory target is **10** on both boards; the 5–6 player extension does not change it.
- The Special Build Phase is deliberately out of scope (tracked as issue #20).
- The in-game layout is being reworked colonist.io-style, including real per-seat hidden hands (issue #47).
