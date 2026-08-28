import { describe, it, expect } from 'vitest';
import { generateBoard, generateHarbours, getNodesForBoard } from '@/lib/hex-utils';
import { BOARD_PRESETS } from '@/lib/board-presets';
import { GameNode, Harbour, PortResource } from '@/types/catan';

const boardFor = (kind: 'base' | 'expansion') => {
  const preset = BOARD_PRESETS[kind];
  const hexes = generateBoard({
    rows: preset.rows,
    resources: preset.resources,
    tokens: preset.tokens,
  });
  return { preset, hexes, nodes: getNodesForBoard(hexes) };
};

/** An edge is coastal when its two nodes share exactly one hex — i.e. it faces the sea. */
function coastalEdgeKeys(nodes: GameNode[]): Set<string> {
  const byId = new Map(nodes.map(n => [n.id, n]));
  const keys = new Set<string>();

  for (const n1 of nodes) {
    for (const neighborId of n1.neighbors) {
      const n2 = byId.get(neighborId);
      if (!n2) continue;
      if (n1.hexIds.filter(id => n2.hexIds.includes(id)).length === 1) {
        keys.add([n1.id, n2.id].sort().join('|'));
      }
    }
  }
  return keys;
}

const sortedTypes = (types: PortResource[]) => [...types].sort();
const harbourKey = (h: Harbour) => [...h.nodeIds].sort().join('|');

/**
 * The coastline is a single cycle (every coastal node has exactly two coastal
 * neighbours). Walking it gives each coastal node a position 0..N-1, so the number of
 * free (non-harbour) nodes between two harbours can be measured exactly instead of
 * approximated from angle.
 */
function coastalWalk(nodes: GameNode[]): string[] {
  const byId = new Map(nodes.map(n => [n.id, n]));
  const coastalAdj = new Map<string, string[]>();
  for (const n1 of nodes) {
    for (const neighborId of n1.neighbors) {
      const n2 = byId.get(neighborId);
      if (!n2) continue;
      if (n1.hexIds.filter(id => n2.hexIds.includes(id)).length === 1) {
        coastalAdj.set(n1.id, [...(coastalAdj.get(n1.id) ?? []), n2.id]);
      }
    }
  }

  const start = [...coastalAdj.keys()][0];
  const walk = [start];
  let prev: string | null = null;
  let cur = start;
  for (;;) {
    const next = coastalAdj.get(cur)!.find(id => id !== prev)!;
    if (next === start) break;
    walk.push(next);
    prev = cur;
    cur = next;
  }
  return walk;
}

/** Free coastal nodes between each harbour and the next one, walking around the ring. */
function harbourGaps(harbours: Harbour[], walk: string[]): number[] {
  const posInWalk = new Map(walk.map((id, i) => [id, i]));
  const total = walk.length;

  const starts = harbours
    .map(h => {
      const [p, q] = h.nodeIds.map(id => posInWalk.get(id)!);
      // A harbour's two nodes are walk-adjacent; whichever one is immediately followed
      // by the other (mod the ring) is where it "starts" — required to handle the
      // harbour that straddles the walk's arbitrary 0/N-1 seam correctly.
      if ((p + 1) % total === q) return p;
      if ((q + 1) % total === p) return q;
      throw new Error(`harbour nodes are not walk-adjacent: ${p}, ${q}`);
    })
    .sort((a, b) => a - b);

  return starts.map((idx, i) => {
    const next = starts[(i + 1) % starts.length] + (i === starts.length - 1 ? total : 0);
    return next - idx - 2;
  });
}

