import { ResourceType } from "@/types/catan";
import { CommandHandler } from "./types";

export const acceptTrade: CommandHandler<'ACCEPT_TRADE'> = (state, action) => {
  const { acceptorId } = action.payload;
  const tradeOffer = state.currentTradeOffer;

  if (!tradeOffer) return { ...state, gameLog: ["No trade to accept!", ...state.gameLog] };

  const initiator = state.players[tradeOffer.initiatorId];
  const acceptor = state.players[acceptorId];

  // Validate acceptor has the requested resources
  for (const [res, amount] of Object.entries(tradeOffer.request)) {
    if (acceptor.resources[res as ResourceType] < amount) {
      return { ...state, gameLog: [`Player ${acceptorId + 1} doesn't have enough ${res} to accept!`, ...state.gameLog] };
    }
  }

  const updatedPlayers = [...state.players];

  const newInitiatorResources = { ...initiator.resources };
  const newAcceptorResources = { ...acceptor.resources };

  for (const [res, amount] of Object.entries(tradeOffer.offer)) {
    newInitiatorResources[res as ResourceType] -= amount;
    newAcceptorResources[res as ResourceType] += amount;
  }

  for (const [res, amount] of Object.entries(tradeOffer.request)) {
    newInitiatorResources[res as ResourceType] += amount;
    newAcceptorResources[res as ResourceType] -= amount;
  }

  // Update resources for both players in the trade
  updatedPlayers[tradeOffer.initiatorId] = { ...initiator, resources: newInitiatorResources };
  updatedPlayers[acceptorId] = { ...acceptor, resources: newAcceptorResources };

  return {
    ...state,
    players: updatedPlayers,
    currentTradeOffer: null,
    gameLog: [`Player ${acceptorId + 1} accepted the trade with Player ${tradeOffer.initiatorId + 1}.`, ...state.gameLog]
  };
};
