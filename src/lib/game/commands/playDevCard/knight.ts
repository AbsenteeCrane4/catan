import { DevCardHandler } from "./types";
import { evaluateLargestArmy } from "@/lib/game/helpers/largestArmy";

export const applyKnight: DevCardHandler<'knight'> = (draftState, _originalState, playerId) => {
  // Trigger the robber movement phase
  draftState.pendingRobberAction = { status: 'moving' };
  const nextState = evaluateLargestArmy(draftState);
  nextState.gameLog = [`Player ${playerId + 1} played a Knight. Must move the Robber!`, ...nextState.gameLog];
  return nextState;
};
