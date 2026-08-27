import { CommandHandler } from "./types";
import { requireMainPhase } from "@/lib/game/helpers/guards";
import { nameOf } from "@/lib/game/helpers/playerName";

export const endTurn: CommandHandler<'END_TURN'> = (state) => {
  const phaseRejection = requireMainPhase(state, "Cannot end turn manually during setup!");
  if (phaseRejection) return phaseRejection;

  const updatedPlayers = state.players.map((p, idx) => {
    if (idx === state.currentPlayerIndex) {
      return {
        ...p,
        devCards: {
          ...p.devCards,
          playable: [...p.devCards.playable, ...p.devCards.boughtThisTurn],
          boughtThisTurn: [],
        }
      };
    }
    return p;
  });

  const nextPlayer = (state.currentPlayerIndex + 1) % state.players.length;

  return {
    ...state,
    players: updatedPlayers,
    currentPlayerIndex: nextPlayer,
    diceRoll: null,
    hasPlayedDevCardThisTurn: false,
    gameLog: [`--- ${nameOf(state, nextPlayer)}'s Turn ---`, ...state.gameLog]
  };
};
