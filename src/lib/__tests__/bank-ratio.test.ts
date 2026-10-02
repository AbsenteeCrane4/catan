import { describe, expect, it } from 'vitest';
import type { Harbour } from '@/types/catan';
import { bankRatio } from '@/lib/game/helpers/bankRatio';

const harbour = (id: string, type: Harbour['type'], nodeIds: [string, string]): Harbour =>
  ({ id, type, nodeIds, x: 0, y: 0, angle: 0 });

const settled = (nodeId: string, playerId = 0) => ({ [nodeId]: { nodeId, playerId, isCity: false } });

describe('bankRatio', () => {
  it('is 4:1 with no harbour', () => {
    expect(bankRatio({ harbours: [harbour('h', '3:1', ['a', 'b'])], settlements: {} }, 0, 'wood')).toBe(4);
  });

  it('is 3:1 with a generic harbour', () => {
    expect(bankRatio({ harbours: [harbour('h', '3:1', ['a', 'b'])], settlements: settled('b') }, 0, 'wood')).toBe(3);
  });

  it("ignores another player's harbour", () => {
    expect(bankRatio({ harbours: [harbour('h', '3:1', ['a', 'b'])], settlements: settled('a', 1) }, 0, 'wood')).toBe(4);
  });

  it('is 2:1 only for the resource the harbour names', () => {
    const state = { harbours: [harbour('h', 'wood', ['a', 'b'])], settlements: settled('a') };
    expect(bankRatio(state, 0, 'wood')).toBe(2);
    expect(bankRatio(state, 0, 'ore')).toBe(4);
  });

  it('keeps the 2:1 rate whichever order the harbours are listed in', () => {
    const harbours = [harbour('w', 'wood', ['a', 'b']), harbour('g', '3:1', ['c', 'd'])];
    const settlements = { ...settled('a'), ...settled('c') };
    expect(bankRatio({ harbours, settlements }, 0, 'wood')).toBe(2);
    expect(bankRatio({ harbours: [...harbours].reverse(), settlements }, 0, 'wood')).toBe(2);
  });
});
