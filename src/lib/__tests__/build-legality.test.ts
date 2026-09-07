import { describe, expect, it } from 'vitest';
import { catanReducer, createInitialState } from '@/lib/game-reducer';
import type { GameState, ResourceType } from '@/types/catan';
import {
  buildStateFromGame,
  canBuild,
  edgeId,
  legalCityNodes,
  legalRoadEdges,
  legalSettlementNodes,
  piecesRemaining,
} from '@/lib/game/helpers/buildLegality';
import { PIECE_LIMITS } from '@/lib/constants';

/**
 * The selectors and the reducer must agree, or the build panel and the board highlighting
 * become a second, drifting copy of the rules.
 *
 * These tests do not assert the selectors against hand-written expectations. They assert
 * them against the reducer itself: for every node and every edge on a real board, being
 * in the selector's output must mean the reducer accepts the build, and being absent must
 * mean it rejects it. That is the property #47 depends on, and it stays true even if a
 * placement rule changes.
 */

const RICH: Record<ResourceType, number> = { wood: 9, brick: 9, sheep: 9, wheat: 9, ore: 9 };

const road = (a: string, b: string) => ({
  [edgeId(a, b)]: { id: edgeId(a, b), playerId: 0, nodes: [a, b] as [string, string] },
});

/**
 * A main-phase game where seat 0 has rolled, is rich, and owns a settlement with two
 * roads running away from it.
 *
 * The second road matters: with only one, every node the network reaches is adjacent to
 * the settlement and therefore barred by the distance rule, so there would be no legal
 * settlement spot at all and the comparison below would prove nothing.
 */
const mainPhaseGame = (): { state: GameState; nodeId: string; neighborId: string; farId: string } => {
  const initial = createInitialState();

  const node = initial.nodes.find(n =>
    n.neighbors.some(id => (initial.nodes.find(o => o.id === id)?.neighbors.length ?? 0) >= 2)
  )!;
  const neighbor = initial.nodes.find(n => n.id === node.neighbors[0])!;
  const farId = neighbor.neighbors.find(id => id !== node.id)!;

  const state: GameState = {
    ...initial,
    phase: 'main',
    setupActionRequired: 'none',
    currentPlayerIndex: 0,
    diceRoll: 6,
    gameLog: [],
    settlements: { [node.id]: { nodeId: node.id, playerId: 0, isCity: false } },
    roads: { ...road(node.id, neighbor.id), ...road(neighbor.id, farId) },
    players: initial.players.map(p => (p.id === 0 ? { ...p, resources: { ...RICH } } : p)),
  };

  return { state, nodeId: node.id, neighborId: neighbor.id, farId };
};

/** Every edge on the board, as the board itself would enumerate them. */
const allEdges = (state: GameState): [string, string][] => {
  const seen = new Set<string>();
  const edges: [string, string][] = [];
  for (const node of state.nodes) {
    for (const neighborId of node.neighbors) {
      const id = edgeId(node.id, neighborId);
      if (seen.has(id)) continue;
      seen.add(id);
      edges.push([node.id, neighborId]);
    }
  }
  return edges;
};

// Each of these asks whether the piece is *newly* there. Checking only the state after
// dispatch would count a spot that was already occupied as an acceptance.
const reducerAcceptsSettlement = (state: GameState, playerId: number, nodeId: string) => {
  if (state.settlements[nodeId]) return false;
  const after = catanReducer(state, { type: 'BUILD_SETTLEMENT', payload: { nodeId, playerId } });
  return after.settlements[nodeId] !== undefined;
};

const reducerAcceptsRoad = (state: GameState, playerId: number, edge: [string, string]) => {
  const id = edgeId(edge[0], edge[1]);
  if (state.roads[id]) return false;
  const after = catanReducer(state, {
    type: 'BUILD_ROAD',
    payload: { nodeId1: edge[0], nodeId2: edge[1], playerId },
  });
  return after.roads[id] !== undefined;
};

const reducerAcceptsCity = (state: GameState, playerId: number, nodeId: string) => {
  if (state.settlements[nodeId]?.isCity) return false;
  const after = catanReducer(state, { type: 'UPGRADE_SETTLEMENT', payload: { nodeId, playerId } });
  return after.settlements[nodeId]?.isCity === true;
};

