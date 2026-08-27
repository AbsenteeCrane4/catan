import { GameState } from "@/types/catan";
import { playerName } from "./playerName";

export function evaluateLargestArmy(state: GameState): GameState {
  let currentHolderId: number | null = null;
  let maxKnights = 0;

  // 1. Find the current holder and the highest number of knights played
  state.players.forEach(p => {
    if (p.largestArmy) currentHolderId = p.id;
    if (p.knightsPlayed > maxKnights) maxKnights = p.knightsPlayed;
  });

  // 2. A player must have at least 3 played knights to qualify
  if (maxKnights < 3) return state;

  // 3. Find who currently has the max amount
  const candidates = state.players.filter(p => p.knightsPlayed === maxKnights);
  let newHolderId: number | null = currentHolderId;

  if (currentHolderId !== null) {
    // The current holder keeps the title if there is a tie
    const holderStillHasMax = candidates.some(c => c.id === currentHolderId);
    if (!holderStillHasMax && candidates.length === 1) {
      newHolderId = candidates[0].id;
    }
  } else if (candidates.length === 1) {
    // First player to hit 3 gets the title
    newHolderId = candidates[0].id;
  }

  // 4. If the title changed hands, update VP and state
  if (newHolderId !== currentHolderId) {
    const updatedPlayers = [...state.players];
    const logs: string[] = [];

    // Deduct 2 VP from the loser
    if (currentHolderId !== null) {
      updatedPlayers[currentHolderId] = {
        ...updatedPlayers[currentHolderId],
        largestArmy: false,
        victoryPoints: updatedPlayers[currentHolderId].victoryPoints - 2
      };
      logs.push(`${playerName(updatedPlayers[currentHolderId], currentHolderId)} lost the Largest Army.`);
    }

    // Award 2 VP to the winner
    if (newHolderId !== null) {
      updatedPlayers[newHolderId] = {
        ...updatedPlayers[newHolderId],
        largestArmy: true,
        victoryPoints: updatedPlayers[newHolderId].victoryPoints + 2
      };
      logs.push(`${playerName(updatedPlayers[newHolderId], newHolderId)} claimed the Largest Army! (+2 VP)`);
    }

    return {
      ...state,
      players: updatedPlayers,
      gameLog: [...logs, ...state.gameLog]
    };
  }

  return state;
}
