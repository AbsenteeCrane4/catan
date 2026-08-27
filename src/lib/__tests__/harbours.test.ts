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
