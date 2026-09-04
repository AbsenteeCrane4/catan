import { describe, it, expect } from 'vitest';
import { redactStateFor } from '@/lib/server/redact';
import { createInitialState } from '@/lib/game/state/createInitialState';
import type { DevelopmentCardType, GameState, ResourceType } from '@/types/catan';

const hand = (partial: Partial<Record<ResourceType, number>>): Record<ResourceType, number> => ({
  wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0, ...partial,
});

/** Four seats with distinguishable hands, so a leak shows up as a specific value. */
function stateWithHands(): GameState {
  const state = createInitialState();
  state.players[0].resources = hand({ wood: 3, ore: 1 });
  state.players[1].resources = hand({ brick: 2, sheep: 5 });
  state.players[2].resources = hand({ wheat: 4 });
  state.players[3].resources = hand({});

  state.players[0].devCards = { playable: ['knight'], boughtThisTurn: ['monopoly'], played: ['knight'] };
  state.players[1].devCards = { playable: ['victoryPoint', 'victoryPoint'], boughtThisTurn: [], played: [] };
  state.players[1].victoryPoints = 5; // 3 on the board + 2 hidden VP cards
  return state;
}

/** Every resource key that appears anywhere in the serialised payload, per player. */
const serialise = (value: unknown) => JSON.stringify(value);

describe('redactStateFor', () => {
  describe('the viewing seat', () => {
    it('sees its own resources in full', () => {
      const view = redactStateFor(stateWithHands(), 1);
      expect(view.players[1].resources).toEqual(hand({ brick: 2, sheep: 5 }));
    });

    it('sees its own development cards in full', () => {
      const view = redactStateFor(stateWithHands(), 0);
      expect(view.players[0].devCards).toEqual({
        playable: ['knight'], boughtThisTurn: ['monopoly'], played: ['knight'],
      });
    });

    it('sees its own true victory point total, including hidden VP cards', () => {
      const view = redactStateFor(stateWithHands(), 1);
      expect(view.players[1].victoryPoints).toBe(5);
    });

    it('reports the seat it was built for', () => {
      expect(redactStateFor(stateWithHands(), 2).viewerSeatIndex).toBe(2);
    });
  });

  describe('opponents', () => {
    it('nulls out every other seat\'s resources', () => {
      const view = redactStateFor(stateWithHands(), 1);
      expect(view.players[0].resources).toBeNull();
      expect(view.players[2].resources).toBeNull();
      expect(view.players[3].resources).toBeNull();
    });

    it('nulls out every other seat\'s development cards', () => {
      const view = redactStateFor(stateWithHands(), 1);
      expect(view.players[0].devCards).toBeNull();
    });

    it('still reports accurate resource counts', () => {
      const view = redactStateFor(stateWithHands(), 3);
      expect(view.players.map(p => p.resourceCount)).toEqual([4, 7, 4, 0]);
    });

    it('still reports accurate dev card counts', () => {
      const view = redactStateFor(stateWithHands(), 3);
      expect(view.players[0].devCardCount).toBe(2); // 1 playable + 1 bought this turn
      expect(view.players[1].devCardCount).toBe(2);
      expect(view.players[2].devCardCount).toBe(0);
    });

    it('keeps played dev cards public', () => {
      const view = redactStateFor(stateWithHands(), 3);
      expect(view.players[0].playedDevCards).toEqual(['knight']);
    });

    it('subtracts held VP cards from an opponent\'s visible victory points', () => {
      // Player 1 holds two VP cards, so 5 true points must read as 3 in public.
      const view = redactStateFor(stateWithHands(), 0);
      expect(view.players[1].victoryPoints).toBe(3);
    });

    it('leaks no opponent resource type anywhere in the payload', () => {
      const state = stateWithHands();
      // Only seat 2 holds wheat, and only seat 1 holds sheep.
      const view = redactStateFor(state, 0);
      const payload = serialise(view.players.filter(p => p.id !== 0));
      expect(payload).not.toContain('wheat');
      expect(payload).not.toContain('sheep');
      expect(payload).not.toContain('monopoly');
    });
  });

  describe('the development card deck', () => {
    it('is replaced by its size', () => {
      const state = stateWithHands();
      const view = redactStateFor(state, 0);
      expect(view.devCardDeckCount).toBe(state.devCardDeck.length);
      expect('devCardDeck' in view).toBe(false);
    });

    it('never ships the ordered deck, which would reveal every future draw', () => {
      const state = stateWithHands();
      state.devCardDeck = ['monopoly', 'monopoly', 'monopoly'] as DevelopmentCardType[];
      state.players.forEach(p => { p.devCards = { playable: [], boughtThisTurn: [], played: [] }; });
      expect(serialise(redactStateFor(state, 0))).not.toContain('monopoly');
    });
  });

  describe('spectators', () => {
    it('see counts only, for every seat', () => {
      const view = redactStateFor(stateWithHands(), null);
      expect(view.players.every(p => p.resources === null)).toBe(true);
      expect(view.players.every(p => p.devCards === null)).toBe(true);
      expect(view.viewerSeatIndex).toBeNull();
    });

    it('are what an out-of-range seat index falls back to, rather than being trusted', () => {
      const view = redactStateFor(stateWithHands(), 9);
      expect(view.viewerSeatIndex).toBeNull();
      expect(view.players.every(p => p.resources === null)).toBe(true);
    });

    it('are what a negative seat index falls back to', () => {
      expect(redactStateFor(stateWithHands(), -1).viewerSeatIndex).toBeNull();
    });
  });

  describe('once the game is over', () => {
    it('reveals every hand, as at a real table', () => {
      const state = stateWithHands();
      state.isGameOver = true;
      const view = redactStateFor(state, 0);
      expect(view.players[1].resources).toEqual(hand({ brick: 2, sheep: 5 }));
      expect(view.players[1].devCards?.playable).toEqual(['victoryPoint', 'victoryPoint']);
    });

    it('reveals the true victory point total so the winner\'s score adds up', () => {
      const state = stateWithHands();
      state.isGameOver = true;
      expect(redactStateFor(state, 0).players[1].victoryPoints).toBe(5);
    });

    it('still withholds the undrawn deck', () => {
      const state = stateWithHands();
      state.isGameOver = true;
      expect('devCardDeck' in redactStateFor(state, 0)).toBe(false);
    });
  });

  describe('public state', () => {
    it('passes the board, settlements, roads and log through untouched', () => {
      const state = stateWithHands();
      const view = redactStateFor(state, 0);
      expect(view.hexes).toEqual(state.hexes);
      expect(view.nodes).toEqual(state.nodes);
      expect(view.harbours).toEqual(state.harbours);
      expect(view.settlements).toEqual(state.settlements);
      expect(view.roads).toEqual(state.roads);
      expect(view.gameLog).toEqual(state.gameLog);
      expect(view.robberHexId).toBe(state.robberHexId);
      expect(view.currentPlayerIndex).toBe(state.currentPlayerIndex);
      expect(view.phase).toBe(state.phase);
    });

    it('keeps the public per-player fields every panel needs', () => {
      const view = redactStateFor(stateWithHands(), 0);
      const opponent = view.players[1];
      expect(opponent.name).toBe('Player 2');
      expect(opponent.color).toBe(stateWithHands().players[1].color);
      expect(opponent.knightsPlayed).toBe(0);
      expect(opponent.longestRoadLength).toBe(0);
      expect(opponent.largestArmy).toBe(false);
    });

    it('does not mutate the state it redacts', () => {
      const state = stateWithHands();
      const before = serialise(state);
      redactStateFor(state, 0);
      expect(serialise(state)).toBe(before);
    });
  });
});
