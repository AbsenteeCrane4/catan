import { AnyCardArgs } from "@/types/catan";
import { CommandHandler } from "../types";
import { devCardRegistry } from "./registry";
import { PlayableDevCardType } from "./types";

export const playDevCard: CommandHandler<'PLAY_DEV_CARD'> = (state, action) => {
  const { playerId, cardType, cardArgs } = action.payload;

  if (state.phase !== 'main') return state;
  if (playerId !== state.currentPlayerIndex) return { ...state, gameLog: ["It's not your turn!", ...state.gameLog] };
  if (state.hasPlayedDevCardThisTurn) {
    return { ...state, gameLog: ["You can only play one Development Card per turn!", ...state.gameLog] };
  }

  const player = state.players[playerId];
  const cardIndex = player.devCards.playable.indexOf(cardType);

  if (cardIndex === -1) {
    return { ...state, gameLog: ["You don't have that card available to play right now.", ...state.gameLog] };
  }

  const updatedPlayers = [...state.players];
  const updatedDevCards = {
    ...player.devCards,
    playable: [...player.devCards.playable],
    played: [...player.devCards.played]
  };

  updatedDevCards.playable.splice(cardIndex, 1);
  updatedDevCards.played.push(cardType);

  updatedPlayers[playerId] = {
    ...player,
    devCards: updatedDevCards,
    knightsPlayed: cardType === 'knight' ? (player.knightsPlayed || 0) + 1 : player.knightsPlayed
  };

  const draftState = {
    ...state,
    players: updatedPlayers,
    hasPlayedDevCardThisTurn: true
  };

  // victoryPoint cards are auto-scored at buy time and never enter a player's playable hand, so
  // PLAY_DEV_CARD is never dispatched with cardType: 'victoryPoint' in practice — it's excluded from
  // the sub-registry rather than given a dummy handler, and simply falls through to the draft state here.
  if (cardType === 'victoryPoint') return draftState;

  const handler = devCardRegistry[cardType as PlayableDevCardType] as (
    draftState: typeof state,
    originalState: typeof state,
    playerId: number,
    args: AnyCardArgs | undefined
  ) => typeof state;

  return handler(draftState, state, playerId, cardArgs);
};
