import { GameState, ResourceType } from "@/types/catan";

export function executeSteal(state: GameState, thiefId: number, victimId: number): GameState {
  const victim = state.players[victimId];
  const thief = state.players[thiefId];

  const availableResources: ResourceType[] = [];
  Object.entries(victim.resources).forEach(([res, count]) => {
    for (let i = 0; i < count; i++) availableResources.push(res as ResourceType);
  });

  if (availableResources.length === 0) {
    return {
      ...state,
      pendingRobberAction: null,
      gameLog: [`Player ${thiefId + 1} tried to steal, but Player ${victimId + 1} had no resources.`, ...state.gameLog]
    };
  }

  const stolenIndex = Math.floor(Math.random() * availableResources.length);
  const stolenRes = availableResources[stolenIndex];

  const newPlayers = [...state.players];
  newPlayers[victimId] = {
    ...victim,
    resources: { ...victim.resources, [stolenRes]: victim.resources[stolenRes] - 1 }
  };
  newPlayers[thiefId] = {
    ...thief,
    resources: { ...thief.resources, [stolenRes]: thief.resources[stolenRes] + 1 }
  };

  return {
    ...state,
    players: newPlayers,
    pendingRobberAction: null,
    gameLog: [`Player ${thiefId + 1} stole a resource from Player ${victimId + 1}.`, ...state.gameLog]
  };
}
