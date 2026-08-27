import { DevCardHandler } from "./types";
import { evaluateLargestArmy } from "@/lib/game/helpers/largestArmy";
import { nameOf } from "@/lib/game/helpers/playerName";

export const applyKnight: DevCardHandler<'knight'> = (draftState, _originalState, playerId) => {
  // Trigger the robber movement phase
  draftState.pendingRobberAction = { status: 'moving' };
  const nextState = evaluateLargestArmy(draftState);
  nextState.gameLog = [`${nameOf(nextState, playerId)} played a Knight. Must move the Robber!`, ...nextState.gameLog];
  return nextState;
};
