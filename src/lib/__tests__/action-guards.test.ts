import { describe, it, expect, beforeEach } from 'vitest';
import { isActionAllowedFor, withActor } from '@/lib/server/actionGuards';
import { createInitialState } from '@/lib/game-reducer';
import { GameAction, GameState } from '@/types/catan';

const ATTACKER = 2;
const VICTIM = 0;

describe('server action guards', () => {
  let state: GameState;

  beforeEach(() => {
    state = createInitialState();
    state.phase = 'main';
    state.currentPlayerIndex = ATTACKER;
  });

  describe('withActor', () => {
    /** Each entry: an action claiming to be VICTIM, and how to read the actor back out. */
    const cases: { action: GameAction; read: (a: GameAction) => number }[] = [
      {
        action: { type: 'BUILD_SETTLEMENT', payload: { nodeId: 'n1', playerId: VICTIM } },
        read: a => (a as Extract<GameAction, { type: 'BUILD_SETTLEMENT' }>).payload.playerId,
      },
      {
        action: { type: 'UPGRADE_SETTLEMENT', payload: { nodeId: 'n1', playerId: VICTIM } },
        read: a => (a as Extract<GameAction, { type: 'UPGRADE_SETTLEMENT' }>).payload.playerId,
      },
      {
        action: { type: 'BUILD_ROAD', payload: { nodeId1: 'a', nodeId2: 'b', playerId: VICTIM } },
        read: a => (a as Extract<GameAction, { type: 'BUILD_ROAD' }>).payload.playerId,
      },
      {
        action: { type: 'MOVE_ROBBER', payload: { hexId: 'h1', playerId: VICTIM } },
        read: a => (a as Extract<GameAction, { type: 'MOVE_ROBBER' }>).payload.playerId,
      },
      {
        action: { type: 'STEAL_RESOURCE', payload: { thiefId: VICTIM, victimId: 1 } },
        read: a => (a as Extract<GameAction, { type: 'STEAL_RESOURCE' }>).payload.thiefId,
      },
      {
        action: {
          type: 'TRADE_WITH_BANK',
          payload: { playerId: VICTIM, offerResource: 'wood', requestResource: 'ore' },
        },
        read: a => (a as Extract<GameAction, { type: 'TRADE_WITH_BANK' }>).payload.playerId,
      },
      {
        action: { type: 'BUY_DEV_CARD', payload: { playerId: VICTIM } },
        read: a => (a as Extract<GameAction, { type: 'BUY_DEV_CARD' }>).payload.playerId,
      },
      {
        action: { type: 'PLAY_DEV_CARD', payload: { playerId: VICTIM, cardType: 'knight' } },
        read: a => (a as Extract<GameAction, { type: 'PLAY_DEV_CARD' }>).payload.playerId,
      },
      {
        action: { type: 'ACCEPT_TRADE', payload: { acceptorId: VICTIM } },
        read: a => (a as Extract<GameAction, { type: 'ACCEPT_TRADE' }>).payload.acceptorId,
      },
    ];

    cases.forEach(({ action, read }) => {
      it(`overrides the client-supplied actor on ${action.type}`, () => {
        expect(read(withActor(action, ATTACKER))).toBe(ATTACKER);
      });
    });

    it('rewrites the trade initiator on PROPOSE_TRADE', () => {
      const empty = { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 };
      const action: GameAction = {
        type: 'PROPOSE_TRADE',
        payload: { offer: { initiatorId: VICTIM, offer: empty, request: empty } },
      };

      const rewritten = withActor(action, ATTACKER) as Extract<GameAction, { type: 'PROPOSE_TRADE' }>;
      expect(rewritten.payload.offer.initiatorId).toBe(ATTACKER);
    });

    it('leaves payload-less actions untouched', () => {
      const roll: GameAction = { type: 'ROLL_DICE' };
      expect(withActor(roll, ATTACKER)).toEqual(roll);
    });

    it('does not mutate the incoming action', () => {
      const action: GameAction = { type: 'BUY_DEV_CARD', payload: { playerId: VICTIM } };
      withActor(action, ATTACKER);
      expect(action.payload.playerId).toBe(VICTIM);
    });
  });

  describe('isActionAllowedFor', () => {
    it('always rejects SYNC_STATE, which would overwrite the whole game', () => {
      const action: GameAction = { type: 'SYNC_STATE', payload: state };
      expect(isActionAllowedFor(state, action, ATTACKER)).toBe(false);
      expect(isActionAllowedFor(state, action, VICTIM)).toBe(false);
    });

    it('allows the current player to act', () => {
      expect(isActionAllowedFor(state, { type: 'ROLL_DICE' }, ATTACKER)).toBe(true);
    });

    it('rejects an out-of-turn player', () => {
      expect(isActionAllowedFor(state, { type: 'ROLL_DICE' }, VICTIM)).toBe(false);
    });

    it('inverts the rule for ACCEPT_TRADE — only a non-current player may accept', () => {
      const action: GameAction = { type: 'ACCEPT_TRADE', payload: { acceptorId: VICTIM } };
      expect(isActionAllowedFor(state, action, VICTIM)).toBe(true);
      expect(isActionAllowedFor(state, action, ATTACKER)).toBe(false);
    });
  });
});
