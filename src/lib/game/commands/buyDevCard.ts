import { CommandHandler } from "./types";
import { requireMainPhase, requireCurrentPlayer, withLog } from "@/lib/game/helpers/guards";
import { canAfford, payCostFor } from "@/lib/game/helpers/buildLegality";
import { nameOf } from "@/lib/game/helpers/playerName";

export const buyDevCard: CommandHandler<'BUY_DEV_CARD'> = (state, action) => {
  const { playerId } = action.payload;

  const phaseRejection = requireMainPhase(state);
  if (phaseRejection) return phaseRejection;
  const turnRejection = requireCurrentPlayer(state, playerId, "It's not your turn!");
  if (turnRejection) return turnRejection;
  if (!state.devCardDeck || state.devCardDeck.length === 0) {
    return withLog(state, "The Development Card deck is empty!");
  }

  const player = state.players[playerId];

  // Cost: 1 Sheep, 1 Wheat, 1 Ore
  if (!canAfford(player.resources, 'devCard')) {
    return withLog(state, "Not enough resources to buy a Development Card.");
  }

  const newDeck = [...state.devCardDeck];
  const drawnCard = newDeck.pop()!;

  const updatedPlayers = [...state.players];
  updatedPlayers[playerId] = {
    ...player,
    resources: payCostFor(player.resources, 'devCard'),
    devCards: {
      ...player.devCards,
      boughtThisTurn: [...player.devCards.boughtThisTurn, drawnCard]
    },
    // VP cards immediately add to the score
    victoryPoints: drawnCard === 'victoryPoint' ? player.victoryPoints + 1 : player.victoryPoints
  };

  return {
    ...state,
    devCardDeck: newDeck,
    players: updatedPlayers,
    gameLog: [`${nameOf(state, playerId)} bought a Development Card.`, ...state.gameLog]
  };
};
