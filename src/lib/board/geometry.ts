import { GameNode, Hex } from '@/types/catan';
import { HEX_SIZE } from '@/lib/constants';
import { edgeId } from '@/lib/game/helpers/buildLegality';
import { hexToPixel } from '@/lib/hex-utils';

/**
 * Pure board geometry for the board renderer.
 *
 * Everything here is derived from the same `HEX_SIZE` and axial coordinates the reducer
 * already knows about — the renderer never invents positions of its own, so a piece can
 * never be drawn somewhere the game engine does not think it is.
 */

/**
 * The six corners of a pointy-top hex, in board units, relative to its centre.
 *
 * Matches the polygon the flat board drew: corner i is at angle 60i measured from the
 * +y axis, so corner 0 is directly below the centre.
 */
export const HEX_CORNERS: readonly (readonly [number, number])[] = Array.from(
  { length: 6 },
  (_, i) => {
    const rad = (Math.PI / 180) * (60 * i);
    return [HEX_SIZE * Math.sin(rad), HEX_SIZE * Math.cos(rad)] as const;
  }
);

/** `points` for a single hex polygon centred on the origin. */
export const HEX_POLYGON_POINTS = HEX_CORNERS.map(([x, y]) => `${x},${y}`).join(' ');

/**
 * One SVG path covering the whole landmass, as a closed subpath per hex.
 *
 * Neighbouring hexes share their edges exactly, so a nonzero fill of this path is the
 * union of the tiles with no interior seams — which is what makes it usable as the
 * island silhouette for cliffs, shadow, coastline and lighting without having to trace
 * an outline. `inset` shrinks each hex towards its own centre, used to stack slightly
 * smaller copies underneath for a tapered cliff.
 */
export function islandPath(hexes: readonly Hex[], inset = 0): string {
  const k = (HEX_SIZE - inset) / HEX_SIZE;

  return hexes
    .map(hex => {
      const { x, y } = hexToPixel(hex.q, hex.r);
      const corners = HEX_CORNERS.map(([cx, cy]) => `${x + cx * k},${y + cy * k}`);
      return `M${corners.join('L')}Z`;
    })
    .join('');
}

export interface BoardView {
  minX: number;
  minY: number;
  w: number;
  h: number;
}

/**
 * The board's bounding box in board units, padded for the harbour docks that sit off the
 * coast. Derived from the node positions rather than assumed, because the expansion
 * board's middle row has an even width and so is not centred on the origin.
 *
 * The padding is what the harbour platform actually needs and no more: it is dead space
 * the board's on-screen scale is then divided by, so every extra unit shrinks the board.
 */
export function boardView(nodes: readonly GameNode[], pad = HEX_SIZE * 1.45): BoardView {
  if (nodes.length === 0) return { minX: -pad, minY: -pad, w: pad * 2, h: pad * 2 };

  const xs = nodes.map(n => n.pixelPos.x);
  const ys = nodes.map(n => n.pixelPos.y);
  const minX = Math.min(...xs) - pad;
  const minY = Math.min(...ys) - pad;

  return { minX, minY, w: Math.max(...xs) + pad - minX, h: Math.max(...ys) + pad - minY };
}


export interface BoardEdge {
  id: string;
  a: GameNode;
  b: GameNode;
}

/**
 * Every road slot on the board, once each.
 *
 * Node adjacency is symmetric, so walking it naively yields A-B and B-A; the shared
 * `edgeId` is what collapses them, and it is the same id the reducer keys `roads` by.
 */
export function boardEdges(nodes: readonly GameNode[]): BoardEdge[] {
  const byId = new Map(nodes.map(n => [n.id, n]));
  const seen = new Set<string>();
  const edges: BoardEdge[] = [];

  for (const node of nodes) {
    for (const neighborId of node.neighbors) {
      const neighbor = byId.get(neighborId);
      if (!neighbor) continue;

      const id = edgeId(node.id, neighborId);
      if (seen.has(id)) continue;
      seen.add(id);
      edges.push({ id, a: node, b: neighbor });
    }
  }

  return edges;
}
