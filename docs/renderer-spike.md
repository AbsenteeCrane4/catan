# Renderer spike: SVG vs React Three Fiber

**Issue:** #55 (sub-issue of #47)

**Outcome: a split.** The **board stays 2D** — SVG terrain on a CSS-transformed plane. The
**game pieces are three.js** — real meshes, lit, casting real shadows, on one transparent
canvas over the board. Reference: `docs/threejs-example.jpeg`.

`docs/DESIGN.md` §10 asks that we establish whether the target can be reached by enhancing
the board we have, before reaching for a renderer that would replace it. This is that
comparison and the decision it produced.

## What was actually being decided

Not "2D or 3D". The target needs four things:

1. An elevated perspective around 45–50°.
2. Pan, zoom and constrained orbit that feel like moving a tabletop.
3. Terrain, roads, settlements, cities, tokens, harbours and a robber that read as
   physical objects.
4. All of it without the camera touching React state, the game engine, or the test suite.

CSS 3D transforms give (1) and (2) outright — the browser does the perspective divide and,
crucially, the *inverse* transform for hit testing. The real question was (3), and it has
a different answer for the board than it does for the pieces.

## The board: 2D

**Terrain does not need geometry.** `public/images/tiles/*.png` are painted hexes viewed
from a 3/4 angle already. Texture-mapped onto extruded prisms they would read *worse*, so
going 3D for the board means commissioning new terrain art as well as writing the
renderer.

**A canvas board deletes the test surface.** Every board `data-cy` — `hex`, `node`,
`edge`, `harbour`, `hex-image`, `legal-target` — is a DOM node. Inside a `<canvas>` there
is none of that, so `board-artwork`, `harbours`, `setup-phase`, `six-players-expansion`,
`spectator` and `build-affordances` would all need rewriting against a bespoke test
handle, and the jsdom tests in `build-mode.test.tsx` — which compare the highlighted DOM
against the legality selectors — could not run at all, because jsdom has no WebGL.

So the board is an SVG plane under `perspective` and `rotateX`. Clicks land on the same
elements they did when it was flat; the browser maps the pointer through the transform.

An earlier revision of this spike gave the board physical thickness — a stack of fifteen
silhouettes forming a cliff. That was **removed**: the board should read as a board, and
the depth in the scene should come from the pieces standing on it, which is exactly what
the reference shows.

## The pieces: three.js

This is where a real renderer earns its place, and where SVG had been faking it.

A settlement, a city, a road and the robber are *objects*. They have a top that catches
the light and a side that does not, they occlude each other, and they cast shadows onto
the board. The SVG version could only approximate that with hand-painted three-tone
shading on a flat sprite that was turned back to face the camera every frame — a cutout
standing on the board, convincing only as long as nothing moved.

Meshes give it for nothing: one directional light fixed to the board, and the shading,
the occlusion and the contact shadows all fall out. Because only the pieces are 3D:

- the canvas is `pointer-events: none`, so **every board interaction and every existing
  spec is untouched** — the pieces are painted over the board, not in front of it
- there is no game state in the renderer; it is handed a list of `{id, kind, position,
  colour}` built from the same node and hex coordinates the reducer uses
- the piece geometry is arithmetic, so it is unit-tested without a graphics context
  (`pieces3d.test.ts` measures every piece's footprint and base)

`three` is used directly rather than through React Three Fiber. The camera has to track
the CSS board frame for frame and must never enter React state, which is exactly what R3F's
reconciler is for and exactly what this does not need.

### Matching the two cameras

This is the one genuinely delicate part. The board is projected by the browser's
`perspective` on a DOM element; the pieces are projected by a three.js camera. If those
disagree by even a little the pieces visibly float, so the correspondence is derived
rather than tuned:

- a CSS `perspective` of *P* is a pinhole camera *P* pixels in front of the plane, so the
  three.js camera sits at `(0, 0, P)` with `fov = 2·atan((H/2)/P)` and `aspect = W/H`,
  which reproduces the CSS projection exactly
- the board's transform is rebuilt on the scene root as a matrix, with the rotations
  negated because CSS measures y downwards and three.js measures it up
- the perspective distance is proportional to the board's on-screen size, so both
  projections stay identical as the player zooms

`board-pieces.cy.ts` guards the result end to end: the canvas matches the board region,
never takes a click, and places the robber on the hex coordinate the game reports.

### The fallback

`createPieceScene` returns `null` if a WebGL context cannot be created, and the flat SVG
stand-ins stay visible. A board with no pieces on it is not a degraded game, it is an
unplayable one, and the stand-ins already existed.

## Where it landed

| Concern | File |
| --- | --- |
| Scene, environment, camera wiring, 3D canvas | [`src/components/board/Tabletop.tsx`](../src/components/board/Tabletop.tsx) |
| Camera: pan, zoom, orbit, limits, recentre | [`src/hooks/useTabletopCamera.ts`](../src/hooks/useTabletopCamera.ts) |
| Piece geometry — house, keep, road, pawn | [`src/lib/board/pieces3d.ts`](../src/lib/board/pieces3d.ts) |
| three.js scene, lighting, shadows, camera match | [`src/lib/board/pieceScene.ts`](../src/lib/board/pieceScene.ts) |
| Board geometry both layers draw from | [`src/lib/board/geometry.ts`](../src/lib/board/geometry.ts) |
| Layer composition and the piece list | [`src/components/board/GameBoard.tsx`](../src/components/board/GameBoard.tsx) |
| Number tokens and the no-WebGL fallback | [`src/components/board/BoardPieces.tsx`](../src/components/board/BoardPieces.tsx) |
| Camera behaviour, including "sends nothing to the server" | [`cypress/e2e/board-camera.cy.ts`](../cypress/e2e/board-camera.cy.ts) |
| The 3D layer, end to end | [`cypress/e2e/board-pieces.cy.ts`](../cypress/e2e/board-pieces.cy.ts) |

## Revisit this if

The board itself needs relief, dynamic lighting or a free camera. The board plane is
isolated behind `Tabletop`, the pieces already live in a real scene graph, and the
legality selectors from #54 mean a new renderer would consume ids rather than re-deriving
rules — so moving the terrain into the same scene is a contained change, not a rewrite.
