import { describe, it, expect } from 'vitest';
import {
  BASE_ROWS,
  BOARD_PRESETS,
  EXPANSION_ROWS,
  HexCoord,
  hexRowsToCoords,
} from '@/lib/board-presets';

/** The original radius-based coordinate rule, kept here as the reference implementation. */
function radiusCoords(radius: number): HexCoord[] {
  const coords: HexCoord[] = [];
  for (let q = -radius; q <= radius; q++) {
    for (let r = -radius; r <= radius; r++) {
      const s = -q - r;
      if (Math.abs(s) <= radius) coords.push({ q, r, s });
    }
  }
  return coords;
}

const canonical = (coords: HexCoord[]) =>
  coords.map(c => `${c.q},${c.r},${c.s}`).sort();

describe('hexRowsToCoords', () => {
  it('reproduces the radius-2 board exactly', () => {
    // The whole point of the row table: it must be a drop-in for the old rule, or every
    // existing board assertion silently starts describing a different board.
    expect(canonical(hexRowsToCoords(BASE_ROWS))).toEqual(canonical(radiusCoords(2)));
  });

  it('reproduces a radius-1 board too', () => {
    expect(canonical(hexRowsToCoords({ widths: [2, 3, 2], rStart: -1, qStart: 0 })))
      .toEqual(canonical(radiusCoords(1)));
  });

  it('keeps every coordinate on the q + r + s === 0 plane', () => {
    for (const c of hexRowsToCoords(EXPANSION_ROWS)) {
      expect(c.q + c.r + c.s).toBe(0);
    }
  });

  it('produces no duplicate coordinates', () => {
    const coords = hexRowsToCoords(EXPANSION_ROWS);
    expect(new Set(canonical(coords)).size).toBe(coords.length);
  });
});

describe('EXPANSION_ROWS', () => {
  it('describes 30 hexes', () => {
    expect(hexRowsToCoords(EXPANSION_ROWS)).toHaveLength(30);
  });

  it('lays out the official 3-4-5-6-5-4-3 rows', () => {
    const byRow = new Map<number, number[]>();
    for (const c of hexRowsToCoords(EXPANSION_ROWS)) {
      byRow.set(c.r, [...(byRow.get(c.r) ?? []), c.q].sort((a, b) => a - b));
    }
    expect([...byRow.entries()].sort((a, b) => a[0] - b[0])).toEqual([
      [-3, [0, 1, 2]],
      [-2, [-1, 0, 1, 2]],
      [-1, [-2, -1, 0, 1, 2]],
      [0, [-3, -2, -1, 0, 1, 2]],
      [1, [-3, -2, -1, 0, 1]],
      [2, [-3, -2, -1, 0]],
      [3, [-3, -2, -1]],
    ]);
  });
});

describe('BOARD_PRESETS', () => {
  it.each(['base', 'expansion'] as const)('%s pools line up with its hex count', kind => {
    const preset = BOARD_PRESETS[kind];
    const hexCount = hexRowsToCoords(preset.rows).length;
    const deserts = preset.resources.filter(r => r === 'desert').length;

    expect(preset.resources).toHaveLength(hexCount);
    // Deserts carry no number token, so the token pool is exactly the shortfall.
    expect(preset.tokens).toHaveLength(hexCount - deserts);
  });

  it('gives the base board 19 hexes, 1 desert, 9 ports and a 25-card deck', () => {
    const { rows, resources, ports, devCards } = BOARD_PRESETS.base;
    expect(hexRowsToCoords(rows)).toHaveLength(19);
    expect(resources.filter(r => r === 'desert')).toHaveLength(1);
    expect(ports).toHaveLength(9);
    expect(Object.values(devCards).reduce((a, b) => a + b, 0)).toBe(25);
  });

  it('gives the expansion board 30 hexes, 2 deserts, 11 ports and a 34-card deck', () => {
    const { rows, resources, tokens, ports, devCards } = BOARD_PRESETS.expansion;
    expect(hexRowsToCoords(rows)).toHaveLength(30);
    expect(resources.filter(r => r === 'desert')).toHaveLength(2);
    expect(tokens).toHaveLength(28);
    expect(ports).toHaveLength(11);
    expect(Object.values(devCards).reduce((a, b) => a + b, 0)).toBe(34);
  });

  it('gives the expansion a second sheep harbour, not a sixth resource type', () => {
    const specific = BOARD_PRESETS.expansion.ports.filter(p => p !== '3:1');
    expect(specific).toHaveLength(6);
    expect(specific.filter(p => p === 'sheep')).toHaveLength(2);
    expect(new Set(specific).size).toBe(5);
  });

  it('carries three of each red number and two each of 2 and 12', () => {
    // 6 and 8 are the red numbers; the extension holds three of each, one more than base.
    const tokens = BOARD_PRESETS.expansion.tokens;
    const count = (n: number) => tokens.filter(t => t === n).length;
    expect(count(6)).toBe(3);
    expect(count(8)).toBe(3);
    expect(count(2)).toBe(2);
    expect(count(12)).toBe(2);
  });
});
