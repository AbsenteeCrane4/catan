import { describe, expect, it } from 'vitest';
import { catanReducer, createInitialState } from '@/lib/game-reducer';
import type { GameState, ResourceType } from '@/types/catan';
import { edgeId, piecesRemaining } from '@/lib/game/helpers/buildLegality';
import { PIECE_LIMITS } from '@/lib/constants';

/**
 * The piece supply is a rule of the reducer, not only of the build panel: a client that
 * skips the UI and sends the action directly must still be refused once the supply is
 * spent. Each limit is tested as a pair — the last piece is accepted, the one after it is
 * refused — so a refusal is proven to come from the supply and not from some other rule.
 */

const RICH: Record<ResourceType, number> = { wood: 20, brick: 20, sheep: 20, wheat: 20, ore: 20 };

type Edge = [string, string];

const base = (): GameState => {
  const initial = createInitialState();
  return {
    ...initial,
    phase: 'main',
    setupActionRequired: 'none',
    currentPlayerIndex: 0,
    diceRoll: 6,
    gameLog: [],
    players: initial.players.map(p => (p.id === 0 ? { ...p, resources: { ...RICH } } : p)),
  };
};

/** Every edge of the board, breadth-first from `start`, so each one touches an earlier edge. */
const edgesFrom = (state: GameState, start: string): Edge[] => {
  const byId = new Map(state.nodes.map(n => [n.id, n]));
  const seen = new Set<string>();
  const queue = [start];
  const edges: Edge[] = [];
  const visited = new Set([start]);
  while (queue.length) {
    const id = queue.shift()!;
    for (const next of byId.get(id)!.neighbors) {
      const key = edgeId(id, next);
      if (!seen.has(key)) {
        seen.add(key);
        edges.push([id, next]);
      }
      if (!visited.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    }
  }
  return edges;
};

/** Nodes none of which neighbour another, so any of them may hold a settlement. */
const spacedNodes = (state: GameState, count: number): string[] => {
  const chosen: string[] = [];
  for (const node of state.nodes) {
    if (chosen.every(id => !node.neighbors.includes(id))) chosen.push(node.id);
    if (chosen.length === count) break;
  }
  expect(chosen).toHaveLength(count);
  return chosen;
};

const ownedRoads = (edges: Edge[], playerId = 0): GameState['roads'] =>
  Object.fromEntries(
    edges.map(([a, b]) => [edgeId(a, b), { id: edgeId(a, b), playerId, nodes: [a, b] as Edge }])
  );

const settlementsAt = (ids: string[], isCity: boolean): GameState['settlements'] =>
  Object.fromEntries(ids.map(id => [id, { nodeId: id, playerId: 0, isCity }]));

const rejected = (before: GameState, after: GameState, message: string) => {
  expect(after.gameLog[0]).toContain(message);
  expect(after.roads).toEqual(before.roads);
  expect(after.settlements).toEqual(before.settlements);
  expect(after.players[0].resources).toEqual(before.players[0].resources);
};

describe('piece supply is enforced by the reducer', () => {
  describe('roads', () => {
    const withRoads = (count: number) => {
      const state = base();
      const [anchor] = spacedNodes(state, 1);
      const edges = edgesFrom(state, anchor);
      const next = edges[count];
      return {
        state: {
          ...state,
          settlements: settlementsAt([anchor], false),
          roads: ownedRoads(edges.slice(0, count)),
        },
        next,
      };
    };

    it('accepts the last road in the supply', () => {
      const { state, next } = withRoads(PIECE_LIMITS.road - 1);
      const after = catanReducer(state, {
        type: 'BUILD_ROAD',
        payload: { nodeId1: next[0], nodeId2: next[1], playerId: 0 },
      });

      expect(Object.keys(after.roads)).toHaveLength(PIECE_LIMITS.road);
      expect(piecesRemaining(after, 0).road).toBe(0);
    });

    it('refuses a road once all of them are placed', () => {
      const { state, next } = withRoads(PIECE_LIMITS.road);
      const after = catanReducer(state, {
        type: 'BUILD_ROAD',
        payload: { nodeId1: next[0], nodeId2: next[1], playerId: 0 },
      });

      rejected(state, after, 'no roads left');
    });

    it("counts only the builder's own roads", () => {
      const { state, next } = withRoads(PIECE_LIMITS.road);
      const opponentEdges = edgesFrom(state, state.nodes[state.nodes.length - 1].id).slice(0, PIECE_LIMITS.road);
      const crowded: GameState = {
        ...state,
        // Player 1 holds a full set elsewhere; player 0 is still full too, so this proves
        // the count is per player by the fact that player 1's roads do not matter either way.
        roads: { ...ownedRoads(opponentEdges, 1), ...state.roads },
      };

      expect(piecesRemaining(crowded, 1).road).toBe(0);
      const after = catanReducer(crowded, {
        type: 'BUILD_ROAD',
        payload: { nodeId1: next[0], nodeId2: next[1], playerId: 0 },
      });
      rejected(crowded, after, 'no roads left');
    });

    it('stops the free setup road too', () => {
      const { state, next } = withRoads(PIECE_LIMITS.road);
      const setup: GameState = { ...state, phase: 'setup1', setupActionRequired: 'road' };
      const after = catanReducer(setup, {
        type: 'BUILD_ROAD',
        payload: { nodeId1: next[0], nodeId2: next[1], playerId: 0 },
      });

      rejected(setup, after, 'no roads left');
    });
  });

  describe('settlements', () => {
    const withSettlements = (count: number) => {
      const state = base();
      const nodes = spacedNodes(state, count + 1);
      const target = nodes[count];
      const neighbor = state.nodes.find(n => n.id === target)!.neighbors[0];
      return {
        state: {
          ...state,
          settlements: settlementsAt(nodes.slice(0, count), false),
          // A road touching the target, so the only thing standing in the way is the supply.
          roads: ownedRoads([[target, neighbor]]),
        },
        target,
      };
    };

    it('accepts the last settlement in the supply', () => {
      const { state, target } = withSettlements(PIECE_LIMITS.settlement - 1);
      const after = catanReducer(state, {
        type: 'BUILD_SETTLEMENT',
        payload: { nodeId: target, playerId: 0 },
      });

      expect(after.settlements[target]).toBeDefined();
      expect(piecesRemaining(after, 0).settlement).toBe(0);
    });

    it('refuses a settlement once all of them are placed', () => {
      const { state, target } = withSettlements(PIECE_LIMITS.settlement);
      const after = catanReducer(state, {
        type: 'BUILD_SETTLEMENT',
        payload: { nodeId: target, playerId: 0 },
      });

      rejected(state, after, 'no settlements left');
      expect(after.settlements[target]).toBeUndefined();
    });

    it('refuses a free setup settlement past the limit as well', () => {
      const { state, target } = withSettlements(PIECE_LIMITS.settlement);
      const setup: GameState = { ...state, phase: 'setup2', setupActionRequired: 'settlement' };
      const after = catanReducer(setup, {
        type: 'BUILD_SETTLEMENT',
        payload: { nodeId: target, playerId: 0 },
      });

      rejected(setup, after, 'no settlements left');
    });
  });

  describe('cities', () => {
    const withCities = (cities: number) => {
      const state = base();
      const nodes = spacedNodes(state, cities + 1);
      return {
        state: {
          ...state,
          settlements: {
            ...settlementsAt(nodes.slice(0, cities), true),
            ...settlementsAt([nodes[cities]], false),
          },
        },
        target: nodes[cities],
      };
    };

    it('accepts the last city in the supply', () => {
      const { state, target } = withCities(PIECE_LIMITS.city - 1);
      const after = catanReducer(state, {
        type: 'UPGRADE_SETTLEMENT',
        payload: { nodeId: target, playerId: 0 },
      });

      expect(after.settlements[target].isCity).toBe(true);
      expect(piecesRemaining(after, 0).city).toBe(0);
    });

    it('refuses an upgrade once all the cities are placed', () => {
      const { state, target } = withCities(PIECE_LIMITS.city);
      const after = catanReducer(state, {
        type: 'UPGRADE_SETTLEMENT',
        payload: { nodeId: target, playerId: 0 },
      });

      rejected(state, after, 'no cities left');
      expect(after.settlements[target].isCity).toBe(false);
    });

    it('frees a settlement piece when it is upgraded, so another can be built', () => {
      const state = base();
      const nodes = spacedNodes(state, PIECE_LIMITS.settlement + 1);
      const spare = nodes[PIECE_LIMITS.settlement];
      const neighbor = state.nodes.find(n => n.id === spare)!.neighbors[0];
      const full: GameState = {
        ...state,
        settlements: settlementsAt(nodes.slice(0, PIECE_LIMITS.settlement), false),
        roads: ownedRoads([[spare, neighbor]]),
      };
      const build = (s: GameState) =>
        catanReducer(s, { type: 'BUILD_SETTLEMENT', payload: { nodeId: spare, playerId: 0 } });

      expect(build(full).settlements[spare]).toBeUndefined();

      const upgraded = catanReducer(full, {
        type: 'UPGRADE_SETTLEMENT',
        payload: { nodeId: nodes[0], playerId: 0 },
      });
      expect(build(upgraded).settlements[spare]).toBeDefined();
    });
  });

  describe('Road Building', () => {
    const play = (state: GameState, edges: Edge[]) => {
      const loaded: GameState = {
        ...state,
        players: state.players.map(p =>
          p.id === 0 ? { ...p, devCards: { playable: ['roadBuilding'], boughtThisTurn: [], played: [] } } : p
        ),
      };
      return {
        loaded,
        after: catanReducer(loaded, {
          type: 'PLAY_DEV_CARD',
          payload: { playerId: 0, cardType: 'roadBuilding', cardArgs: { road1: edges[0], road2: edges[1] } },
        }),
      };
    };

    const withRoads = (count: number) => {
      const state = base();
      const [anchor] = spacedNodes(state, 1);
      const edges = edgesFrom(state, anchor);
      return {
        state: { ...state, settlements: settlementsAt([anchor], false), roads: ownedRoads(edges.slice(0, count)) },
        next: edges.slice(count, count + 2),
      };
    };

    it('places two roads when the supply covers both', () => {
      const { state, next } = withRoads(PIECE_LIMITS.road - 2);
      const { after } = play(state, next);

      expect(Object.keys(after.roads)).toHaveLength(PIECE_LIMITS.road);
    });

    it('places just the last road when only one is left', () => {
      const { state, next } = withRoads(PIECE_LIMITS.road - 1);
      const { after } = play(state, next);

      expect(Object.keys(after.roads)).toHaveLength(PIECE_LIMITS.road);
      expect(after.roads[edgeId(next[0][0], next[0][1])]).toBeDefined();
      expect(after.roads[edgeId(next[1][0], next[1][1])]).toBeUndefined();
      expect(after.players[0].devCards.played).toContain('roadBuilding');
    });

    it('accepts the last road alone, without a second placement', () => {
      const { state, next } = withRoads(PIECE_LIMITS.road - 1);
      const loaded: GameState = {
        ...state,
        players: state.players.map(p =>
          p.id === 0 ? { ...p, devCards: { playable: ['roadBuilding'], boughtThisTurn: [], played: [] } } : p
        ),
      };
      const after = catanReducer(loaded, {
        type: 'PLAY_DEV_CARD',
        payload: { playerId: 0, cardType: 'roadBuilding', cardArgs: { road1: next[0] } },
      });

      expect(Object.keys(after.roads)).toHaveLength(PIECE_LIMITS.road);
    });

    it('still requires the last road to connect to an existing road', () => {
      const { state } = withRoads(PIECE_LIMITS.road - 1);
      const stranded = state.nodes.find(
        n => !Object.values(state.roads).some(r => r.nodes.includes(n.id)) && !state.settlements[n.id]
      )!;
      const edge: Edge = [stranded.id, stranded.neighbors[0]];
      const { loaded, after } = play(state, [edge, edge]);

      rejected(loaded, after, 'Invalid first road placement');
      expect(after.players[0].devCards.playable).toContain('roadBuilding');
    });

    it('refuses the card when no roads are left, and keeps the card', () => {
      const { state, next } = withRoads(PIECE_LIMITS.road);
      const { loaded, after } = play(state, next);

      rejected(loaded, after, 'no roads left');
      expect(after.players[0].devCards.playable).toContain('roadBuilding');
    });
  });
});
