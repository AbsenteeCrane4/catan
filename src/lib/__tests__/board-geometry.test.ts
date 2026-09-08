import { describe, expect, it } from 'vitest';
import { createInitialState } from '@/lib/game/state/createInitialState';
import { HEX_SIZE, DEFAULT_SEATS } from '@/lib/constants';
import { hexToPixel } from '@/lib/hex-utils';
import { edgeId } from '@/lib/game/helpers/buildLegality';
import {
  HEX_CORNERS,
  boardEdges,
  boardView,
  islandPath,
  toViewSpace,
} from '@/lib/board/geometry';

/**
 * The geometry the tabletop renderer draws from.
 *
 * It is worth testing separately from the components because it is the join between the
 * reducer's coordinates and the picture: if any of this drifts, pieces land somewhere the
 * game engine does not agree with, and no amount of styling makes that visible.
 */

const baseBoard = () => createInitialState();
const expansionBoard = () =>
  createInitialState({
    players: [
      ...DEFAULT_SEATS,
      { name: 'Player 5', color: 'green' },
      { name: 'Player 6', color: 'brown' },
    ],
  });

/** Rounded, because two hexes must agree on a shared corner to the pixel. */
const key = (x: number, y: number) => `${x.toFixed(4)},${y.toFixed(4)}`;

describe('board geometry', () => {
  describe('hex corners', () => {
    it('describes a pointy-top hexagon of the board size', () => {
      expect(HEX_CORNERS).toHaveLength(6);

      for (const [x, y] of HEX_CORNERS) {
        expect(Math.hypot(x, y)).toBeCloseTo(HEX_SIZE, 6);
      }
      // Corner 0 sits directly below the centre, which is what makes the hex pointy-top.
      expect(HEX_CORNERS[0][0]).toBeCloseTo(0, 6);
      expect(HEX_CORNERS[0][1]).toBeCloseTo(HEX_SIZE, 6);
    });

    it('places neighbouring hexes on exactly the same corners', () => {
      // The island silhouette is the union of the tile polygons, and a union only closes
      // up if adjacent hexes share their corner coordinates exactly. A rounding drift
      // here would draw hairline cracks across the landmass.
      const { hexes } = baseBoard();
      const corners = new Map<string, number>();

      for (const hex of hexes) {
        const { x, y } = hexToPixel(hex.q, hex.r);
        for (const [cx, cy] of HEX_CORNERS) {
          const at = key(x + cx, y + cy);
          corners.set(at, (corners.get(at) ?? 0) + 1);
        }
      }

      // 19 hexes × 6 corners = 114 corner slots over far fewer distinct points, which can
      // only happen if the shared ones coincide.
      const shared = [...corners.values()].filter(count => count > 1);
      expect(shared.length).toBeGreaterThan(0);
      expect([...corners.values()].reduce((a, b) => a + b, 0)).toBe(hexes.length * 6);
      expect(corners.size).toBeLessThan(hexes.length * 6);
    });
  });

  describe('islandPath', () => {
    it('draws one closed subpath per hex', () => {
      const { hexes } = baseBoard();
      const path = islandPath(hexes);

      expect(path.match(/M/g)).toHaveLength(hexes.length);
      expect(path.match(/Z/g)).toHaveLength(hexes.length);
      expect(path).not.toContain('NaN');
    });

    it('insets every corner towards its own hex centre', () => {
      const [hex] = baseBoard().hexes;
      const centre = hexToPixel(hex.q, hex.r);
      const inset = 10;

      const corners = islandPath([hex], inset)
        .replace(/[MZ]/g, ' ')
        .trim()
        .split('L')
        .map(pair => pair.trim().split(',').map(Number));

      for (const [x, y] of corners) {
        expect(Math.hypot(x - centre.x, y - centre.y)).toBeCloseTo(HEX_SIZE - inset, 6);
      }
    });
  });

  describe('boardView', () => {
    it('contains every node on both board shapes', () => {
      for (const state of [baseBoard(), expansionBoard()]) {
        const view = boardView(state.nodes);

        for (const node of state.nodes) {
          expect(node.pixelPos.x).toBeGreaterThanOrEqual(view.minX);
          expect(node.pixelPos.y).toBeGreaterThanOrEqual(view.minY);
          expect(node.pixelPos.x).toBeLessThanOrEqual(view.minX + view.w);
          expect(node.pixelPos.y).toBeLessThanOrEqual(view.minY + view.h);
        }
      }
    });

    it('follows the expansion board off the origin instead of assuming it is centred', () => {
      // The expansion board's middle row has an even width, so it is not centred on the
      // origin. Anything that assumed symmetry would frame it wrongly.
      const view = boardView(expansionBoard().nodes);
      const centreX = view.minX + view.w / 2;

      expect(Math.abs(centreX)).toBeGreaterThan(1);
    });

    it('leaves room off the coast for the harbour docks', () => {
      const state = baseBoard();
      const view = boardView(state.nodes);
      const nodeSpan = Math.max(...state.nodes.map(n => n.pixelPos.x)) -
        Math.min(...state.nodes.map(n => n.pixelPos.x));

      expect(view.w).toBeGreaterThan(nodeSpan + HEX_SIZE * 2);
    });

    it('survives an empty board without producing a zero-sized view', () => {
      const view = boardView([]);
      expect(view.w).toBeGreaterThan(0);
      expect(view.h).toBeGreaterThan(0);
    });
  });

  describe('toViewSpace', () => {
    it('puts the top-left of the view at the origin of the box', () => {
      const view = boardView(baseBoard().nodes);
      expect(toViewSpace(view, view.minX, view.minY)).toEqual({ left: 0, top: 0 });
    });
  });

  describe('boardEdges', () => {
    it('yields every road slot exactly once, keyed the way the reducer keys roads', () => {
      for (const state of [baseBoard(), expansionBoard()]) {
        const edges = boardEdges(state.nodes);
        const ids = edges.map(e => e.id);

        expect(new Set(ids).size).toBe(ids.length);
        for (const edge of edges) {
          expect(edge.id).toBe(edgeId(edge.a.id, edge.b.id));
          expect(edge.a.neighbors).toContain(edge.b.id);
        }
      }
    });

    it('covers every neighbour relation on the board', () => {
      const state = baseBoard();
      const expected = new Set(
        state.nodes.flatMap(node => node.neighbors.map(other => edgeId(node.id, other)))
      );

      expect(new Set(boardEdges(state.nodes).map(e => e.id))).toEqual(expected);
    });
  });
});