describe('build legality selectors', () => {
  describe('legal targets match what the reducer accepts', () => {
    it('agrees with the reducer on every node for a settlement', () => {
      const { state } = mainPhaseGame();
      const legal = new Set(legalSettlementNodes(buildStateFromGame(state), 0));

      const disagreements = state.nodes
        .map(n => ({
          id: n.id,
          selector: legal.has(n.id),
          reducer: reducerAcceptsSettlement(state, 0, n.id),
        }))
        .filter(r => r.selector !== r.reducer);

      expect(disagreements, 'nodes where selector and reducer disagree').toEqual([]);
      // Guards against the whole check passing because nothing was legal anywhere.
      expect(legal.size).toBeGreaterThan(0);
    });

    it('agrees with the reducer on every edge for a road', () => {
      const { state } = mainPhaseGame();
      const legal = new Set(
        legalRoadEdges(buildStateFromGame(state), 0).map(([a, b]) => edgeId(a, b))
      );

      const disagreements = allEdges(state)
        .map(edge => ({
          id: edgeId(edge[0], edge[1]),
          selector: legal.has(edgeId(edge[0], edge[1])),
          reducer: reducerAcceptsRoad(state, 0, edge),
        }))
        .filter(r => r.selector !== r.reducer);

      expect(disagreements, 'edges where selector and reducer disagree').toEqual([]);
      expect(legal.size).toBeGreaterThan(0);
    });

    it('agrees with the reducer on every node for a city', () => {
      const { state } = mainPhaseGame();
      const legal = new Set(legalCityNodes(buildStateFromGame(state), 0));

      const disagreements = state.nodes
        .map(n => ({
          id: n.id,
          selector: legal.has(n.id),
          reducer: reducerAcceptsCity(state, 0, n.id),
        }))
        .filter(r => r.selector !== r.reducer);

      expect(disagreements, 'nodes where selector and reducer disagree').toEqual([]);
      expect(legal.size).toBe(1);
    });

    it('offers no settlement spot that is adjacent to an existing one', () => {
      const { state, nodeId } = mainPhaseGame();
      const legal = legalSettlementNodes(buildStateFromGame(state), 0);

      expect(legal).not.toContain(nodeId);
    });

    it('agrees with the reducer during the setup phase, where placement is free-standing', () => {
      const initial = createInitialState();
      const state: GameState = { ...initial, phase: 'setup1', setupActionRequired: 'settlement', gameLog: [] };
      const legal = new Set(legalSettlementNodes(buildStateFromGame(state), 0));

      const disagreements = state.nodes
        .map(n => ({
          id: n.id,
          selector: legal.has(n.id),
          reducer: reducerAcceptsSettlement(state, 0, n.id),
        }))
        .filter(r => r.selector !== r.reducer);

      expect(disagreements, 'setup nodes where selector and reducer disagree').toEqual([]);
      // Setup needs no road connection, so an empty board offers every node.
      expect(legal.size).toBe(state.nodes.length);
    });
  });

  describe('canBuild reasons', () => {
    it('allows every item to a rich player on their turn', () => {
      const { state } = mainPhaseGame();
      const view = buildStateFromGame(state);

      for (const kind of ['road', 'settlement', 'city', 'devCard'] as const) {
        expect(canBuild(view, 0, kind).allowed, `${kind} should be allowed`).toBe(true);
      }
    });

    it('rejects a seat that is not the current player', () => {
      const { state } = mainPhaseGame();
      const availability = canBuild(buildStateFromGame(state), 1, 'road');

      expect(availability.allowed).toBe(false);
      expect(availability.blocker).toEqual({ reason: 'not-your-turn' });
    });

    it('reports exactly which resources are missing, and by how much', () => {
      const { state } = mainPhaseGame();
      const poor: GameState = {
        ...state,
        players: state.players.map(p =>
          p.id === 0 ? { ...p, resources: { wood: 0, brick: 1, sheep: 0, wheat: 5, ore: 0 } } : p
        ),
      };

      const availability = canBuild(buildStateFromGame(poor), 0, 'settlement');

      expect(availability.allowed).toBe(false);
      expect(availability.blocker).toEqual({
        reason: 'insufficient-resources',
        missing: { wood: 1, sheep: 1 },
      });
      // brick and wheat are covered, so they are not reported as missing.
      expect(availability.missing).toEqual({ wood: 1, sheep: 1 });
    });

    it('rejects a build the reducer would also reject for want of resources', () => {
      const { state } = mainPhaseGame();
      const broke: GameState = {
        ...state,
        players: state.players.map(p =>
          p.id === 0 ? { ...p, resources: { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 } } : p
        ),
      };

      expect(canBuild(buildStateFromGame(broke), 0, 'settlement').allowed).toBe(false);

      const legal = legalSettlementNodes(buildStateFromGame(broke), 0);
      expect(reducerAcceptsSettlement(broke, 0, legal[0])).toBe(false);
    });

    it('reports an empty development deck', () => {
      const { state } = mainPhaseGame();
      const availability = canBuild(buildStateFromGame({ ...state, devCardDeck: [] }), 0, 'devCard');

      expect(availability.blocker).toEqual({ reason: 'dev-deck-empty' });
    });

    it('reports when there is nowhere legal left to place', () => {
      const { state } = mainPhaseGame();
      // A player with no settlements and no roads has no network to attach to.
      const stranded: GameState = { ...state, settlements: {}, roads: {} };

      expect(canBuild(buildStateFromGame(stranded), 0, 'road').blocker).toEqual({
        reason: 'no-legal-placement',
      });
      expect(canBuild(buildStateFromGame(stranded), 0, 'settlement').blocker).toEqual({
        reason: 'no-legal-placement',
      });
    });

    describe('setup phase', () => {
      const setupGame = (setupActionRequired: 'settlement' | 'road'): GameState => ({
        ...createInitialState(),
        phase: 'setup1',
        setupActionRequired,
        currentPlayerIndex: 0,
        gameLog: [],
      });

      it('allows the piece the snake draft is waiting for, without charging for it', () => {
        const state = setupGame('settlement');
        // Deliberately broke: setup placements are free.
        const broke: GameState = {
          ...state,
          players: state.players.map(p =>
            p.id === 0 ? { ...p, resources: { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 } } : p
          ),
        };

        expect(canBuild(buildStateFromGame(broke), 0, 'settlement').allowed).toBe(true);
      });

      it('names the piece that is required when the other one is attempted', () => {
        const availability = canBuild(buildStateFromGame(setupGame('road')), 0, 'settlement');

        expect(availability.blocker).toEqual({ reason: 'setup-requires', action: 'road' });
      });

      it('offers neither cities nor development cards', () => {
        const view = buildStateFromGame(setupGame('settlement'));

        expect(canBuild(view, 0, 'city').blocker).toEqual({ reason: 'wrong-phase' });
        expect(canBuild(view, 0, 'devCard').blocker).toEqual({ reason: 'wrong-phase' });
      });
    });

    /**
     * Two rules the printed game has and this reducer does not. The selector applies them
     * so the UI matches Catan, and both are conservative — they only ever withhold an
     * action, never permit one the reducer would reject. Adding either to the reducer
     * would change its behaviour, which #54 rules out.
     */
    describe('rules the UI enforces ahead of the reducer', () => {
      it('withholds building until the dice have been rolled', () => {
        const { state } = mainPhaseGame();
        const beforeRoll: GameState = { ...state, diceRoll: null };

        expect(canBuild(buildStateFromGame(beforeRoll), 0, 'road').blocker).toEqual({
          reason: 'dice-not-rolled',
        });
        // The reducer itself has no such gate; this is the UI being stricter on purpose.
        const legal = legalRoadEdges(buildStateFromGame(beforeRoll), 0)[0];
        expect(reducerAcceptsRoad(beforeRoll, 0, legal)).toBe(true);
      });

      it('withholds a piece the player has run out of', () => {
        const { state } = mainPhaseGame();
        const allRoadsPlaced: GameState = {
          ...state,
          roads: Object.fromEntries(
            allEdges(state)
              .slice(0, PIECE_LIMITS.road)
              .map(([a, b]) => [edgeId(a, b), { id: edgeId(a, b), playerId: 0, nodes: [a, b] as [string, string] }])
          ),
        };

        expect(piecesRemaining(buildStateFromGame(allRoadsPlaced), 0).road).toBe(0);
        expect(canBuild(buildStateFromGame(allRoadsPlaced), 0, 'road').blocker).toEqual({
          reason: 'no-pieces-remaining',
        });
      });
    });
  });

  describe('piece supply', () => {
    it('starts each player with a full supply', () => {
      const state = createInitialState();

      expect(piecesRemaining(buildStateFromGame(state), 0)).toEqual({
        road: PIECE_LIMITS.road,
        settlement: PIECE_LIMITS.settlement,
        city: PIECE_LIMITS.city,
      });
    });

    it('returns a settlement to the supply when it becomes a city', () => {
      const { state, nodeId } = mainPhaseGame();
      const upgraded = catanReducer(state, {
        type: 'UPGRADE_SETTLEMENT',
        payload: { nodeId, playerId: 0 },
      });

      const before = piecesRemaining(buildStateFromGame(state), 0);
      const after = piecesRemaining(buildStateFromGame(upgraded), 0);

      expect(before.settlement).toBe(PIECE_LIMITS.settlement - 1);
      expect(after.settlement).toBe(PIECE_LIMITS.settlement);
      expect(after.city).toBe(PIECE_LIMITS.city - 1);
    });
  });
});
