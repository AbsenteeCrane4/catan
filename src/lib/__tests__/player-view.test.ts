import { describe, expect, it } from 'vitest';
import { createInitialState } from '@/lib/game/state/createInitialState';
import { redactStateFor } from '@/lib/server/redact';
import { isRevealed, ownHand } from '@/lib/game/helpers/playerView';

/**
 * The client-side counterpart to redact.test.ts: given a view the server actually
 * produced, these are the narrowings every component depends on. They are written
 * against `redactStateFor` output rather than hand-built fixtures so they cannot drift
 * from what the wire really carries.
 */
describe('player view narrowing', () => {
  const state = createInitialState();

  describe('isRevealed', () => {
    it('accepts the viewing seat', () => {
      const view = redactStateFor(state, 1);
      expect(isRevealed(view.players[1])).toBe(true);
    });

    it('rejects every other seat', () => {
      const view = redactStateFor(state, 1);
      const others = view.players.filter(p => p.id !== 1);

      expect(others).not.toHaveLength(0);
      for (const player of others) {
        expect(isRevealed(player)).toBe(false);
      }
    });

    it('rejects every seat for a spectator', () => {
      const view = redactStateFor(state, null);
      expect(view.players.every(p => !isRevealed(p))).toBe(true);
    });

    it('accepts every seat once the game is over, as at a real table', () => {
      const view = redactStateFor({ ...state, isGameOver: true }, 0);
      expect(view.players.every(isRevealed)).toBe(true);
    });
  });

  describe('ownHand', () => {
    it('returns the hand belonging to the viewing seat', () => {
      const withCards = {
        ...state,
        players: state.players.map((p, i) =>
          i === 2 ? { ...p, resources: { ...p.resources, ore: 3 } } : p
        ),
      };

      const hand = ownHand(redactStateFor(withCards, 2));

      expect(hand?.id).toBe(2);
      expect(hand?.resources.ore).toBe(3);
    });

    it('returns null for a spectator', () => {
      expect(ownHand(redactStateFor(state, null))).toBeNull();
    });

    it('reads the seat off the payload, so it cannot disagree with what was revealed', () => {
      const view = redactStateFor(state, 3);
      const hand = ownHand(view);

      expect(view.viewerSeatIndex).toBe(3);
      expect(hand?.id).toBe(3);
    });

    it('returns null rather than an unrevealed player if the seat is out of range', () => {
      // redactStateFor treats an out-of-range seat as a spectator rather than trusting it.
      const view = redactStateFor(state, 99);
      expect(view.viewerSeatIndex).toBeNull();
      expect(ownHand(view)).toBeNull();
    });
  });
});
