import { CommandHandler } from "./types";

export const cancelTrade: CommandHandler<'CANCEL_TRADE'> = (state) => {
  return { ...state, currentTradeOffer: null, gameLog: ["Trade offer cancelled.", ...state.gameLog] };
};
