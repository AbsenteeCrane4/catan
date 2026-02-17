import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useCatanGame } from '../useCatanGame';

describe('useCatanGame Logic', () => {
  it('should initialize with starting resources', () => {
    const { result } = renderHook(() => useCatanGame());
    const player1 = result.current.state.players[0];
    
    // Based on our previous implementation of 4 wood, 4 brick
    expect(player1.resources.wood).toBe(4);
    expect(player1.resources.brick).toBe(4);
  });

  it('should deduct resources when building a road', () => {
    const { result } = renderHook(() => useCatanGame());
    
    // 1. Manually place a settlement so we can build a road next to it
    const nodeId = result.current.state.nodes[0].id;
    const neighborId = result.current.state.nodes[0].neighbors[0];

    act(() => {
      result.current.actions.buildSettlement(nodeId);
    });

    const woodBefore = result.current.state.players[0].resources.wood;
    
    act(() => {
      result.current.actions.buildRoad(nodeId, neighborId);
    });

    expect(result.current.state.players[0].resources.wood).toBe(woodBefore - 1);
    expect(Object.keys(result.current.state.roads).length).toBe(1);
  });

  it('should not allow building a settlement if resources are insufficient', () => {
    const { result } = renderHook(() => useCatanGame());
    
    // Drain resources
    act(() => {
        result.current.state.players[0].resources.wood = 0;
    });

    const nodeId = result.current.state.nodes[10].id;
    act(() => {
        result.current.actions.buildSettlement(nodeId);
    });

    expect(result.current.state.settlements[nodeId]).toBeUndefined();
  });
});