import { describe, it, expect } from 'vitest';
import { createInitialState, SeatConfig } from '@/lib/game/state/createInitialState';
import { DEFAULT_SEATS, PLAYER_COLORS } from '@/lib/constants';
import { BOARD_PRESETS } from '@/lib/board-presets';

/** Seats named A, B, C... in the first `count` palette colours. */
const seats = (count: number): SeatConfig[] =>
  Array.from({ length: count }, (_, i) => ({
    name: String.fromCharCode(65 + i),
    color: PLAYER_COLORS[i],
  }));

describe('createInitialState', () => {
  describe('default seating', () => {
    it('seats four players when called with no options', () => {
      const state = createInitialState();
      expect(state.players).toHaveLength(4);
    });

    it('names the default players "Player 1".."Player 4"', () => {
      // Load-bearing: several suites assert on log strings containing these exact names.
      expect(createInitialState().players.map(p => p.name)).toEqual([
        'Player 1', 'Player 2', 'Player 3', 'Player 4',
      ]);
    });

    it('gives the default players the first four palette colours', () => {
      expect(createInitialState().players.map(p => p.color)).toEqual(
        DEFAULT_SEATS.map(s => s.color)
      );
    });
  });

  describe.each([2, 3, 4, 5, 6])('with %i players', count => {
    const config = seats(count);
    // A pure factory, so one board per count is enough — no beforeEach needed.
    const state = createInitialState({ players: config });

    it('creates exactly that many players', () => {
      expect(state.players).toHaveLength(count);
    });

    it('preserves the chosen names and colours in seat order', () => {
      expect(state.players.map(p => ({ name: p.name, color: p.color }))).toEqual(config);
    });

    it('satisfies the players[i].id === i invariant', () => {
      // The reducer indexes state.players[playerId] everywhere; if ids ever drift from
      // array positions, every building silently reassigns to the wrong player.
      state.players.forEach((player, i) => expect(player.id).toBe(i));
    });

    it('starts every player with no resources, cards or victory points', () => {
      for (const player of state.players) {
        expect(Object.values(player.resources)).toEqual([0, 0, 0, 0, 0]);
        expect(player.victoryPoints).toBe(0);
        expect(player.knightsPlayed).toBe(0);
        expect(player.devCards).toEqual({ playable: [], boughtThisTurn: [], played: [] });
        expect(player.harbours).toEqual([]);
      }
    });

    it('opens on the first player in the setup phase', () => {
      expect(state.currentPlayerIndex).toBe(0);
      expect(state.phase).toBe('setup1');
      expect(state.setupActionRequired).toBe('settlement');
    });

    it('names the first player in the opening log line', () => {
      expect(state.gameLog[0]).toContain(config[0].name);
    });

    it('places the robber on a desert hex', () => {
      const robberHex = state.hexes.find(h => h.id === state.robberHexId);
      expect(robberHex?.resource).toBe('desert');
    });
  });

  describe('board kind derivation', () => {
    it.each([2, 3, 4])('uses the base board for %i players', count => {
      expect(createInitialState({ players: seats(count) }).boardKind).toBe('base');
    });

    it.each([5, 6])('uses the expansion board for %i players', count => {
      expect(createInitialState({ players: seats(count) }).boardKind).toBe('expansion');
    });

    it('honours an explicit boardKind over the player count', () => {
      const state = createInitialState({ players: seats(6), boardKind: 'base' });
      expect(state.boardKind).toBe('base');
      expect(state.hexes).toHaveLength(19);
    });
  });

  describe('the board it actually builds', () => {
    it('gives a 4 player game the classic 19-hex board', () => {
      const state = createInitialState({ players: seats(4) });
      expect(state.hexes).toHaveLength(19);
      expect(state.nodes).toHaveLength(54);
      expect(state.harbours).toHaveLength(9);
      expect(state.devCardDeck).toHaveLength(25);
      expect(state.hexes.filter(h => h.resource === 'desert')).toHaveLength(1);
    });

    it.each([5, 6])('gives a %i player game the 30-hex extension board', count => {
      const state = createInitialState({ players: seats(count) });
      expect(state.hexes).toHaveLength(30);
      expect(state.nodes).toHaveLength(80);
      expect(state.harbours).toHaveLength(11);
      expect(state.devCardDeck).toHaveLength(34);
    });

    it('gives the extension board two tokenless deserts', () => {
      const state = createInitialState({ players: seats(5) });
      const deserts = state.hexes.filter(h => h.resource === 'desert');
      expect(deserts).toHaveLength(2);
      for (const desert of deserts) expect(desert.numberToken).toBeNull();
    });

    it('lays the extension tokens out exactly as the pool specifies', () => {
      const state = createInitialState({ players: seats(6) });
      const tokens = state.hexes.map(h => h.numberToken).filter((t): t is number => t !== null);
      expect(tokens.slice().sort((a, b) => a - b))
        .toEqual(BOARD_PRESETS.expansion.tokens.slice().sort((a, b) => a - b));
    });

    it('never puts two red numbers next to each other on the extension board', () => {
      // The densest board in the game, so this is where the layout constraint is most
      // likely to be violated by a generator that gives up early.
      for (let run = 0; run < 30; run++) {
        const { hexes } = createInitialState({ players: seats(6) });
        const isRed = (t: number | null) => t === 6 || t === 8;

        for (const a of hexes.filter(h => isRed(h.numberToken))) {
          const touching = hexes.filter(
            b =>
              b.id !== a.id &&
              isRed(b.numberToken) &&
              Math.abs(a.q - b.q) + Math.abs(a.r - b.r) + Math.abs(a.s - b.s) === 2
          );
          expect(touching).toHaveLength(0);
        }
      }
    });

    it('places the robber on one of the two extension deserts', () => {
      const state = createInitialState({ players: seats(5) });
      expect(state.hexes.find(h => h.id === state.robberHexId)?.resource).toBe('desert');
    });
  });
});
