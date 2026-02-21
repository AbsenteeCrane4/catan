import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { catanReducer, createInitialState } from '../game-reducer';
import { GameState, GameNode, Hex } from '../../types/catan';

describe('Catan Game Reducer', () => {
  let mockState: GameState;

  const mockNodes: GameNode[] = [
    { 
      id: 'node-A', 
      hexCoords: [{ q: 0, r: 0 }], 
      pixelPos: { x: 0, y: 0 }, 
      neighbors: ['node-B'],
      hexIds: ['hex-1'] // Node A is touching Hex 1 (Wood)
    },
    { 
      id: 'node-B', 
      hexCoords: [{ q: 0, r: 0 }, { q: 1, r: -1 }], 
      pixelPos: { x: 10, y: 0 }, 
      neighbors: ['node-A', 'node-C'],
      hexIds: ['hex-1', 'hex-2'] 
    },
    { 
      id: 'node-C', 
      hexCoords: [{ q: 1, r: -1 }], 
      pixelPos: { x: 20, y: 0 }, 
      neighbors: ['node-B'],
      hexIds: ['hex-2'] 
    },
    { 
      id: 'node-D', 
      hexCoords: [{ q: -1, r: -1 }], 
      pixelPos: { x: 100, y: 100 }, 
      neighbors: [],
      hexIds: [] 
    },
  ];

  const mockHexes: Hex[] = [
    { id: 'hex-1', q: 0, r: 0, s: 0, resource: 'wood', numberToken: 8 },
    { id: 'hex-2', q: 1, r: -1, s: 0, resource: 'brick', numberToken: 4 },
  ];

  beforeEach(() => {
    const initialState = createInitialState(2);
    mockState = {
      ...initialState,
      nodes: mockNodes,
      hexes: mockHexes,
      currentPlayerIndex: 0,
      settlements: {},
      roads: {},
      gameLog: [],
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Turn Management', () => {
    it('cycles to the next player on END_TURN', () => {
      mockState.currentPlayerIndex = 0;
      const nextState = catanReducer(mockState, { type: 'END_TURN' });
      expect(nextState.currentPlayerIndex).toBe(1);
      expect(nextState.diceRoll).toBeNull();
    });

    it('wraps around to the first player after the last player', () => {
      mockState.currentPlayerIndex = 3; 
      const nextState = catanReducer(mockState, { type: 'END_TURN' });
      expect(nextState.currentPlayerIndex).toBe(0);
    });
  });

  describe('Building Settlements', () => {
    it('allows building a free settlement during the initial phase', () => {
      const nextState = catanReducer(mockState, {
        type: 'BUILD_SETTLEMENT',
        payload: { nodeId: 'node-A', playerId: 0 },
      });

      expect(nextState.settlements['node-A']).toBeDefined();
      expect(nextState.settlements['node-A'].playerId).toBe(0);
      expect(nextState.players[0].score).toBe(1);
      // Ensure initial resources (4 wood) are not spent
      expect(nextState.players[0].resources.wood).toBe(4); 
    });

    it('enforces the Distance Rule (cannot build on adjacent nodes)', () => {
      // Player 0 builds on Node A
      let state = catanReducer(mockState, {
        type: 'BUILD_SETTLEMENT',
        payload: { nodeId: 'node-A', playerId: 0 },
      });

      // Player 1 tries to build on Node B (which is 10 units away)
      state = catanReducer(state, {
        type: 'BUILD_SETTLEMENT',
        payload: { nodeId: 'node-B', playerId: 1 },
      });

      expect(state.settlements['node-B']).toBeUndefined();
      expect(state.gameLog[0]).toContain('Too close');
    });

    it('allows building if the node is far enough away', () => {
      let state = catanReducer(mockState, {
        type: 'BUILD_SETTLEMENT',
        payload: { nodeId: 'node-A', playerId: 0 },
      });

      state = catanReducer(state, {
        type: 'BUILD_SETTLEMENT',
        payload: { nodeId: 'node-D', playerId: 1 },
      });

      expect(state.settlements['node-D']).toBeDefined();
    });

    it('enforces resource costs during the normal phase', () => {
      // Mock player having 2 settlements already to trigger normal phase
      mockState.settlements = {
        's1': { nodeId: 'node-A', playerId: 0, isCity: false },
        's2': { nodeId: 'node-B', playerId: 0, isCity: false },
      };
      // Give player a road to Node C so the connection rule passes
      mockState.roads = {
        'r1': { id: 'node-B-node-C', playerId: 0, nodes: ['node-B', 'node-C'] }
      };

      // Set resources to zero
      mockState.players[0].resources = { wood: 0, brick: 0, wheat: 0, sheep: 0, ore: 0 };

      const state = catanReducer(mockState, {
        type: 'BUILD_SETTLEMENT',
        payload: { nodeId: 'node-C', playerId: 0 },
      });

      expect(state.settlements['node-C']).toBeUndefined();
      expect(state.gameLog[0]).toContain('Not enough resources');
    });
  });

  describe('Building Roads', () => {
    it('enforces the Connection Rule for roads', () => {
      const state = catanReducer(mockState, {
        type: 'BUILD_ROAD',
        payload: { nodeId1: 'node-C', nodeId2: 'node-D', playerId: 0 },
      });

      const roadId = ['node-C', 'node-D'].sort().join('-');
      expect(state.roads[roadId]).toBeUndefined();
      expect(state.gameLog[0]).toContain('must connect');
    });

    it('allows building a road connected to a settlement', () => {
      let state = catanReducer(mockState, {
        type: 'BUILD_SETTLEMENT',
        payload: { nodeId: 'node-A', playerId: 0 },
      });

      state = catanReducer(state, {
        type: 'BUILD_ROAD',
        payload: { nodeId1: 'node-A', nodeId2: 'node-B', playerId: 0 },
      });

      const roadId = ['node-A', 'node-B'].sort().join('-');
      expect(state.roads[roadId]).toBeDefined();
    });
  });

  describe('Rolling Dice & Resources', () => {
    it('distributes resources to adjacent settlements based on the roll', () => {
      // Force roll to result in 8 (Wood)
      vi.spyOn(Math, 'random').mockReturnValue(0.5); 

      mockState.settlements = {
        'node-A': { nodeId: 'node-A', playerId: 0, isCity: false }
      };
      
      const initialWood = mockState.players[0].resources.wood;
      const state = catanReducer(mockState, { type: 'ROLL_DICE' });

      expect(state.diceRoll).toBe(8);
      // Node A is linked to hex-1 (Wood/8) via hexIds
      expect(state.players[0].resources.wood).toBe(initialWood + 1);
    });

    it('triggers the robber text on a 7', () => {
      vi.spyOn(Math, 'random')
        .mockReturnValueOnce(0.4) // 3
        .mockReturnValueOnce(0.5); // 4

      const state = catanReducer(mockState, { type: 'ROLL_DICE' });

      expect(state.diceRoll).toBe(7);
      expect(state.gameLog[0]).toContain('7 rolled');
    });
  });
});