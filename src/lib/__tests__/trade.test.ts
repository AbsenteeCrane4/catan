import { describe, it, expect, beforeEach } from 'vitest';
import { catanReducer, createInitialState } from '../game-reducer';
import { GameState } from '@/types/catan';

describe('Catan Trading Logic', () => {
  let initialState: GameState;

  beforeEach(() => {
    initialState = createInitialState(3); // 3 player game
    // Give Player 1 some starting resources
    initialState.players[0].resources = { wood: 10, brick: 0, wheat: 0, sheep: 0, ore: 0 };
    // Give Player 2 some starting resources
    initialState.players[1].resources = { wood: 0, brick: 10, wheat: 0, sheep: 0, ore: 0 };
  });

  describe('Bank Trades (4:1)', () => {
    it('should allow a 4:1 trade with the bank', () => {
      const action = {
        type: 'TRADE_WITH_BANK' as const,
        payload: { playerId: 0, offerResource: 'wood' as const, requestResource: 'sheep' as const }
      };
      
      const newState = catanReducer(initialState, action);
      expect(newState.players[0].resources.wood).toBe(6);
      expect(newState.players[0].resources.sheep).toBe(1);
    });

    it('should fail if the player has fewer than 4 resources', () => {
      initialState.players[0].resources.wood = 3;
      initialState.phase = 'main';
      const action = {
        type: 'TRADE_WITH_BANK' as const,
        payload: { playerId: 0, offerResource: 'wood' as const, requestResource: 'sheep' as const }
      };
      
      const newState = catanReducer(initialState, action);
      expect(newState.players[0].resources.wood).toBe(3); // No change
      expect(newState.gameLog[0]).toContain("Player 1 doesn't have enough wood!");
    });
  });

  describe('Player-to-Player Trades', () => {
    it('should update currentTradeOffer when a trade is proposed', () => {
      const offer = {
        initiatorId: 0,
        offer: { wood: 2, brick: 0, wheat: 0, sheep: 0, ore: 0 },
        request: { wood: 0, brick: 1, wheat: 0, sheep: 0, ore: 0 }
      };
      
      const newState = catanReducer(initialState, { type: 'PROPOSE_TRADE', payload: { offer } });
      expect(newState.currentTradeOffer).toEqual(offer);
    });

    it('should execute resource swap when a trade is accepted', () => {
      // 1. Propose
      const offer = {
        initiatorId: 0,
        offer: { wood: 2, brick: 0, wheat: 0, sheep: 0, ore: 0 },
        request: { wood: 0, brick: 1, wheat: 0, sheep: 0, ore: 0 }
      };
      let state = catanReducer(initialState, { type: 'PROPOSE_TRADE', payload: { offer } });

      // 2. Accept by Player 1 (acceptorId: 1)
      state = catanReducer(state, { type: 'ACCEPT_TRADE', payload: { acceptorId: 1 } });

      // Initiator (Player 0) should have -2 wood, +1 brick
      expect(state.players[0].resources.wood).toBe(8);
      expect(state.players[0].resources.brick).toBe(1);

      // Acceptor (Player 1) should have +2 wood, -1 brick
      expect(state.players[1].resources.wood).toBe(2);
      expect(state.players[1].resources.brick).toBe(9);

      // Trade offer should be cleared
      expect(state.currentTradeOffer).toBeNull();
    });

    it('should block acceptance if the acceptor lacks resources', () => {
      const offer = {
        initiatorId: 0,
        offer: { wood: 1, brick: 0, wheat: 0, sheep: 0, ore: 0 },
        request: { wood: 0, brick: 100, wheat: 0, sheep: 0, ore: 0 } // Impossible request
      };
      let state = catanReducer(initialState, { type: 'PROPOSE_TRADE', payload: { offer } });
      
      state = catanReducer(state, { type: 'ACCEPT_TRADE', payload: { acceptorId: 1 } });
      
      expect(state.players[0].resources.wood).toBe(10); // No change
      expect(state.gameLog[0]).toContain("Player 2 doesn't have enough brick to accept!");
    });
  });
});