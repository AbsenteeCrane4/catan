import { CommandHandler } from "./types";
import { requireMainPhase, requireCurrentPlayer } from "@/lib/game/helpers/guards";

export const upgradeSettlement: CommandHandler<'UPGRADE_SETTLEMENT'> = (state, action) => {
  const { nodeId, playerId } = action.payload;

  const phaseRejection = requireMainPhase(state, "Cities can only be built during the main phase.");
  if (phaseRejection) return phaseRejection;
  const turnRejection = requireCurrentPlayer(state, playerId); // Ignore out-of-turn clicks
  if (turnRejection) return turnRejection;

  const settlement = state.settlements[nodeId];
  if (!settlement) return { ...state, gameLog: ["No settlement here to upgrade.", ...state.gameLog] };
  if (settlement.playerId !== playerId) return { ...state, gameLog: ["You can only upgrade your own settlements.", ...state.gameLog] };
  if (settlement.isCity) return { ...state, gameLog: ["This is already a city.", ...state.gameLog] };

  const player = state.players[playerId];

  // Rule: Costs 3 Ore and 2 Wheat
  if (player.resources.ore < 3 || player.resources.wheat < 2) {
    return { ...state, gameLog: ["Not enough resources for a city (Requires 3 Ore, 2 Wheat).", ...state.gameLog] };
  }

  // Deduct resources
  const newPlayers = [...state.players];
  newPlayers[playerId] = {
    ...player,
    resources: {
      ...player.resources,
      ore: player.resources.ore - 3,
      wheat: player.resources.wheat - 2
    },
    // A city is worth 2 VPs total (+1 from the existing settlement)
    victoryPoints: player.victoryPoints + 1
  };

  return {
    ...state,
    players: newPlayers,
    settlements: {
      ...state.settlements,
      [nodeId]: { ...settlement, isCity: true }
    },
    gameLog: [`Player ${playerId + 1} upgraded a settlement to a City!`, ...state.gameLog]
  };
};
