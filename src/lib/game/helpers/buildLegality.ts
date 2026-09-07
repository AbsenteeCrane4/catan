import type {
  GameState,
  GameStateView,
  ResourceType,
  SetupAction,
} from "@/types/catan";
import { BUILD_COSTS, PIECE_LIMITS } from "@/lib/constants";
import { getAdjacentNodeIds, isNodeConnectedToPlayerRoad, isValidRoadPlacement } from "./board";

/**
 * Build legality, in one place.
 *
 * These rules used to live inline inside each command handler, interleaved with the
 * mutation, so there was no way to ask "may I?" without also doing it. The panel and the
 * board both need the answer, and a second copy of the distance rule or the
 * road-connection rule would drift from the reducer the first time either changed.
 *
 * Everything here is pure and renderer-agnostic: targets come back as node ids and node
 * id pairs, never as component state or SVG hit-testing, so #55 can swap the board
 * renderer without touching any of it.
 */

export type BuildKind = 'road' | 'settlement' | 'city' | 'devCard';

export const BUILD_KINDS: BuildKind[] = ['road', 'settlement', 'city', 'devCard'];

/** Kinds that are placed on the board. `devCard` is bought, not placed. */
export type PlaceableKind = Exclude<BuildKind, 'devCard'>;

export const isPlaceable = (kind: BuildKind): kind is PlaceableKind => kind !== 'devCard';

/** A node id pair, always sorted, so an edge has one representation everywhere. */
export type EdgeKey = [string, string];

export const edgeId = (a: string, b: string): string => [a, b].sort().join('-');

export type BuildBlocker =
  | { reason: 'not-your-turn' }
  | { reason: 'dice-not-rolled' }
  /** During setup only the one piece the snake draft is waiting for may be placed. */
  | { reason: 'setup-requires'; action: Exclude<SetupAction, 'none'> }
  /** Cities and development cards do not exist during setup. */
  | { reason: 'wrong-phase' }
  | { reason: 'insufficient-resources'; missing: Partial<Record<ResourceType, number>> }
  | { reason: 'no-pieces-remaining' }
  | { reason: 'no-legal-placement' }
  | { reason: 'dev-deck-empty' };

export interface BuildAvailability {
  kind: BuildKind;
  /** True only when the action would be accepted right now. */
  allowed: boolean;
  /** The first thing standing in the way, or null when allowed. */
  blocker: BuildBlocker | null;
  cost: Partial<Record<ResourceType, number>>;
  /**
   * Shortfall per resource, always computed even when a different blocker dominates, so
   * the panel can dim an item *and* say what it is short of.
   */
  missing: Partial<Record<ResourceType, number>>;
  /** Pieces left in the player's supply; null for a development card. */
  piecesRemaining: number | null;
}

/**
 * The parts of the game state these rules read.
 *
 * Written as a structural type rather than `GameState` so the client can pass the
 * redacted `GameStateView` it actually receives. `resources` is nullable for the same
 * reason: on the client every seat but the viewer's is null, and legality for a hand
 * this client cannot see is not a question anyone may ask.
 */
export type BuildStateLike = Omit<GameState, 'players' | 'devCardDeck'> & {
  players: readonly { id: number; resources: Record<ResourceType, number> | null }[];
  /** Cards left in the development deck. Size only — the order is never needed here. */
  devCardsLeft: number;
};

export const buildStateFromGame = (state: GameState): BuildStateLike => ({
  ...state,
  devCardsLeft: state.devCardDeck.length,
});

export const buildStateFromView = (view: GameStateView): BuildStateLike => ({
  ...view,
  devCardsLeft: view.devCardDeckCount,
});

// --- individual rules -------------------------------------------------------------
// Each of these is called by both a command handler and the selectors below, so the
// reducer and the UI cannot disagree about a rule.

/** The distance rule: no settlement may touch another settlement's node. */
export const isTooCloseToSettlement = (
  state: Pick<BuildStateLike, 'nodes' | 'settlements'>,
  nodeId: string
): boolean => getAdjacentNodeIds(nodeId, state.nodes).some(id => !!state.settlements[id]);

/** Why a settlement cannot go on this node, or null when it can. */
export type SettlementSpotBlocker = 'occupied' | 'too-close' | 'unconnected';

