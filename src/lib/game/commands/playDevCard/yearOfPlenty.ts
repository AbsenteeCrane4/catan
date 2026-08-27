import { DevCardHandler } from "./types";
import { withLog } from "@/lib/game/helpers/guards";
import { nameOf } from "@/lib/game/helpers/playerName";

export const applyYearOfPlenty: DevCardHandler<'yearOfPlenty'> = (draftState, originalState, playerId, args) => {
  // Fail safely if the UI didn't send args — the card stays in hand, but say so rather than no-op silently
  if (!args?.resource1 || !args?.resource2) {
    return withLog(originalState, "Year of Plenty needs two resources selected.");
  }

  const player = draftState.players[playerId];
  const resources = { ...player.resources }; // fresh object — never mutate a resources object shared with prior state
  resources[args.resource1] += 1;
  resources[args.resource2] += 1; // sequential assignment — preserves +2 when resource1 === resource2

  const updatedPlayers = [...draftState.players];
  updatedPlayers[playerId] = { ...player, resources };

  return {
    ...draftState,
    players: updatedPlayers,
    gameLog: [`${nameOf(draftState, playerId)} played Year of Plenty and took ${args.resource1} and ${args.resource2}.`, ...draftState.gameLog]
  };
};
