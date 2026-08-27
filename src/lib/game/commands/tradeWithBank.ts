import { CommandHandler } from "./types";
import { requireMainPhase, requireCurrentPlayer } from "@/lib/game/helpers/guards";
import { nameOf } from "@/lib/game/helpers/playerName";

export const tradeWithBank: CommandHandler<'TRADE_WITH_BANK'> = (state, action) => {
  const { playerId, offerResource, requestResource } = action.payload;

  const phaseRejection = requireMainPhase(state);
  if (phaseRejection) return phaseRejection;
  const turnRejection = requireCurrentPlayer(state, playerId);
  if (turnRejection) return turnRejection;

  const player = state.players[playerId];
  let cost = 4; // Standard 4:1 trade ratio

  const playerNodes = Object.values(state.settlements)
    .filter(s => s.playerId === playerId)
    .map(s => s.nodeId);

  const ownedPorts = state.harbours.filter(h => h.nodeIds.some(id => playerNodes.includes(id)));

  ownedPorts.forEach(port => {
    if (port.type === '3:1') {
      cost = 3;
    } else if (port.type === offerResource) {
      cost = 2;
    }
  });

  if (player.resources[offerResource] < cost) {
    return { ...state, gameLog: [`${nameOf(state, playerId)} doesn't have enough ${offerResource}!`, ...state.gameLog] };
  }

  const updatedPlayers = [...state.players];
  updatedPlayers[playerId] = {
    ...player,
    resources: {
      ...player.resources,
      [offerResource]: player.resources[offerResource] - cost,
      [requestResource]: player.resources[requestResource] + 1
    }
  };

  return {
    ...state,
    players: updatedPlayers,
    gameLog: [`${nameOf(state, playerId)} traded 1 ${offerResource} for 1 ${requestResource}.`, ...state.gameLog]
  };
};
