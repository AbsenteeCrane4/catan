import { CommandHandler } from "./types";
import { requireMainPhase } from "@/lib/game/helpers/guards";
import { takeQueuedDiceTotal } from "@/lib/game/helpers/testDice";

export const rollDice: CommandHandler<'ROLL_DICE'> = (state) => {
  if (state.currentTradeOffer !== null) return state; // Prevent dice rolls during active trades

  const phaseRejection = requireMainPhase(state, "Finish the setup phase before rolling!");
  if (phaseRejection) return phaseRejection;

  const forced = takeQueuedDiceTotal();
  const die1 = Math.floor(Math.random() * 6) + 1;
  const die2 = Math.floor(Math.random() * 6) + 1;
  const total = forced ?? die1 + die2;

  if (total === 7) {
    return {
      ...state,
      diceRoll: 7,
      pendingRobberAction: { status: 'moving' },
      gameLog: ["7 rolled! Move the robber.", ...state.gameLog]
    };
  }

  const producingHexes = state.hexes.filter(h => h.numberToken === total);
  const newPlayers = state.players.map(p => ({ ...p, resources: { ...p.resources } }));

  producingHexes.forEach(hex => {
    if (hex.resource === 'desert') return;
    const resKey = hex.resource;

    if (hex.numberToken === total && hex.id !== state.robberHexId) {
      Object.values(state.settlements).forEach(settlement => {
        const node = state.nodes.find(n => n.id === settlement.nodeId);
        if (node && node.hexIds?.includes(hex.id)) {
          const amount = settlement.isCity ? 2 : 1;
          newPlayers[settlement.playerId].resources[resKey] += amount;
        }
      });
    }
  });

  return { ...state, diceRoll: total, players: newPlayers, gameLog: [`Rolled a ${total}.`, ...state.gameLog] };
};
