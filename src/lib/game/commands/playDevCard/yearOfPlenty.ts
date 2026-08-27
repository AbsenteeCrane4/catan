import { DevCardHandler } from "./types";

export const applyYearOfPlenty: DevCardHandler<'yearOfPlenty'> = (draftState, originalState, playerId, args) => {
  if (!args?.resource1 || !args?.resource2) return originalState; // Fail safely if UI didn't send args

  const player = draftState.players[playerId];
  const resources = { ...player.resources }; // fresh object — never mutate a resources object shared with prior state
  resources[args.resource1] += 1;
  resources[args.resource2] += 1; // sequential assignment — preserves +2 when resource1 === resource2

  const updatedPlayers = [...draftState.players];
  updatedPlayers[playerId] = { ...player, resources };

  return {
    ...draftState,
    players: updatedPlayers,
    gameLog: [`Player ${playerId + 1} played Year of Plenty and took ${args.resource1} and ${args.resource2}.`, ...draftState.gameLog]
  };
};
