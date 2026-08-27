import { CommandHandler } from "./types";
import { requireMainPhase, requireCurrentPlayer } from "@/lib/game/helpers/guards";

export const buyDevCard: CommandHandler<'BUY_DEV_CARD'> = (state, action) => {
  const { playerId } = action.payload;

  const phaseRejection = requireMainPhase(state);
  if (phaseRejection) return phaseRejection;
  const turnRejection = requireCurrentPlayer(state, playerId, "It's not your turn!");
  if (turnRejection) return turnRejection;
  if (!state.devCardDeck || state.devCardDeck.length === 0) {
    return { ...state, gameLog: ["The Development Card deck is empty!", ...state.gameLog] };
  }

  const player = state.players[playerId];

  // Cost: 1 Sheep, 1 Wheat, 1 Ore
  if (player.resources.sheep < 1 || player.resources.wheat < 1 || player.resources.ore < 1) {
    return { ...state, gameLog: ["Not enough resources to buy a Development Card.", ...state.gameLog] };
  }

  const newDeck = [...state.devCardDeck];
  const drawnCard = newDeck.pop()!;

  const updatedPlayers = [...state.players];
  updatedPlayers[playerId] = {
    ...player,
    resources: {
      ...player.resources,
      sheep: player.resources.sheep - 1,
      wheat: player.resources.wheat - 1,
      ore: player.resources.ore - 1,
    },
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
    gameLog: [`Player ${playerId + 1} bought a Development Card.`, ...state.gameLog]
  };
};
