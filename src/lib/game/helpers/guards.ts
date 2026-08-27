import { GameState } from "@/types/catan";

export const withLog = (state: GameState, message: string): GameState => ({
  ...state,
  gameLog: [message, ...state.gameLog],
});

/** Returns null when the check passes (proceed); otherwise the rejection state to return immediately. */
export const requireCurrentPlayer = (
  state: GameState,
  playerId: number,
  message?: string
): GameState | null => {
  if (state.currentPlayerIndex === playerId) return null;
  return message ? withLog(state, message) : state;
};

/** Returns null when the game is in the main phase (proceed); otherwise the rejection state to return immediately. */
export const requireMainPhase = (
  state: GameState,
  message?: string
): GameState | null => {
  if (state.phase === 'main') return null;
  return message ? withLog(state, message) : state;
};
