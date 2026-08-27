import { CommandHandler } from "./types";
import { executeSteal } from "@/lib/game/helpers/robber";

export const moveRobber: CommandHandler<'MOVE_ROBBER'> = (state, action) => {
  const { hexId, playerId } = action.payload;

  const targetHex = state.hexes.find(h => h.id === hexId);
  if (!targetHex || state.robberHexId === hexId) return state; // Can't stay on the same hex

  // 1. Find all nodes attached to this hex
  const adjacentNodes = state.nodes.filter(n => n.hexIds?.includes(hexId));
  const adjacentNodeIds = adjacentNodes.map(n => n.id);

  // 2. Identify unique players with resources to steal from
  const victims = new Set<number>();
  Object.values(state.settlements).forEach(settlement => {
    if (adjacentNodeIds.includes(settlement.nodeId) && settlement.playerId !== playerId) {
      const p = state.players[settlement.playerId];
      const totalRes = Object.values(p.resources).reduce((sum, count) => sum + count, 0);

      if (totalRes > 0) victims.add(settlement.playerId);
    }
  });

  const validVictims = Array.from(victims);
  let newState = { ...state, robberHexId: hexId };

  // 3. Route the state based on the number of available victims
  if (validVictims.length === 0) {
    // Nobody to steal from
    newState.pendingRobberAction = null;
    newState.gameLog = [`Player ${playerId + 1} moved the robber, but nobody was there to rob.`, ...state.gameLog];
  } else if (validVictims.length === 1) {
    // Only one option: Auto-steal (DRY)
    newState = executeSteal(newState, playerId, validVictims[0]);
  } else {
    // Multiple options: Pause and ask the player
    newState.pendingRobberAction = { status: 'stealing', validVictims };
    newState.gameLog = [`Player ${playerId + 1} moved the robber. Waiting for victim selection...`, ...state.gameLog];
  }

  return newState;
};