export const settlementBlockerAt = (
  state: Pick<BuildStateLike, 'nodes' | 'settlements' | 'roads' | 'phase'>,
  playerId: number,
  nodeId: string
): SettlementSpotBlocker | null => {
  if (state.settlements[nodeId]) return 'occupied';
  if (isTooCloseToSettlement(state, nodeId)) return 'too-close';
  // Setup placements are free-standing; every later settlement must reach the network.
  if (state.phase === 'main' && !isNodeConnectedToPlayerRoad(nodeId, state.roads, playerId)) {
    return 'unconnected';
  }
  return null;
};

export const canPlaceSettlementAt = (
  state: Pick<BuildStateLike, 'nodes' | 'settlements' | 'roads' | 'phase'>,
  playerId: number,
  nodeId: string
): boolean => settlementBlockerAt(state, playerId, nodeId) === null;

/** Why this node cannot be upgraded to a city by this player, or null when it can. */
export type CitySpotBlocker = 'no-settlement' | 'not-yours' | 'already-city';

export const cityBlockerAt = (
  state: Pick<BuildStateLike, 'settlements'>,
  playerId: number,
  nodeId: string
): CitySpotBlocker | null => {
  const settlement = state.settlements[nodeId];
  if (!settlement) return 'no-settlement';
  if (settlement.playerId !== playerId) return 'not-yours';
  if (settlement.isCity) return 'already-city';
  return null;
};

/** Whether this player may upgrade the settlement on this node to a city. */
export const canUpgradeAt = (
  state: Pick<BuildStateLike, 'settlements'>,
  playerId: number,
  nodeId: string
): boolean => cityBlockerAt(state, playerId, nodeId) === null;

/** How many of each piece this player has already placed. */
export const piecesUsed = (
  state: Pick<BuildStateLike, 'roads' | 'settlements'>,
  playerId: number
): Record<PlaceableKind, number> => {
  const owned = Object.values(state.settlements).filter(s => s.playerId === playerId);
  return {
    road: Object.values(state.roads).filter(r => r.playerId === playerId).length,
    settlement: owned.filter(s => !s.isCity).length,
    city: owned.filter(s => s.isCity).length,
  };
};

export const piecesRemaining = (
  state: Pick<BuildStateLike, 'roads' | 'settlements'>,
  playerId: number
): Record<PlaceableKind, number> => {
  const used = piecesUsed(state, playerId);
  return {
    road: PIECE_LIMITS.road - used.road,
    settlement: PIECE_LIMITS.settlement - used.settlement,
    city: PIECE_LIMITS.city - used.city,
  };
};

/** Which resources the player is short of for this item, and by how much. */
export const missingResourcesFor = (
  resources: Record<ResourceType, number>,
  kind: BuildKind
): Partial<Record<ResourceType, number>> => {
  const missing: Partial<Record<ResourceType, number>> = {};
  for (const [resource, needed] of Object.entries(BUILD_COSTS[kind]) as [ResourceType, number][]) {
    const shortfall = needed - (resources[resource] ?? 0);
    if (shortfall > 0) missing[resource] = shortfall;
  }
  return missing;
};

export const canAfford = (
  resources: Record<ResourceType, number>,
  kind: BuildKind
): boolean => Object.keys(missingResourcesFor(resources, kind)).length === 0;

/**
 * The player's resources with this item's cost deducted. Keeps the cost table the only
 * place the numbers appear, so the panel cannot advertise a price the reducer does not
 * charge.
 */
export const payCostFor = (
  resources: Record<ResourceType, number>,
  kind: BuildKind
): Record<ResourceType, number> => {
  const paid = { ...resources };
  for (const [resource, amount] of Object.entries(BUILD_COSTS[kind]) as [ResourceType, number][]) {
    paid[resource] -= amount;
  }
  return paid;
};

// --- legal targets ----------------------------------------------------------------

export const legalSettlementNodes = (
  state: Pick<BuildStateLike, 'nodes' | 'settlements' | 'roads' | 'phase'>,
  playerId: number
): string[] => state.nodes.filter(n => canPlaceSettlementAt(state, playerId, n.id)).map(n => n.id);

export const legalCityNodes = (
  state: Pick<BuildStateLike, 'settlements'>,
  playerId: number
): string[] =>
  Object.values(state.settlements)
    .filter(s => canUpgradeAt(state, playerId, s.nodeId))
    .map(s => s.nodeId);

