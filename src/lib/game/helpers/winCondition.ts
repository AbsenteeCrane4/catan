import { GameState } from "@/types/catan";

export function evaluateWinCondition(state: GameState): GameState {
  if (state.isGameOver) return state;
  const winner = state.players.find(p => p.victoryPoints >= 10);

  if (winner) {
    return {
      ...state,
      isGameOver: true,
      winnerId: winner.id,
      gameLog: [
        `🏆 Game Over! Player ${winner.id + 1} wins with ${winner.victoryPoints} Victory Points!`,
        ...state.gameLog
      ]
    };
  }

  return state;
}
