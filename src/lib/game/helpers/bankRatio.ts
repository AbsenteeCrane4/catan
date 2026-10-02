import type { GameState, ResourceType } from "@/types/catan";

/**
 * How many of `resource` a player must hand the bank for one card of their choice.
 *
 * 4 by default, 3 with any generic harbour, 2 with that resource's own harbour. A harbour
 * counts once the player has a settlement or city on either of its two nodes.
 *
 * Shared by `tradeWithBank` and the trade panel, so the panel can never offer a rate the
 * reducer would charge differently.
 */
export const bankRatio = (
  state: Pick<GameState, 'harbours' | 'settlements'>,
  playerId: number,
  resource: ResourceType
): 2 | 3 | 4 => {
  const owned = new Set(
    Object.values(state.settlements)
      .filter(s => s.playerId === playerId)
      .map(s => s.nodeId)
  );

  let ratio: 2 | 3 | 4 = 4;
  for (const harbour of state.harbours) {
    if (!harbour.nodeIds.some(id => owned.has(id))) continue;
    if (harbour.type === resource) return 2;
    if (harbour.type === '3:1') ratio = 3;
  }
  return ratio;
};
