import { CommandHandler } from "./types";
import { requireMainPhase, requireCurrentPlayer } from "@/lib/game/helpers/guards";
import { nameOf } from "@/lib/game/helpers/playerName";
import { bankRatio } from "@/lib/game/helpers/bankRatio";

export const tradeWithBank: CommandHandler<'TRADE_WITH_BANK'> = (state, action) => {
  const { playerId, offerResource, requestResource } = action.payload;

  const phaseRejection = requireMainPhase(state);
  if (phaseRejection) return phaseRejection;
  const turnRejection = requireCurrentPlayer(state, playerId);
  if (turnRejection) return turnRejection;

  const player = state.players[playerId];
  const cost = bankRatio(state, playerId, offerResource);

  if (player.resources[offerResource] < cost) {
    return { ...state, gameLog: [`${nameOf(state, playerId)} doesn't have enough ${offerResource}!`, ...state.gameLog] };
  }

  const updatedPlayers = [...state.players];
  updatedPlayers[playerId] = {
    ...player,
    resources: {
      ...player.resources,
      [offerResource]: player.resources[offerResource] - cost,
      [requestResource]: player.resources[requestResource] + 1
    }
  };

  return {
    ...state,
    players: updatedPlayers,
    gameLog: [`${nameOf(state, playerId)} traded 1 ${offerResource} for 1 ${requestResource}.`, ...state.gameLog]
  };
};
