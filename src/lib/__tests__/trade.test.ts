import { describe, it, expect, beforeEach } from 'vitest';
import { catanReducer, createInitialState } from '../game-reducer';
import { GameState } from '@/types/catan';

describe('Game Setup & Harbours', () => {
  it('generates the correct number of ports for the board', () => {
    const state = createInitialState();
    // Standard radius 2 board has 9 ports
    expect(state.harbours).toHaveLength(9);
    // Ensure no two ports share the same node
    const portNodes = state.harbours.flatMap(h => h.nodeIds);
    const uniquePortNodes = new Set(portNodes);
    expect(portNodes.length).toBe(uniquePortNodes.size);
  });
});

describe('Catan Trading Logic', () => {
  let initialState: GameState;

  beforeEach(() => {
    initialState = createInitialState();
    // Give Player 1 some starting resources
    initialState.players[0].resources = { wood: 10, brick: 0, wheat: 0, sheep: 0, ore: 0 };
    // Give Player 2 some starting resources
    initialState.players[1].resources = { wood: 0, brick: 10, wheat: 0, sheep: 0, ore: 0 };
    initialState.phase = 'main'; // Set phase to main for trading tests
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

    it('allows a 3:1 port trade', () => {
      // Give player a settlement on the 3:1 port
      initialState.settlements['node-coast-3'] = { nodeId: 'node-coast-3', playerId: 0, isCity: false };

      // Assume node-coast-3 is on a 3:1 port for this test
      initialState.harbours.push({
        id: 'harbour-3',
        type: '3:1',
        nodeIds: ['node-coast-3', 'node-coast-4'],
        x: 0,
        y: 0,
        angle: 0
      });

      const state = catanReducer(initialState, {
        type: 'TRADE_WITH_BANK',
        payload: { playerId: 0, offerResource: 'wood', requestResource: 'brick' }
      });

      expect(state.players[0].resources.wood).toBe(7); // 10 - 3 = 7
      expect(state.players[0].resources.brick).toBe(1);
    });

    it('allows a resource-specific port trade', () => {
      // Give player a settlement on the wood port
      initialState.settlements['node-coast-5'] = { nodeId: 'node-coast-5', playerId: 0, isCity: false };

      // Assume node-coast-5 is on a 2:1 wood port for this test
      initialState.harbours.push({
        id: 'harbour-wood',
        type: 'wood',
        nodeIds: ['node-coast-5', 'node-coast-6'],
        x: 0,
        y: 0,
        angle: 0
      });

      const state = catanReducer(initialState, {
        type: 'TRADE_WITH_BANK',
        payload: { playerId: 0, offerResource: 'wood', requestResource: 'brick' }
      });

      expect(state.players[0].resources.wood).toBe(8); // 10 - 2 = 8
      expect(state.players[0].resources.brick).toBe(1);
    });

    it('should fail if the player tries to trade a resource they have none of', () => {
      const action = {
        type: 'TRADE_WITH_BANK' as const,
        payload: { playerId: 0, offerResource: 'brick' as const, requestResource: 'sheep' as const }
      };
      
      const newState = catanReducer(initialState, action);
      expect(newState.players[0].resources.brick).toBe(0);
      expect(newState.gameLog[0]).toContain("Player 1 doesn't have enough brick!");
    });

    it('should fail if the player has fewer than 4 resources', () => {
      initialState.players[0].resources.wood = 3;
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

    it('should block show no trade to accept if its in setup phase', () => {
      initialState.phase = 'setup1';
      const offer = {
        initiatorId: 0,
        offer: { wood: 2, brick: 0, wheat: 0, sheep: 0, ore: 0 },
        request: { wood: 0, brick: 1, wheat: 0, sheep: 0, ore: 0 }
      };
      let state = catanReducer(initialState, { type: 'PROPOSE_TRADE', payload: { offer } });
      
      state = catanReducer(state, { type: 'ACCEPT_TRADE', payload: { acceptorId: 1 } });
      
      expect(state.players[0].resources.wood).toBe(10); // No change
      expect(state.gameLog[0]).toContain("No trade to accept!");
    });
  });
});