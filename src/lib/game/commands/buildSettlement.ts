import { CommandHandler } from "./types";
import { requireCurrentPlayer } from "@/lib/game/helpers/guards";
import { getAdjacentNodeIds, isNodeConnectedToPlayerRoad } from "@/lib/game/helpers/board";
import { evaluateLongestRoad } from "@/lib/game/helpers/longestRoad";

export const buildSettlement: CommandHandler<'BUILD_SETTLEMENT'> = (state, action) => {
  const { nodeId, playerId } = action.payload;

  const turnRejection = requireCurrentPlayer(state, playerId, "It's not your turn!");
  if (turnRejection) return turnRejection;
  if (state.phase !== 'main' && state.setupActionRequired !== 'settlement') {
    return { ...state, gameLog: ["You must build a road right now!", ...state.gameLog] };
  }
  if (state.settlements[nodeId]) return state;

  const neighbors = getAdjacentNodeIds(nodeId, state.nodes);
  if (neighbors.some(id => state.settlements[id])) {
    return { ...state, gameLog: ["Too close to another settlement!", ...state.gameLog] };
  }

  const isInitial = state.phase !== 'main';
  if (!isInitial && !isNodeConnectedToPlayerRoad(nodeId, state.roads, playerId)) {
    return { ...state, gameLog: ["Must connect to a road!", ...state.gameLog] };
  }

  const player = state.players[playerId];
  if (!isInitial && (player.resources.wood < 1 || player.resources.brick < 1 || player.resources.wheat < 1 || player.resources.sheep < 1)) {
    return { ...state, gameLog: ["Not enough resources!", ...state.gameLog] };
  }

  // Clone players for updates
  const updatedPlayers = state.players.map(p => ({ ...p, resources: { ...p.resources } }));

  // Pay for settlement (if in main game)
  if (!isInitial) {
    updatedPlayers[playerId].resources.wood -= 1;
    updatedPlayers[playerId].resources.brick -= 1;
    updatedPlayers[playerId].resources.wheat -= 1;
    updatedPlayers[playerId].resources.sheep -= 1;
  }

  // Give starting resources if this is Setup Phase 2
  if (state.phase === 'setup2') {
    const node = state.nodes.find(n => n.id === nodeId);
    if (node) {
      node.hexIds.forEach(hexId => {
        const hex = state.hexes.find(h => h.id === hexId);
        if (hex && hex.resource !== 'desert') {
          updatedPlayers[playerId].resources[hex.resource] += 1;
        }
      });
    }
  }

  updatedPlayers[playerId].victoryPoints += 1;

  let harbourLog = null;
  const harbour = state.harbours.find(h => h.nodeIds.includes(nodeId));
  if (harbour) {
    const playerHarbours = updatedPlayers[playerId].harbours || [];
    const alreadyOwned = playerHarbours.some(h => h.id === harbour.id);
    if (!alreadyOwned) {
      updatedPlayers[playerId].harbours = [...playerHarbours, harbour];
      harbourLog = `Player ${playerId + 1} gained access to a ${harbour.type} harbour!`;
    }
  }

  const newSettlements = { ...state.settlements, [nodeId]: { nodeId, playerId, isCity: false } };
  const draftState = {
    ...state,
    settlements: newSettlements, // Must include the new settlement so it can "break" opponent roads!
    players: updatedPlayers,
  };

  const touchingRoads = Object.values(draftState.roads).filter(r => r.nodes.includes(nodeId));

  const affectedPlayerIds = [...new Set(touchingRoads.map(r => r.playerId))];

  const evaluation = evaluateLongestRoad(draftState, affectedPlayerIds);

  return {
    ...draftState,
    players: evaluation.players,
    longestRoad: evaluation.longestRoad,
    setupActionRequired: isInitial ? 'road' : state.setupActionRequired,
    gameLog: [
      `Player ${playerId + 1} built a settlement.`,
      ...(harbourLog ? [harbourLog] : []),
      ...evaluation.logs,
      ...state.gameLog
    ]
  };
};
