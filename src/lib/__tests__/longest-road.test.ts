import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as GameReducer from '../../lib/game-reducer';
import { GameState } from '../../types/catan';

describe('Longest Road Logic Evaluation', () => {
  let mockState: GameState;

  // Helper to generate a continuous line of roads for testing
  const buildMockRoads = (playerId: number, length: number, prefix = 'node') => {
    const roads: Record<string, any> = {};
    for (let i = 0; i < length; i++) {
      const n1 = `${prefix}-${i}`;
      const n2 = `${prefix}-${i+1}`;
      const id = `${n1}-${n2}`;
      roads[id] = { id, playerId, nodes: [n1, n2] };
    }
    return roads;
  };

  beforeEach(() => {
    const initialState = GameReducer.createInitialState(2);
    
    mockState = {
      ...initialState,
      players: initialState.players.map(p => ({
        ...p,
        victoryPoints: 4
      }))
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should not award longest road if max length is less than 5', () => {
    mockState.roads = buildMockRoads(0, 4);

    const result = GameReducer.evaluateLongestRoad(mockState, [0]);

    expect(result.longestRoad.playerId).toBeNull();
    expect(result.longestRoad.length).toBe(0);
    expect(result.players[0].victoryPoints).toBe(4);
    expect(result.logs.length).toBe(0);
  });

  it('should award longest road to player who reaches length 5', () => {
    mockState.roads = buildMockRoads(0, 5);

    const result = GameReducer.evaluateLongestRoad(mockState, [0]);

    expect(result.longestRoad.playerId).toBe(0);
    expect(result.longestRoad.length).toBe(5);
    expect(result.players[0].victoryPoints).toBe(6); // Gained 2
    expect(result.logs).toContain('Player 1 claimed the Longest Road with a length of 5! (+2 VP)');
  });

  it('should take away longest road if a settlement breaks it to below 5', () => {
    // Player 0 starts with a length 6 road and the card
    mockState.longestRoad = { playerId: 0, length: 6 };
    mockState.players[0].longestRoadLength = 6;
    mockState.players[0].victoryPoints = 12;
    mockState.roads = buildMockRoads(0, 6);

    // BREAK IT: Player 1 builds a settlement right in the middle (node-3)
    mockState.settlements['node-3'] = { nodeId: 'node-3', playerId: 1, isCity: false };

    // Evaluate Player 0 since their road was touched
    const result = GameReducer.evaluateLongestRoad(mockState, [0]);

    expect(result.longestRoad.playerId).toBeNull();
    expect(result.longestRoad.length).toBe(0); // Max length is now 3
    expect(result.players[0].victoryPoints).toBe(10); // Lost 2
    expect(result.logs).toContain('Player 1 lost the Longest Road.');
  });

  it('should transfer card when another player strictly surpasses current holder', () => {
    mockState.longestRoad = { playerId: 0, length: 5 };
    mockState.players[0].longestRoadLength = 5;
    mockState.players[0].victoryPoints = 6;  // Player 1 has the card so has 6 VP

    // Player 0 has 5, Player 1 builds 6
    mockState.roads = {
      ...buildMockRoads(0, 5, 'p0'),
      ...buildMockRoads(1, 6, 'p1') 
    };

    const result = GameReducer.evaluateLongestRoad(mockState, [1]);

    expect(result.longestRoad.playerId).toBe(1);
    expect(result.longestRoad.length).toBe(6);
    expect(result.players[0].victoryPoints).toBe(4); // Player 0 lost 2
    expect(result.players[1].victoryPoints).toBe(6); // Player 1 gained 2
    expect(result.logs).toContain('Player 2 claimed the Longest Road with a length of 6! (+2 VP)');
  });

  it('should keep the card with the current holder if someone only ties them', () => {
    mockState.longestRoad = { playerId: 0, length: 5 };
    mockState.players[0].longestRoadLength = 5;
    mockState.players[0].victoryPoints = 6;  // Player 1 has the card so has 6 VP

    // Both players have 5
    mockState.roads = {
      ...buildMockRoads(0, 5, 'p0'),
      ...buildMockRoads(1, 5, 'p1') 
    };

    const result = GameReducer.evaluateLongestRoad(mockState, [1]);

    expect(result.longestRoad.playerId).toBe(0); // Player 0 retains it
    expect(result.longestRoad.length).toBe(5);
    expect(result.players[0].victoryPoints).toBe(6);
    expect(result.players[1].victoryPoints).toBe(4);
  });

  it('should return card to the bank if the holder is broken and two others are tied', () => {
    mockState.longestRoad = { playerId: 0, length: 7 };
    mockState.players[0].longestRoadLength = 7;
    mockState.players[0].victoryPoints = 6;  // Player 0 has the card so has 6 VP
    mockState.players[1].longestRoadLength = 5;
    mockState.players[2].longestRoadLength = 5;

    // Setup roads
    mockState.roads = {
      ...buildMockRoads(0, 7, 'p0'), 
      ...buildMockRoads(1, 5, 'p1'), 
      ...buildMockRoads(2, 5, 'p2'), 
    };

    mockState.settlements['p0-3'] = { nodeId: 'p0-3', playerId: 1, isCity: false };

    // Evaluate all affected players
    const result = GameReducer.evaluateLongestRoad(mockState, [0, 1, 2]);

    expect(result.longestRoad.playerId).toBeNull(); // Goes to the bank
    expect(result.longestRoad.length).toBe(5); // The new max record is 5, but nobody owns it
    expect(result.players[0].victoryPoints).toBe(4); // Player 0 lost 2
    expect(result.players[1].victoryPoints).toBe(4); // No bonus awarded due to tie
    expect(result.logs).toContain('Player 1 lost the Longest Road.');
  });
});