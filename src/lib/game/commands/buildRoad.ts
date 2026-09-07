import { CommandHandler } from "./types";
import { requireCurrentPlayer, withLog } from "@/lib/game/helpers/guards";
import { isValidRoadPlacement } from "@/lib/game/helpers/board";
import { canAfford, edgeId, payCostFor } from "@/lib/game/helpers/buildLegality";
import { evaluateLongestRoad } from "@/lib/game/helpers/longestRoad";
import { nameOf } from "@/lib/game/helpers/playerName";

export const buildRoad: CommandHandler<'BUILD_ROAD'> = (state, action) => {
  const { nodeId1, nodeId2, playerId } = action.payload;

  const turnRejection = requireCurrentPlayer(state, playerId, "It's not your turn!");
  if (turnRejection) return turnRejection;
  if (state.phase !== 'main' && state.setupActionRequired !== 'road') {
    return withLog(state, "You must build a settlement first!");
  }

  const roadId = edgeId(nodeId1, nodeId2);
  if (state.roads[roadId]) return state;

  // The same predicate the build panel and the board's edge highlighting call, so a
  // highlighted edge is by construction an edge this handler accepts.
  if (!isValidRoadPlacement(nodeId1, nodeId2, playerId, state)) {
    return withLog(state, "Road must connect!");
  }

  const isInitial = state.phase !== 'main';
  const player = state.players[playerId];

  if (!isInitial && !canAfford(player.resources, 'road')) {
    return withLog(state, "Not enough resources!");
  }

  // Handle Snake Draft Turn Advance
  let nextPhase = state.phase;
  let nextPlayer = state.currentPlayerIndex;
  let nextAction = state.setupActionRequired;

  if (state.phase === 'setup1') {
    if (nextPlayer === state.players.length - 1) {
      nextPhase = 'setup2';
      nextAction = 'settlement';
    } else {
      nextPlayer++;
      nextAction = 'settlement';
    }
  } else if (state.phase === 'setup2') {
    if (nextPlayer === 0) {
      nextPhase = 'main';
      nextAction = 'none';
    } else {
      nextPlayer--;
      nextAction = 'settlement';
    }
  }

  const updatedPlayers = state.players.map(p => p.id === playerId ? {
    ...p,
    resources: isInitial ? p.resources : payCostFor(p.resources, 'road')
  } : p);

  // 3. Create draft state
  const draftState = {
    ...state,
    roads: { ...state.roads, [roadId]: { id: roadId, playerId, nodes: [nodeId1, nodeId2] as [string, string] } },
    players: updatedPlayers,
  };

  // 4. Evaluate Longest Road
  const evaluation = evaluateLongestRoad(draftState, [playerId]);

  // 5. Return final state
  return {
    ...draftState,
    phase: nextPhase,
    currentPlayerIndex: nextPlayer,
    setupActionRequired: nextAction,
    players: evaluation.players,
    longestRoad: evaluation.longestRoad,
    gameLog: [
      `${nameOf(state, playerId)} built a road.`,
      ...evaluation.logs,
      ...state.gameLog
    ]
  };
};
