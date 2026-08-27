import { CommandHandler } from "./types";
import { requireCurrentPlayer } from "@/lib/game/helpers/guards";
import { isValidRoadPlacement } from "@/lib/game/helpers/board";
import { evaluateLongestRoad } from "@/lib/game/helpers/longestRoad";
import { nameOf } from "@/lib/game/helpers/playerName";

export const buildRoad: CommandHandler<'BUILD_ROAD'> = (state, action) => {
  const { nodeId1, nodeId2, playerId } = action.payload;

  const turnRejection = requireCurrentPlayer(state, playerId, "It's not your turn!");
  if (turnRejection) return turnRejection;
  if (state.phase !== 'main' && state.setupActionRequired !== 'road') {
    return { ...state, gameLog: ["You must build a settlement first!", ...state.gameLog] };
  }

  const roadId = [nodeId1, nodeId2].sort().join('-');
  if (state.roads[roadId]) return state;

  if (!isValidRoadPlacement(nodeId1, nodeId2, playerId, state)) return { ...state, gameLog: ["Road must connect!", ...state.gameLog] };

  const isInitial = state.phase !== 'main';
  const player = state.players[playerId];

  if (!isInitial && (player.resources.wood < 1 || player.resources.brick < 1)) {
    return { ...state, gameLog: ["Not enough resources!", ...state.gameLog] };
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
    resources: isInitial ? p.resources : { ...p.resources, wood: p.resources.wood - 1, brick: p.resources.brick - 1 }
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
