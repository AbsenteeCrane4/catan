import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as GameReducer from '../../lib/game-reducer';
import { GameState } from '../../types/catan';

describe('Largest Army Logic Evaluation', () => {
  let mockState: GameState;

  beforeEach(() => {
    const initialState = GameReducer.createInitialState(); 
    
    mockState = {
      ...initialState,
      players: initialState.players.map(p => ({
        ...p,
        victoryPoints: 4,
        knightsPlayed: 0,
        largestArmy: false
      }))
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should not award largest army if max knights played is less than 3', () => {
    mockState.players[0].knightsPlayed = 2;

    const result = GameReducer.evaluateLargestArmy(mockState);

    const initialLog = [...mockState.gameLog];  // log contains 'Game started. Player 1, place your first settlement.' when initialised

    expect(result.players[0].largestArmy).toBe(false);
    expect(result.players[0].victoryPoints).toBe(4);
    expect(result.gameLog).toEqual(initialLog);
  });

  it('should award largest army to the first player who reaches 3 played knights', () => {
    mockState.players[0].knightsPlayed = 3;

    const result = GameReducer.evaluateLargestArmy(mockState);

    expect(result.players[0].largestArmy).toBe(true);
    expect(result.players[0].victoryPoints).toBe(6); // Gained 2
    expect(result.gameLog).toContain('Player 1 claimed the Largest Army! (+2 VP)');
  });

  it('should transfer largest army when another player strictly surpasses current holder', () => {
    // Player 0 starts with the Largest Army and 3 knights
    mockState.players[0].knightsPlayed = 3;
    mockState.players[0].largestArmy = true;
    mockState.players[0].victoryPoints = 6; // Includes the 2 VP bonus

    // Player 1 overtakes them by playing their 4th knight
    mockState.players[1].knightsPlayed = 4;

    const result = GameReducer.evaluateLargestArmy(mockState);

    expect(result.players[0].largestArmy).toBe(false);
    expect(result.players[0].victoryPoints).toBe(4); // Lost 2
    expect(result.players[1].largestArmy).toBe(true);
    expect(result.players[1].victoryPoints).toBe(6); // Gained 2
    expect(result.gameLog).toContain('Player 1 lost the Largest Army.');
    expect(result.gameLog).toContain('Player 2 claimed the Largest Army! (+2 VP)');
  });

  it('should keep the largest army with the current holder if someone only ties them', () => {
    // Player 0 starts with the Largest Army and 3 knights
    mockState.players[0].knightsPlayed = 3;
    mockState.players[0].largestArmy = true;
    mockState.players[0].victoryPoints = 6; 

    // Player 1 plays their 3rd knight, tying Player 0
    mockState.players[1].knightsPlayed = 3;

    const result = GameReducer.evaluateLargestArmy(mockState);

    expect(result.players[0].largestArmy).toBe(true); // Player 0 retains it
    expect(result.players[0].victoryPoints).toBe(6);
    expect(result.players[1].largestArmy).toBe(false);
    expect(result.players[1].victoryPoints).toBe(4);
  });
});