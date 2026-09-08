# Renderer spike: SVG vs React Three Fiber

**Issue:** #55 (sub-issue of #47) · **Outcome:** enhance the existing SVG, in a CSS 3D scene. No 3D engine.

`docs/DESIGN.md` §10 asks that we establish whether the tabletop in
`docs/design-reference-horizon-settlers.png` can be reached by enhancing the board we
have, before reaching for a renderer that would replace it. This is that comparison and
the decision it produced.

## What was actually being decided

Not "2D or 3D". The target needs four things, and only the fourth is a real fork:

1. An elevated perspective around 45–50°.
2. Pan, zoom and constrained orbit that feel like moving a tabletop.
3. Terrain, roads, settlements, cities, tokens, harbours and a robber that read as
   physical objects.
4. All of it without the camera touching React state, the game engine, or the test suite.

CSS 3D transforms give (1) and (2) outright — the browser does the perspective divide and,
crucially, the *inverse* transform for hit testing. The fork is (3): pieces on a tilted
plane lie down with it, and a house lying flat on the ground is a floor plan.

## The two candidates

### React Three Fiber

**For:** real geometry, real lights, real shadows; orbit controls out of the box; the
obvious answer if the board were being built from nothing.

**Against, in the order the objections actually bite:**

- **It deletes the test surface.** Every board `data-cy` — `hex`, `node`, `edge`,
  `harbour`, `hex-image`, `legal-target` — is a DOM node today. Inside a `<canvas>` there
  is no DOM, so `board-artwork`, `harbours`, `setup-phase`, `six-players-expansion`,
  `spectator` and `build-affordances` would all need rewriting against a bespoke test
  handle, and the 12 jsdom tests in `build-mode.test.tsx` — which compare the highlighted
  DOM against the legality selectors — could not run at all, because jsdom has no WebGL.
  That is a large, uninsured rewrite of the thing that proves the board is correct.
- **The existing tile art fights it.** `public/images/tiles/*.png` are painted hexes with
  a 3/4 view already baked in — trees standing up, cliffs at the tile edge. Texture-mapped
  onto a 3D prism they would read worse than they do now, so adopting R3F means
  commissioning new terrain as well.
- **It is not free at runtime or in the image.** `three` plus `@react-three/fiber` is
  several hundred KB into a bundle that is currently dependency-light, and the Docker
  runner stage installs production dependencies only.
- **Nothing in the reference needs it.** The reference is a *diorama seen from one fixed
  angle*, not a scene that has to be lit from arbitrary directions.

### Enhanced SVG in a CSS 3D scene — chosen

The board becomes a stack of layers inside one `perspective` context:

- The terrain, roads, harbours, legal-target markers and every click target stay in the
  existing SVG, which becomes the **board plane** and foreshortens with it.
- Height is stacked layers at different `translateZ`: the island's cliff is fifteen
  copies of the landmass silhouette, and a road's thickness is three slices of the same
  line.
- Pieces that must stand up — settlements, cities, the robber, number tokens — are
  **billboards**: positioned in the 3D world, then rotated back to face the camera.

**What that buys:**

- Every board selector keeps working, unchanged, because everything interactive is still
  the same DOM element in the same place. The browser maps a click through the 3D
  transform for us.
- The jsdom component tests keep running: CSS transforms are irrelevant to them.
- No new dependencies, no bundle growth, no change to the Docker image.
- The painted tile art is used as intended — printed on the board, foreshortened the way
  a real board's art is when you look at it from a chair.
- The camera is four numbers written onto two DOM nodes per frame. No React render, no
  reconciliation, and nothing near `GameState`.

**What it costs, honestly:**

- Lighting is painted, not computed: a gradient over the island silhouette and a fixed
  three-tone shading on each piece. Consistent, but it will not respond if the orbit is
  pushed to an extreme.
- Billboards are flat. At the constrained orbit range this reads as physical; it would
  not survive a free-flying camera, which is precisely the mental model
  `docs/DESIGN.md` §9 rules out.
- Depth sorting is the browser's, so overlapping coplanar layers need distinct Z values
  rather than being sorted for free.

## Decision

Enhance the SVG. The 3D-engine route buys computed lighting and free-camera freedom,
neither of which the design asks for, and pays for them by discarding the board's entire
test surface and its terrain art.

If a later issue wants dynamic lighting, terrain relief or a free camera, this decision
should be revisited — the board plane is already isolated behind `Tabletop`, and the
legality selectors from #54 mean a new renderer would consume ids rather than re-deriving
rules.

## Where it landed

| Concern | File |
| --- | --- |
| Scene, environment, cliff, billboards | [`src/components/board/Tabletop.tsx`](../src/components/board/Tabletop.tsx) |
| Camera: pan, zoom, orbit, limits, recentre | [`src/hooks/useTabletopCamera.ts`](../src/hooks/useTabletopCamera.ts) |
| Board geometry the renderer draws from | [`src/lib/board/geometry.ts`](../src/lib/board/geometry.ts) |
| Layer composition | [`src/components/board/GameBoard.tsx`](../src/components/board/GameBoard.tsx) |
| Standing pieces and number tokens | [`src/components/board/BoardPieces.tsx`](../src/components/board/BoardPieces.tsx) |
| Camera behaviour, including "sends nothing to the server" | [`cypress/e2e/board-camera.cy.ts`](../cypress/e2e/board-camera.cy.ts) |
