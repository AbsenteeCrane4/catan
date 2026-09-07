import { CommandHandler } from "./types";
import { requireCurrentPlayer, withLog } from "@/lib/game/helpers/guards";
import { canAfford, payCostFor, settlementBlockerAt } from "@/lib/game/helpers/buildLegality";
import { evaluateLongestRoad } from "@/lib/game/helpers/longestRoad";
import { nameOf } from "@/lib/game/helpers/playerName";

export const buildSettlement: CommandHandler<'BUILD_SETTLEMENT'> = (state, action) => {
  const { nodeId, playerId } = action.payload;

  const turnRejection = requireCurrentPlayer(state, playerId, "It's not your turn!");
  if (turnRejection) return turnRejection;
  if (state.phase !== 'main' && state.setupActionRequired !== 'settlement') {
    return withLog(state, "You must build a road right now!");
  }

  // The placement rules themselves live in buildLegality so the build panel and the
  // board highlight exactly what this handler will accept.
  const spotBlocker = settlementBlockerAt(state, playerId, nodeId);
  if (spotBlocker === 'occupied') return state;
  if (spotBlocker === 'too-close') return withLog(state, "Too close to another settlement!");
  if (spotBlocker === 'unconnected') return withLog(state, "Must connect to a road!");

  const isInitial = state.phase !== 'main';
  const player = state.players[playerId];
  if (!isInitial && !canAfford(player.resources, 'settlement')) {
    return withLog(state, "Not enough resources!");
  }

  // Clone players for updates
  const updatedPlayers = state.players.map(p => ({ ...p, resources: { ...p.resources } }));

  // Pay for settlement (if in main game)
  if (!isInitial) {
    updatedPlayers[playerId].resources = payCostFor(updatedPlayers[playerId].resources, 'settlement');
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
      harbourLog = `${nameOf(state, playerId)} gained access to a ${harbour.type} harbour!`;
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
      `${nameOf(state, playerId)} built a settlement.`,
      ...(harbourLog ? [harbourLog] : []),
      ...evaluation.logs,
      ...state.gameLog
    ]
  };
};
