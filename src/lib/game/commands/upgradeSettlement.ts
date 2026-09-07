import { CommandHandler } from "./types";
import { requireMainPhase, requireCurrentPlayer, withLog } from "@/lib/game/helpers/guards";
import { canAfford, cityBlockerAt, payCostFor } from "@/lib/game/helpers/buildLegality";
import { nameOf } from "@/lib/game/helpers/playerName";

export const upgradeSettlement: CommandHandler<'UPGRADE_SETTLEMENT'> = (state, action) => {
  const { nodeId, playerId } = action.payload;

  const phaseRejection = requireMainPhase(state, "Cities can only be built during the main phase.");
  if (phaseRejection) return phaseRejection;
  const turnRejection = requireCurrentPlayer(state, playerId); // Ignore out-of-turn clicks
  if (turnRejection) return turnRejection;

  // cityBlockerAt is what the board uses to decide which settlements to highlight, so
  // every highlighted node is one this handler will upgrade.
  const spotBlocker = cityBlockerAt(state, playerId, nodeId);
  if (spotBlocker === 'no-settlement') return withLog(state, "No settlement here to upgrade.");
  if (spotBlocker === 'not-yours') return withLog(state, "You can only upgrade your own settlements.");
  if (spotBlocker === 'already-city') return withLog(state, "This is already a city.");

  const settlement = state.settlements[nodeId];
  const player = state.players[playerId];

  // Rule: Costs 3 Ore and 2 Wheat
  if (!canAfford(player.resources, 'city')) {
    return withLog(state, "Not enough resources for a city (Requires 3 Ore, 2 Wheat).");
  }

  // Deduct resources
  const newPlayers = [...state.players];
  newPlayers[playerId] = {
    ...player,
    resources: payCostFor(player.resources, 'city'),
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
    gameLog: [`${nameOf(state, playerId)} upgraded a settlement to a City!`, ...state.gameLog]
  };
};
