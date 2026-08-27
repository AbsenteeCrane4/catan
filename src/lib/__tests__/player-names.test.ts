import { describe, it, expect } from 'vitest';
import { nameOf, playerName } from '@/lib/game/helpers/playerName';
import { createInitialState } from '@/lib/game/state/createInitialState';
import { catanReducer } from '@/lib/game-reducer';
import { GameState } from '@/types/catan';

describe('playerName', () => {
  it('uses the chosen name', () => {
    expect(playerName({ id: 2, name: 'Ada' })).toBe('Ada');
  });

  it('trims surrounding whitespace off the stored name', () => {
    expect(playerName({ id: 0, name: '  Ada  ' })).toBe('Ada');
  });

  it('falls back to "Player N" when the name is empty or blank', () => {
    expect(playerName({ id: 0, name: '' })).toBe('Player 1');
    expect(playerName({ id: 3, name: '   ' })).toBe('Player 4');
  });

  it('falls back for a missing player, using the supplied id', () => {
    expect(playerName(undefined, 1)).toBe('Player 2');
  });

  it('falls back to "Player 1" when nothing at all is known', () => {
    expect(playerName(undefined)).toBe('Player 1');
  });
});

describe('nameOf', () => {
  it('reads the name out of a players slice', () => {
    const state = { players: [{ id: 0, name: 'Ada' }, { id: 1, name: 'Grace' }] };
    expect(nameOf(state as Pick<GameState, 'players'>, 1)).toBe('Grace');
  });

  it('does not render "undefined" for an out-of-range id', () => {
    const state = { players: [] };
    expect(nameOf(state as unknown as Pick<GameState, 'players'>, 4)).toBe('Player 5');
  });
});

describe('log messages', () => {
  it('uses the chosen names rather than the seat number', () => {
    const state = createInitialState({
      players: [
        { name: 'Ada', color: 'red' },
        { name: 'Grace', color: 'blue' },
      ],
    });

    const next = catanReducer(state, {
      type: 'BUILD_SETTLEMENT',
      payload: { nodeId: state.nodes[0].id, playerId: 0 },
    });

    expect(next.gameLog[0]).toBe('Ada built a settlement.');
    expect(next.gameLog[0]).not.toContain('Player 1');
  });
});
