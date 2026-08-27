import { describe, it, expect } from 'vitest';
import { catanReducer } from '@/lib/game-reducer';
import { createInitialState, SeatConfig } from '@/lib/game/state/createInitialState';
import { getAdjacentNodeIds } from '@/lib/game/helpers/board';
import { PLAYER_COLORS } from '@/lib/constants';
import { GameState } from '@/types/catan';

const seats = (count: number): SeatConfig[] =>
  Array.from({ length: count }, (_, i) => ({
    name: `P${i + 1}`,
    color: PLAYER_COLORS[i],
  }));

/** First node with no settlement on it or on any neighbour. */
function freeNodeId(state: GameState): string {
  const node = state.nodes.find(
    n =>
      !state.settlements[n.id] &&
      !getAdjacentNodeIds(n.id, state.nodes).some(id => state.settlements[id])
  );
  if (!node) throw new Error('no legal settlement site left');
  return node.id;
}

/**
 * Plays the opening settlement+road for the current player and returns the new state.
 * Placement is greedy rather than fixed so the same driver works at every player count.
 */
function placeSettlementAndRoad(state: GameState): GameState {
  const playerId = state.currentPlayerIndex;
  const nodeId = freeNodeId(state);

  let next = catanReducer(state, { type: 'BUILD_SETTLEMENT', payload: { nodeId, playerId } });
  expect(next.settlements[nodeId]?.playerId).toBe(playerId);
  expect(next.setupActionRequired).toBe('road');
  expect(next.currentPlayerIndex).toBe(playerId); // the placer still holds the turn

  const neighbour = getAdjacentNodeIds(nodeId, next.nodes).find(
    id => !next.roads[[nodeId, id].sort().join('-')]
  );
  if (!neighbour) throw new Error('settlement has no free adjacent edge');

  next = catanReducer(next, {
    type: 'BUILD_ROAD',
    payload: { nodeId1: nodeId, nodeId2: neighbour, playerId },
  });
  expect(next.roads[[nodeId, neighbour].sort().join('-')]).toBeDefined();

  return next;
}

describe.each([2, 3, 4, 5, 6])('snake draft with %i players', count => {
  const run = () => {
    let state = createInitialState({ players: seats(count) });
    const order: number[] = [];
    const phases: string[] = [];

    for (let turn = 0; turn < count * 2; turn++) {
      order.push(state.currentPlayerIndex);
      phases.push(state.phase);
      state = placeSettlementAndRoad(state);
    }
    return { state, order, phases };
  };

  it('runs forwards then backwards through every seat exactly twice', () => {
    const forwards = Array.from({ length: count }, (_, i) => i);
    expect(run().order).toEqual([...forwards, ...forwards.slice().reverse()]);
  });

  it('switches from setup1 to setup2 halfway through', () => {
    const { phases } = run();
    expect(phases.slice(0, count).every(p => p === 'setup1')).toBe(true);
    expect(phases.slice(count).every(p => p === 'setup2')).toBe(true);
  });

  it('reaches the main phase once the last road is placed', () => {
    const { state } = run();
    expect(state.phase).toBe('main');
    expect(state.setupActionRequired).toBe('none');
    expect(state.currentPlayerIndex).toBe(0);
  });

  it('leaves every player with two settlements, two roads and two victory points', () => {
    const { state } = run();
    for (const player of state.players) {
      expect(Object.values(state.settlements).filter(s => s.playerId === player.id)).toHaveLength(2);
      expect(Object.values(state.roads).filter(r => r.playerId === player.id)).toHaveLength(2);
      expect(player.victoryPoints).toBe(2);
    }
  });

  it('wraps the turn order back to the first player at the end of a round', () => {
    let state = run().state;
    const visited: number[] = [];
    for (let turn = 0; turn < count + 1; turn++) {
      visited.push(state.currentPlayerIndex);
      state = catanReducer(state, { type: 'END_TURN' });
    }
    expect(visited).toEqual([...Array.from({ length: count }, (_, i) => i), 0]);
  });
});