describe.each(['base', 'expansion'] as const)('generateHarbours on the %s board', kind => {
  const expectedCount = BOARD_PRESETS[kind].ports.length;

  it(`places all ${expectedCount} ports on every one of 100 boards`, () => {
    // The generator walks a ring of coastal edges and skips any that would share a node
    // with an already-placed port. If it runs off the end of the ring it used to return
    // a short list silently, leaving the board missing harbours.
    for (let run = 0; run < 100; run++) {
      const { preset, nodes } = boardFor(kind);
      expect(generateHarbours(nodes, preset.ports)).toHaveLength(expectedCount);
    }
  });

  it('produces exactly the port types in the pool', () => {
    const { preset, nodes } = boardFor(kind);
    const harbours = generateHarbours(nodes, preset.ports);
    expect(sortedTypes(harbours.map(h => h.type))).toEqual(sortedTypes(preset.ports));
  });

  it('never lets two harbours share a node', () => {
    for (let run = 0; run < 25; run++) {
      const { preset, nodes } = boardFor(kind);
      const used = generateHarbours(nodes, preset.ports).flatMap(h => h.nodeIds);
      expect(new Set(used).size).toBe(used.length);
    }
  });

  it('places every harbour on a coastal edge', () => {
    for (let run = 0; run < 25; run++) {
      const { preset, nodes } = boardFor(kind);
      const coastal = coastalEdgeKeys(nodes);
      for (const harbour of generateHarbours(nodes, preset.ports)) {
        expect(coastal.has(harbourKey(harbour))).toBe(true);
      }
    }
  });

  it('gives each harbour two distinct adjacent nodes', () => {
    const { preset, nodes } = boardFor(kind);
    const byId = new Map(nodes.map(n => [n.id, n]));

    for (const harbour of generateHarbours(nodes, preset.ports)) {
      const [a, b] = harbour.nodeIds;
      expect(a).not.toBe(b);
      expect(byId.get(a)?.neighbors).toContain(b);
      expect(byId.get(b)?.neighbors).toContain(a);
    }
  });

  it('spaces harbours with the exact 1-or-2-node gap mix a real board has', () => {
    const { preset, nodes } = boardFor(kind);
    const walk = coastalWalk(nodes);
    const total = walk.length;
    const count = preset.ports.length;
    const freeNodes = total - 2 * count;
    const baseGap = Math.floor(freeNodes / count);
    const wideGapCount = freeNodes % count;

    for (let run = 0; run < 50; run++) {
      const gaps = harbourGaps(generateHarbours(nodes, preset.ports), walk);
      expect(gaps.filter(g => g === baseGap)).toHaveLength(count - wideGapCount);
      expect(gaps.filter(g => g === baseGap + 1)).toHaveLength(wideGapCount);
    }
  });

  it('varies which specific gaps are wide from game to game', () => {
    // The mix of gap sizes is fixed by the arithmetic above, but which particular
    // stretches of coastline get the extra node should be shuffled — otherwise every
    // game would show the exact same layout, which reads as "there's only ever 1 node
    // between harbours" to anyone who always looks at the same handful of ports.
    const { preset, nodes } = boardFor(kind);
    const walk = coastalWalk(nodes);
    const layouts = new Set<string>();
    for (let run = 0; run < 20; run++) {
      const gaps = harbourGaps(generateHarbours(nodes, preset.ports), walk);
      layouts.add(gaps.join(','));
    }
    expect(layouts.size).toBeGreaterThan(1);
  });

  it('gives every harbour a unique id and a midpoint between its two nodes', () => {
    const { preset, nodes } = boardFor(kind);
    const byId = new Map(nodes.map(n => [n.id, n]));
    const harbours = generateHarbours(nodes, preset.ports);

    expect(new Set(harbours.map(h => h.id)).size).toBe(harbours.length);

    for (const harbour of harbours) {
      const [a, b] = harbour.nodeIds.map(id => byId.get(id)!);
      expect(harbour.x).toBeCloseTo((a.pixelPos.x + b.pixelPos.x) / 2, 5);
      expect(harbour.y).toBeCloseTo((a.pixelPos.y + b.pixelPos.y) / 2, 5);
    }
  });
});

describe('board geometry', () => {
  it('gives the base board 54 nodes and 72 edges', () => {
    const { nodes } = boardFor('base');
    const edges = nodes.reduce((sum, n) => sum + n.neighbors.length, 0) / 2;
    expect(nodes).toHaveLength(54);
    expect(edges).toBe(72);
  });

  it('gives the expansion board 80 nodes and 109 edges', () => {
    const { nodes } = boardFor('expansion');
    const edges = nodes.reduce((sum, n) => sum + n.neighbors.length, 0) / 2;
    expect(nodes).toHaveLength(80);
    expect(edges).toBe(109);
  });
});
