import { ResourceType } from "@/types/catan";
import { CommandHandler } from "./types";
import { requireMainPhase } from "@/lib/game/helpers/guards";

export const proposeTrade: CommandHandler<'PROPOSE_TRADE'> = (state, action) => {
  const { offer } = action.payload;
  const player = state.players[offer.initiatorId];

  const phaseRejection = requireMainPhase(state);
  if (phaseRejection) return phaseRejection;

  // Validate offer
  for (const [res, amount] of Object.entries(offer.offer)) {
    if (player.resources[res as ResourceType] < amount) {
      return { ...state, gameLog: [`Player ${offer.initiatorId + 1} doesn't have enough ${res} to offer!`, ...state.gameLog] };
    }
  }

  return { ...state, currentTradeOffer: offer, gameLog: [`Player ${offer.initiatorId + 1} proposed a trade.`, ...state.gameLog] };
};
