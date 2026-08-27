import { DevCardHandler } from "./types";
import { withLog } from "@/lib/game/helpers/guards";
import { nameOf } from "@/lib/game/helpers/playerName";

export const applyMonopoly: DevCardHandler<'monopoly'> = (draftState, originalState, playerId, args) => {
  // Fail safely if the UI didn't send args — the card stays in hand, but say so rather than no-op silently
  if (!args?.monopolyResource) {
    return withLog(originalState, "Monopoly needs a resource selected.");
  }
  const resource = args.monopolyResource;

  let stolenAmount = 0;
  // Loop through all other players and take that resource
  const updatedPlayers = draftState.players.map(p => {
    if (p.id === playerId) return p; // Skip the player who played the card

    const amountPlayerHas = p.resources[resource];
    stolenAmount += amountPlayerHas;

    return {
      ...p,
      resources: { ...p.resources, [resource]: 0 }
    };
  });

  // Give all stolen resources to the card player — fresh resources object, never mutate in place
  const player = updatedPlayers[playerId];
  updatedPlayers[playerId] = {
    ...player,
    resources: { ...player.resources, [resource]: player.resources[resource] + stolenAmount }
  };

  return {
    ...draftState,
    players: updatedPlayers,
    gameLog: [`${nameOf(draftState, playerId)} played Monopoly and stole ${stolenAmount} ${resource}!`, ...draftState.gameLog]
  };
};
