import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useCatanGame } from '../useMultiplayerGame';

describe('useCatanGame Engine', () => {
  
  it('initializes with correct starting state', () => {
    const { result } = renderHook(() => useCatanGame());
    
    expect(result.current.state.players).toHaveLength(4);
    expect(result.current.state.currentPlayerIndex).toBe(0);
    expect(result.current.state.gameLog[0]).toContain('initialized');
  });

  it('prevents building a settlement without enough resources', () => {
    const { result } = renderHook(() => useCatanGame());
    const nodeId = result.current.state.nodes[0].id;

    act(() => {
      result.current.state.players[0].resources.wood = 0;
    });

    act(() => {
      result.current.actions.buildSettlement(nodeId);
    });

    expect(result.current.state.settlements[nodeId]).toBeUndefined();
    expect(result.current.state.gameLog[0]).toContain('Not enough resources');
  });

  it('enforces the Distance Rule for settlements', () => {
    const { result } = renderHook(() => useCatanGame());
    const nodeA = result.current.state.nodes.find(n => n.neighbors.length === 3)!;
    const nodeB = result.current.state.nodes.find(n => nodeA.neighbors.includes(n.id))!;

    act(() => {
      result.current.actions.buildSettlement(nodeA.id);
    });

    act(() => {
      result.current.actions.buildSettlement(nodeB.id);
    });

    expect(result.current.state.settlements[nodeB.id]).toBeUndefined();
    expect(result.current.state.gameLog[0]).toContain('Too close to another settlement!');
  });

  it('validates road connectivity (must connect to settlement or road)', () => {
    const { result } = renderHook(() => useCatanGame());
    const nodeA = result.current.state.nodes[10];
    const nodeB_id = nodeA.neighbors[0];

    act(() => {
      result.current.actions.buildRoad(nodeA.id, nodeB_id);
    });
    expect(Object.keys(result.current.state.roads)).toHaveLength(0);

    act(() => {
      result.current.actions.buildSettlement(nodeA.id);
    });
    
    act(() => {
      result.current.actions.buildRoad(nodeA.id, nodeB_id);
    });
    expect(Object.keys(result.current.state.roads)).toHaveLength(1);
  });

  it('distributes resources correctly on dice roll', () => {
    const { result } = renderHook(() => useCatanGame());
    
    const targetHex = result.current.state.hexes.find(h => h.resource !== 'desert')!;
    const targetToken = targetHex.numberToken!;
    
    const targetNode = result.current.state.nodes.find(n => 
      n.hexCoords.some(c => c.q === targetHex.q && c.r === targetHex.r)
    )!;

    act(() => {
      result.current.actions.buildSettlement(targetNode.id);
    });

    const initialResourceCount = result.current.state.players[0].resources[targetHex.resource];

    act(() => {
      result.current.actions.rollDice(); 
    });

    expect(result.current.state.diceRoll).toBeGreaterThanOrEqual(2);
  });

  it('cycles turns correctly', () => {
    const { result } = renderHook(() => useCatanGame());
    
    expect(result.current.state.currentPlayerIndex).toBe(0);
    
    act(() => {
      result.current.actions.endTurn();
    });
    
    expect(result.current.state.currentPlayerIndex).toBe(1);

    act(() => { result.current.actions.endTurn(); });
    act(() => { result.current.actions.endTurn(); });
    act(() => { result.current.actions.endTurn(); });
    
    expect(result.current.state.currentPlayerIndex).toBe(0);
  });
});