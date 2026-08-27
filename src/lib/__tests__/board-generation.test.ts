import { describe, it, expect, vi } from 'vitest';
import { BoardSpec, createDevCardDeck, generateBoard } from '@/lib/hex-utils';
import { BOARD_PRESETS } from '@/lib/board-presets';
import { EXPANSION_DEV_CARDS } from '@/lib/constants';
import { Hex } from '@/types/catan';

const specFor = (kind: 'base' | 'expansion'): BoardSpec => {
  const { rows, resources, tokens } = BOARD_PRESETS[kind];
  return { rows, resources, tokens };
};

const isRed = (token: number | null) => token === 6 || token === 8;

const adjacent = (a: Hex, b: Hex) =>
  Math.abs(a.q - b.q) + Math.abs(a.r - b.r) + Math.abs(a.s - b.s) === 2;

const redConflicts = (hexes: Hex[]) =>
  hexes.filter(a => isRed(a.numberToken) && hexes.some(b => b.id !== a.id && isRed(b.numberToken) && adjacent(a, b)));

describe('generateBoard (spec form)', () => {
  it.each(['base', 'expansion'] as const)('fills every %s hex with a resource', kind => {
    const hexes = generateBoard(specFor(kind));
    expect(hexes.every(h => h.resource !== undefined)).toBe(true);
    expect(hexes.every(h => h.resource === 'desert' || typeof h.numberToken === 'number')).toBe(true);
  });

  it('rejects a resource pool that does not fill the grid', () => {
    // Previously this silently produced hexes with `resource: undefined`, which render
    // as blank tiles and give no resources — a bug that only shows up mid-game.
    const spec = specFor('expansion');
    expect(() => generateBoard({ ...spec, resources: spec.resources.slice(0, 29) })).toThrow(
      /do not match the grid/
    );
  });

  it('rejects a token pool that does not cover the numbered hexes', () => {
    const spec = specFor('expansion');
    expect(() => generateBoard({ ...spec, tokens: spec.tokens.slice(0, 27) })).toThrow(
      /do not match the grid/
    );
  });

  it('still only warns for the legacy radius form', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(() => generateBoard(1)).not.toThrow(); // radius 1 vs the 19-hex default pool
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe('6/8 separation', () => {
  it.each(['base', 'expansion'] as const)('never adjoins two red numbers on %s over 50 boards', kind => {
    for (let run = 0; run < 50; run++) {
      expect(redConflicts(generateBoard(specFor(kind)))).toHaveLength(0);
    }
  });

  it('repairs a layout it can never shuffle out of', () => {
    // A constant RNG makes every shuffle produce the identical (illegal) permutation, so
    // all MAX_LAYOUT_ATTEMPTS fail and the repair fallback runs. That branch is otherwise
    // unreachable — under Math.random a legal layout turns up within ~30 attempts.
    const hexes = generateBoard(specFor('expansion'), () => 0);
    expect(hexes).toHaveLength(30);
    expect(redConflicts(hexes)).toHaveLength(0);
  });

  it('still returns a complete board when it falls back to the repair', () => {
    const hexes = generateBoard(specFor('expansion'), () => 0);
    const tokens = hexes.map(h => h.numberToken).filter((t): t is number => t !== null);
    // The repair only ever swaps tokens between hexes, so the multiset must be preserved.
    expect(tokens.slice().sort((a, b) => a - b))
      .toEqual(BOARD_PRESETS.expansion.tokens.slice().sort((a, b) => a - b));
    expect(hexes.filter(h => h.resource === 'desert')).toHaveLength(2);
  });
});

describe('createDevCardDeck', () => {
  it('defaults to the 25-card base deck', () => {
    const deck = createDevCardDeck();
    expect(deck).toHaveLength(25);
    expect(deck.filter(c => c === 'knight')).toHaveLength(14);
    expect(deck.filter(c => c === 'victoryPoint')).toHaveLength(5);
  });

  it('builds the 34-card extension deck from its counts', () => {
    const deck = createDevCardDeck(EXPANSION_DEV_CARDS);
    expect(deck).toHaveLength(34);
    expect(deck.filter(c => c === 'knight')).toHaveLength(20);
    expect(deck.filter(c => c === 'victoryPoint')).toHaveLength(6);
    expect(deck.filter(c => c === 'roadBuilding')).toHaveLength(3);
    expect(deck.filter(c => c === 'yearOfPlenty')).toHaveLength(3);
    expect(deck.filter(c => c === 'monopoly')).toHaveLength(2);
  });

  it('shuffles the deck rather than returning it in declaration order', () => {
    const decks = Array.from({ length: 5 }, () => createDevCardDeck().join(','));
    expect(new Set(decks).size).toBeGreaterThan(1);
  });
});