export const legalRoadEdges = (
  state: Pick<BuildStateLike, 'nodes' | 'settlements' | 'roads'>,
  playerId: number
): EdgeKey[] => {
  const seen = new Set<string>();
  const edges: EdgeKey[] = [];

  for (const node of state.nodes) {
    for (const neighborId of node.neighbors) {
      const id = edgeId(node.id, neighborId);
      if (seen.has(id)) continue;
      seen.add(id);
      // isValidRoadPlacement is the reducer's own predicate, deliberately reused whole:
      // it already covers "edge is free" and "connects to my network".
      if (isValidRoadPlacement(node.id, neighborId, playerId, state as GameState)) {
        edges.push([node.id, neighborId]);
      }
    }
  }

  return edges;
};

export interface LegalTargets {
  nodes: string[];
  edges: EdgeKey[];
}

const NO_TARGETS: LegalTargets = { nodes: [], edges: [] };

/**
 * Every place this player may legally put this piece right now, as ids.
 *
 * Placement only — it deliberately ignores cost and whose turn it is, so the board can
 * be asked "where could this go?" separately from "may I build it?". `canBuild` combines
 * the two.
 */
export const legalTargets = (
  state: BuildStateLike,
  playerId: number,
  kind: BuildKind
): LegalTargets => {
  switch (kind) {
    case 'settlement':
      return { nodes: legalSettlementNodes(state, playerId), edges: [] };
    case 'city':
      return { nodes: legalCityNodes(state, playerId), edges: [] };
    case 'road':
      return { nodes: [], edges: legalRoadEdges(state, playerId) };
    case 'devCard':
      return NO_TARGETS;
  }
};

// --- availability -----------------------------------------------------------------

/**
 * May this player build this right now, and if not, why not.
 *
 * Two of the reasons are stricter than the reducer, on purpose:
 *
 * - `dice-not-rolled`: real Catan makes you roll before you build, and the reducer does
 *   not enforce it (`buildRoad`/`buildSettlement` check only turn and phase).
 * - `no-pieces-remaining`: the reducer tracks no piece supply at all.
 *
 * Both are reported here so the UI matches the printed rules, and both are conservative:
 * this function never permits something the reducer would reject, which is the direction
 * that matters. Adding either check to the reducer would change its behaviour, which
 * issue #54 explicitly rules out — they are tracked separately instead.
 */
export const canBuild = (
  state: BuildStateLike,
  playerId: number,
  kind: BuildKind
): BuildAvailability => {
  const cost = BUILD_COSTS[kind] as Partial<Record<ResourceType, number>>;
  const resources = state.players[playerId]?.resources ?? null;
  const missing = resources ? missingResourcesFor(resources, kind) : {};
  const remaining = isPlaceable(kind) ? piecesRemaining(state, playerId)[kind] : null;

  const verdict = (blocker: BuildBlocker | null): BuildAvailability => ({
    kind,
    allowed: blocker === null,
    blocker,
    cost,
    missing,
    piecesRemaining: remaining,
  });

  if (state.currentPlayerIndex !== playerId) return verdict({ reason: 'not-your-turn' });

  const inSetup = state.phase !== 'main';

  if (inSetup) {
    // Only the piece the snake draft is waiting for, and cities and cards do not exist yet.
    if (!isPlaceable(kind) || kind === 'city') return verdict({ reason: 'wrong-phase' });
    if (state.setupActionRequired !== kind) {
      const action = state.setupActionRequired === 'road' ? 'road' : 'settlement';
      return verdict({ reason: 'setup-requires', action });
    }
  } else if (state.diceRoll === null) {
    return verdict({ reason: 'dice-not-rolled' });
  }

  if (remaining !== null && remaining <= 0) return verdict({ reason: 'no-pieces-remaining' });
  if (kind === 'devCard' && state.devCardsLeft <= 0) return verdict({ reason: 'dev-deck-empty' });

  // Setup placements are free; everything else is paid for.
  if (!inSetup && Object.keys(missing).length > 0) {
    return verdict({ reason: 'insufficient-resources', missing });
  }

  if (isPlaceable(kind)) {
    const targets = legalTargets(state, playerId, kind);
    const count = kind === 'road' ? targets.edges.length : targets.nodes.length;
    if (count === 0) return verdict({ reason: 'no-legal-placement' });
  }

  return verdict(null);
};

/** Every item's availability at once, for the build panel. */
export const buildAvailability = (
  state: BuildStateLike,
  playerId: number
): Record<BuildKind, BuildAvailability> =>
  Object.fromEntries(BUILD_KINDS.map(kind => [kind, canBuild(state, playerId, kind)])) as Record<
    BuildKind,
    BuildAvailability
  >;
