import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { catanReducer, createInitialState } from '../game-reducer';
import { GameState, GameNode, Hex } from '../../types/catan';

describe('Catan Game Reducer', () => {
  let mockState: GameState;

  const mockNodes: GameNode[] = [
    { id: 'node-A', hexCoords: [{ q: 0, r: 0 }], pixelPos: { x: 0, y: 0 }, neighbors: [] },
    { id: 'node-B', hexCoords: [{ q: 1, r: -1 }], pixelPos: { x: 10, y: 0 }, neighbors: [] },
    { id: 'node-C', hexCoords: [{ q: 2, r: -2 }], pixelPos: { x: 20, y: 0 }, neighbors: [] },
    { id: 'node-D', hexCoords: [{ q: -1, r: -1 }], pixelPos: { x: 100, y: 100 }, neighbors: [] },
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
      expect(nextState.diceRoll).toBeNull(); // Dice should reset
    });

    it('wraps around to the first player after the last player', () => {
      mockState.currentPlayerIndex = 3; // Assuming 4 players
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
      // Resources should NOT be deducted in initial phase
      expect(nextState.players[0].resources.wood).toBe(4); 
    });

    it('enforces the Distance Rule (cannot build on adjacent nodes)', () => {
      // Player 0 builds on Node A
      let state = catanReducer(mockState, {
        type: 'BUILD_SETTLEMENT',
        payload: { nodeId: 'node-A', playerId: 0 },
      });

      // Player 1 tries to build on Node B (which is 10 units away, i.e., adjacent)
      state = catanReducer(state, {
        type: 'BUILD_SETTLEMENT',
        payload: { nodeId: 'node-B', playerId: 1 },
      });

      // Node B should remain empty due to the distance rule
      expect(state.settlements['node-B']).toBeUndefined();
      expect(state.gameLog[0]).toContain('Distance Rule');
    });

    it('allows building if the node is far enough away', () => {
      // Player 0 builds on Node A
      let state = catanReducer(mockState, {
        type: 'BUILD_SETTLEMENT',
        payload: { nodeId: 'node-A', playerId: 0 },
      });

      // Player 1 builds on Node D (100 units away)
      state = catanReducer(state, {
        type: 'BUILD_SETTLEMENT',
        payload: { nodeId: 'node-D', playerId: 1 },
      });

      expect(state.settlements['node-D']).toBeDefined();
    });

    it('enforces resource costs during the normal phase', () => {
      // Simulate player already having 2 settlements (normal phase begins)
      mockState.settlements = {
        'mock-1': { nodeId: 'mock-1', playerId: 0, isCity: false },
        'mock-2': { nodeId: 'mock-2', playerId: 0, isCity: false },
      };
      
      // Give player a road connected to Node D to pass the connection rule
      mockState.roads = {
        'mock-road': { id: 'mock-road', playerId: 0, nodes: ['mock-2', 'node-D'] }
      };

      // Empty their resources
      mockState.players[0].resources = { wood: 0, brick: 0, wheat: 0, sheep: 0, ore: 0 };

      const state = catanReducer(mockState, {
        type: 'BUILD_SETTLEMENT',
        payload: { nodeId: 'node-D', playerId: 0 },
      });

      expect(state.settlements['node-D']).toBeUndefined();
      expect(state.gameLog[0]).toContain('Not enough resources');
    });
  });

  describe('Building Roads', () => {
    it('enforces the Connection Rule for roads', () => {
      // Try to build an isolated road
      const state = catanReducer(mockState, {
        type: 'BUILD_ROAD',
        payload: { nodeId1: 'node-C', nodeId2: 'node-D', playerId: 0 },
      });

      const roadId = ['node-C', 'node-D'].sort().join('-');
      expect(state.roads[roadId]).toBeUndefined();
      expect(state.gameLog[0]).toContain('connect to your existing pieces');
    });

    it('allows building a road connected to a settlement', () => {
      // Place a settlement first
      let state = catanReducer(mockState, {
        type: 'BUILD_SETTLEMENT',
        payload: { nodeId: 'node-A', playerId: 0 },
      });

      // Build a road extending from Node A
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
      // Force Math.random to roll a 4 + 4 = 8
      // Math.random() returns a float between 0 and 1. 
      // Floor(0.5 * 6) + 1 = 4.
      vi.spyOn(Math, 'random').mockReturnValue(0.5); 

      // Place a settlement on Node A (adjacent to hex-1, which rolls on 8 and yields wood)
      mockState.settlements = {
        'node-A': { nodeId: 'node-A', playerId: 0, isCity: false }
      };
      
      const initialWood = mockState.players[0].resources.wood;

      const state = catanReducer(mockState, { type: 'ROLL_DICE' });

      expect(state.diceRoll).toBe(8);
      // Player 0 should gain 1 wood
      expect(state.players[0].resources.wood).toBe(initialWood + 1);
    });

    it('triggers the robber text on a 7', () => {
      // Force a roll of 3 + 4 = 7
      vi.spyOn(Math, 'random')
        .mockReturnValueOnce(0.4) // die 1 = 3
        .mockReturnValueOnce(0.5); // die 2 = 4

      const state = catanReducer(mockState, { type: 'ROLL_DICE' });

      expect(state.diceRoll).toBe(7);
      expect(state.gameLog[0]).toContain('7 rolled');
    });
  });
});