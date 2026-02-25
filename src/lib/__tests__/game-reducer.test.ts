import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { catanReducer, createInitialState } from '../../lib/game-reducer';
import { GameState, GameNode, Hex, Harbour } from '../../types/catan';

describe('Catan Game Reducer', () => {
  let mockState: GameState;

  const mockNodes: GameNode[] = [
    { 
      id: 'node-A',  
      pixelPos: { x: 0, y: 0 }, 
      neighbors: ['node-B'],
      hexIds: ['hex-1'] 
    },
    { 
      id: 'node-B', 
      pixelPos: { x: 10, y: 0 }, 
      neighbors: ['node-A', 'node-C'],
      hexIds: ['hex-1', 'hex-2'] 
    },
    { 
      id: 'node-C', 
      pixelPos: { x: 20, y: 0 }, 
      neighbors: ['node-B'],
      hexIds: ['hex-2'] 
    },
    { 
      id: 'node-D', 
      pixelPos: { x: 100, y: 100 }, 
      neighbors: [],
      hexIds: [] 
    },
  ];

  const mockHarbours: Harbour[] = [
    {
      id: 'harbour-1',
      type: 'wood' as const,
      nodeIds: ['node-A', 'node-B'],
      x: 5,
      y: 0,
      angle: 0
    }
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
      harbours: mockHarbours,
      currentPlayerIndex: 0,
      settlements: {},
      roads: {},
      gameLog: [],
      phase: 'setup1', // Explicitly start in setup
      setupActionRequired: 'settlement'
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Turn Management (Main Phase)', () => {
    beforeEach(() => {
      mockState.phase = 'main'; // Skip setup for these tests
    });

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

  describe('Initial Setup Phase (Snake Draft)', () => {
    it('forces player 1 to place a settlement then a road', () => {
      // Step 1: P1 builds Settlement
      let state = catanReducer(mockState, {
        type: 'BUILD_SETTLEMENT',
        payload: { nodeId: 'node-A', playerId: 0 },
      });

      expect(state.settlements['node-A']).toBeDefined();
      expect(state.setupActionRequired).toBe('road');
      expect(state.currentPlayerIndex).toBe(0); // Still P1's turn

      // Step 2: P1 builds Road
      state = catanReducer(state, {
        type: 'BUILD_ROAD',
        payload: { nodeId1: 'node-A', nodeId2: 'node-B', playerId: 0 },
      });

      const roadId = ['node-A', 'node-B'].sort().join('-');
      expect(state.roads[roadId]).toBeDefined();
      
      // Turn passes to P2, expecting a settlement
      expect(state.currentPlayerIndex).toBe(1);
      expect(state.setupActionRequired).toBe('settlement');
      expect(state.phase).toBe('setup1');
    });

    it('gives starting resources on the setup2 settlement placement', () => {
      // Fast forward to P4 in setup2
      mockState.phase = 'setup2';
      mockState.currentPlayerIndex = 3;
      mockState.setupActionRequired = 'settlement';

      // P4 builds on Node B (touching Wood and Brick)
      const state = catanReducer(mockState, {
        type: 'BUILD_SETTLEMENT',
        payload: { nodeId: 'node-B', playerId: 3 },
      });

      // Should gain 1 Wood from hex-1 and 1 Brick from hex-2
      expect(state.players[3].resources.wood).toBe(1);
      expect(state.players[3].resources.brick).toBe(1);
      expect(state.players[3].resources.wheat).toBe(0);
    });

    it('transitions to main phase after Player 1 finishes setup2', () => {
      mockState.phase = 'setup2';
      mockState.currentPlayerIndex = 0; // P1's final placement
      mockState.setupActionRequired = 'road';

      // P1 has already placed a settlement in setup1, so we just need to place a road to finish.
      mockState.settlements['node-B'] = { nodeId: 'node-B', playerId: 0, isCity: false };

      const state = catanReducer(mockState, {
        type: 'BUILD_ROAD',
        payload: { nodeId1: 'node-B', nodeId2: 'node-C', playerId: 0 },
      });

      expect(state.phase).toBe('main');
      expect(state.currentPlayerIndex).toBe(0); 
      expect(state.setupActionRequired).toBe('none');
    });
  });

  describe('Building Mechanics (Main Phase)', () => {
    beforeEach(() => {
      mockState.phase = 'main';
      mockState.setupActionRequired = 'none';
    });

    it('enforces the Distance Rule (cannot build on adjacent nodes)', () => {
      // Setup an existing settlement
      mockState.settlements['node-A'] = { nodeId: 'node-A', playerId: 0, isCity: false };
      
      // Give P1 enough resources and it's their turn
      mockState.currentPlayerIndex = 1;
      mockState.players[1].resources = { wood: 1, brick: 1, wheat: 1, sheep: 1, ore: 0 };

      // P2 tries to build on Node B (which is adjacent)
      const state = catanReducer(mockState, {
        type: 'BUILD_SETTLEMENT',
        payload: { nodeId: 'node-B', playerId: 1 },
      });

      expect(state.settlements['node-B']).toBeUndefined();
      expect(state.gameLog[0]).toContain('Too close');
    });

    it('enforces resource costs during the normal phase', () => {
      // Empty their resources
      mockState.players[0].resources = { wood: 0, brick: 0, wheat: 0, sheep: 0, ore: 0 };
      mockState.currentPlayerIndex = 0;

      // Ensure they have a road to pass connection rules
      mockState.roads['node-C-node-D'] = { id: 'node-C-node-D', playerId: 0, nodes: ['node-C', 'node-D'] };

      const state = catanReducer(mockState, {
        type: 'BUILD_SETTLEMENT',
        payload: { nodeId: 'node-D', playerId: 0 },
      });

      expect(state.settlements['node-D']).toBeUndefined();
      expect(state.gameLog[0]).toContain('Not enough resources');
    });

    it('enforces the Connection Rule for roads', () => {
      mockState.currentPlayerIndex = 0;
      mockState.players[0].resources = { wood: 1, brick: 1, wheat: 0, sheep: 0, ore: 0 };

      const state = catanReducer(mockState, {
        type: 'BUILD_ROAD',
        payload: { nodeId1: 'node-C', nodeId2: 'node-D', playerId: 0 },
      });

      const roadId = ['node-C', 'node-D'].sort().join('-');
      expect(state.roads[roadId]).toBeUndefined();
      expect(state.gameLog[0]).toContain('must connect');
    });

    it('allocates harbours to users correctly when they build a settlement at one', () => {
      mockState.phase = 'main';
      mockState.setupActionRequired = 'none';
      mockState.currentPlayerIndex = 0;

      // Give required resources
      mockState.players[0].resources = {
        wood: 1,
        brick: 1,
        wheat: 1,
        sheep: 1,
        ore: 0
      };

      // Give connecting road
      mockState.roads['node-A-node-B'] = {
        id: 'node-A-node-B',
        playerId: 0,
        nodes: ['node-A', 'node-B']
      };

      const state = catanReducer(mockState, {
        type: 'BUILD_SETTLEMENT',
        payload: { nodeId: 'node-A', playerId: 0 },
      });

      expect(state.players[0].harbours).toHaveLength(1);
      expect(state.players[0].harbours?.[0]).toEqual(mockHarbours[0]);
  });

  });

  describe('Rolling Dice & Resources', () => {
    beforeEach(() => {
      mockState.phase = 'main'; // Only allowed to roll in main phase
    });

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

    it('prevents rolling during setup phases', () => {
      mockState.phase = 'setup1';
      const state = catanReducer(mockState, { type: 'ROLL_DICE' });
      
      expect(state.diceRoll).toBeNull();
      expect(state.gameLog[0]).toContain('Finish the setup');
    });
  });

  describe('Game Setup - Robber', () => {
  it('places the robber on the desert tile at start', () => {
    const state = createInitialState(2);
    
    // Find which hex is the desert in this specific random generation
    const desertHex = state.hexes.find(h => h.resource === 'desert');
    
    expect(desertHex).toBeDefined();
    // The robber's ID in the state must match the desert's ID
    expect(state.robberHexId).toBe(desertHex?.id);
  });
  });

  describe('City Upgrades', () => {
    beforeEach(() => {
      mockState.phase = 'main';
      mockState.currentPlayerIndex = 0;
      
      // Give P1 a settlement on node-A
      mockState.settlements['node-A'] = { nodeId: 'node-A', playerId: 0, isCity: false };
      
      // Give P1 exact resources for a city
      mockState.players[0].resources = { wood: 0, brick: 0, wheat: 2, sheep: 0, ore: 3 };
      mockState.players[0].victoryPoints = 1; // 1 VP for the starting settlement
    });

    it('upgrades a settlement to a city and deducts resources', () => {
      const state = catanReducer(mockState, {
        type: 'UPGRADE_SETTLEMENT',
        payload: { nodeId: 'node-A', playerId: 0 },
      });

      expect(state.settlements['node-A'].isCity).toBe(true);
      expect(state.players[0].resources.ore).toBe(0);
      expect(state.players[0].resources.wheat).toBe(0);
      expect(state.players[0].victoryPoints).toBe(2); // VP should increase
    });

    it('fails if the player does not have enough resources', () => {
      // Remove 1 Ore
      mockState.players[0].resources.ore = 2;

      const state = catanReducer(mockState, {
        type: 'UPGRADE_SETTLEMENT',
        payload: { nodeId: 'node-A', playerId: 0 },
      });

      expect(state.settlements['node-A'].isCity).toBe(false);
      expect(state.gameLog[0]).toContain('Not enough resources');
    });

    it('gives double resources for a city on a dice roll', () => {
      // 1. Upgrade the settlement first
      const stateWithCity = catanReducer(mockState, {
        type: 'UPGRADE_SETTLEMENT',
        payload: { nodeId: 'node-A', playerId: 0 },
      });

      // 2. Force roll an 8 (Wood from hex-1 touching node-A based on your mock setup)
      vi.spyOn(Math, 'random').mockReturnValue(0.5); // Or whatever triggers an 8 in your dice logic
      
      const finalState = catanReducer(stateWithCity, { type: 'ROLL_DICE' });

      // Node A touches hex-1 (Wood). Since it's a city, P1 should get 2 Wood.
      expect(finalState.players[0].resources.wood).toBe(2);
    });
  });
});