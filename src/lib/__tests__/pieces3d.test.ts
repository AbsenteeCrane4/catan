import { describe, expect, it } from 'vitest';
import {
  PIECE_SIZE,
  cityGeometry,
  createPieceGeometries,
  roadGeometry,
  robberGeometry,
  settlementGeometry,
} from '@/lib/board/pieces3d';
import { boardView, toSceneSpace } from '@/lib/board/geometry';
import { createInitialState } from '@/lib/game/state/createInitialState';

/**
 * The 3D pieces, measured rather than looked at.
 *
 * Two things here are load-bearing and invisible in a screenshot until they are wrong.
 * Every piece must stand on z = 0, because the renderer drops it straight onto a board
 * coordinate and anything else leaves it sunk into the terrain or hovering over it. And
 * every piece must be centred on x and y, because that coordinate is a node or a hex
 * centre, not a corner.
 *
 * This runs without a graphics context: geometry is arithmetic, and only drawing it
 * needs WebGL.
 */

const measure = (geometry: { boundingBox: { min: { x: number; y: number; z: number }; max: { x: number; y: number; z: number } } | null; computeBoundingBox(): void }) => {
  geometry.computeBoundingBox();
  const box = geometry.boundingBox!;
  return {
    width: box.max.x - box.min.x,
    depth: box.max.y - box.min.y,
    height: box.max.z - box.min.z,
    base: box.min.z,
    centreX: (box.max.x + box.min.x) / 2,
    centreY: (box.max.y + box.min.y) / 2,
  };
};

describe('3D game pieces', () => {
  it('stands every piece on the board rather than in it', () => {
    for (const [kind, geometry] of Object.entries(createPieceGeometries())) {
      const { base } = measure(geometry);
      expect(base, `${kind} sits on z = 0`).toBeCloseTo(0, 4);
    }
  });

  it('centres every piece on the coordinate it will be placed at', () => {
    for (const [kind, geometry] of Object.entries(createPieceGeometries())) {
      const { centreX, centreY, width } = measure(geometry);
      // The city is deliberately asymmetric — a wing beside a tower — so it is allowed
      // more slack than the others, but it still has to sit roughly over its node.
      const tolerance = width * 0.12;
      expect(Math.abs(centreX), `${kind} is centred across`).toBeLessThan(tolerance);
      expect(Math.abs(centreY), `${kind} is centred front to back`).toBeLessThan(tolerance + 2);
    }
  });

  it('builds a settlement no larger than the size it advertises', () => {
    const { width, depth, height } = measure(settlementGeometry());

    // The roof overhangs the walls, so width is measured against the eaves.
    expect(width).toBeGreaterThan(PIECE_SIZE.settlement.width * 0.9);
    expect(width).toBeLessThan(PIECE_SIZE.settlement.width * 1.25);
    expect(depth).toBeLessThan(PIECE_SIZE.settlement.depth * 1.25);
    expect(height).toBeLessThan(PIECE_SIZE.settlement.height * 1.15);
  });

  it('gives a city a bigger silhouette than a settlement, not just a bigger copy', () => {
    const settlement = measure(settlementGeometry());
    const city = measure(cityGeometry());

    expect(city.height).toBeGreaterThan(settlement.height * 1.4);
    expect(city.width).toBeGreaterThan(settlement.width);
    // The tower is what makes a city recognisable at a glance: it has to be a good deal
    // taller than it is wide, which a house never is.
    expect(city.height / city.width).toBeGreaterThan(settlement.height / settlement.width);
  });

  it('builds a road one unit long so it can be scaled onto any edge', () => {
    const { width, depth, height } = measure(roadGeometry());

    expect(width).toBeCloseTo(1, 5);
    expect(depth).toBeCloseTo(PIECE_SIZE.road.width, 5);
    expect(height).toBeCloseTo(PIECE_SIZE.road.height, 5);
  });

  it('revolves the robber into a piece taller than it is wide', () => {
    const { width, depth, height } = measure(robberGeometry());

    expect(width).toBeCloseTo(PIECE_SIZE.robber.radius * 2, 1);
    expect(depth).toBeCloseTo(width, 1);
    expect(height).toBeCloseTo(PIECE_SIZE.robber.height, 1);
    expect(height).toBeGreaterThan(width * 1.5);
  });

  it('produces geometry with usable normals', () => {
    for (const [kind, geometry] of Object.entries(createPieceGeometries())) {
      const normals = geometry.getAttribute('normal');
      expect(normals, `${kind} has normals`).toBeTruthy();
      expect(normals.count).toBe(geometry.getAttribute('position').count);
      // A zero-length normal renders as a black facet.
      for (let i = 0; i < normals.count; i += 37) {
        const length = Math.hypot(normals.getX(i), normals.getY(i), normals.getZ(i));
        expect(length, `${kind} normal ${i} is unit length`).toBeCloseTo(1, 3);
      }
    }
  });
});

describe('toSceneSpace', () => {
  const view = boardView(createInitialState().nodes);

  it('puts the middle of the board at the scene origin', () => {
    const [x, y] = toSceneSpace(view, view.minX + view.w / 2, view.minY + view.h / 2);

    expect(x).toBeCloseTo(0, 6);
    expect(y).toBeCloseTo(0, 6);
  });

  it('flips y, because screens count downwards and three.js counts up', () => {
    const middleY = view.minY + view.h / 2;
    const [, above] = toSceneSpace(view, 0, middleY - 100);
    const [, below] = toSceneSpace(view, 0, middleY + 100);

    expect(above).toBeCloseTo(100, 6);
    expect(below).toBeCloseTo(-100, 6);
  });

  it('keeps x running the same way as the board', () => {
    const middleX = view.minX + view.w / 2;
    const [left] = toSceneSpace(view, middleX - 60, 0);
    const [right] = toSceneSpace(view, middleX + 60, 0);

    expect(left).toBeCloseTo(-60, 6);
    expect(right).toBeCloseTo(60, 6);
  });

  it('maps the corners of the view box to opposite corners of the scene', () => {
    const [x0, y0] = toSceneSpace(view, view.minX, view.minY);
    const [x1, y1] = toSceneSpace(view, view.minX + view.w, view.minY + view.h);

    expect(x0).toBeCloseTo(-view.w / 2, 6);
    expect(y0).toBeCloseTo(view.h / 2, 6);
    expect(x1).toBeCloseTo(view.w / 2, 6);
    expect(y1).toBeCloseTo(-view.h / 2, 6);
  });
});
