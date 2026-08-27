import { GameState, Player } from "@/types/catan";

/**
 * Display name for a player, falling back to the historical "Player N" form.
 *
 * The fallback is deliberate: it covers players constructed without a name (older
 * fixtures) and out-of-range ids, so no log line can ever render "undefined".
 */
export const playerName = (
  player: Pick<Player, 'id' | 'name'> | undefined,
  fallbackId?: number
): string =>
  player?.name?.trim() || `Player ${(player?.id ?? fallbackId ?? 0) + 1}`;

/**
 * Name lookup by id. Takes only the `players` slice so the same helper serves both
 * reducer handlers (which hold a GameState) and React components (which hold players[]).
 */
export const nameOf = (state: Pick<GameState, 'players'>, playerId: number): string =>
  playerName(state.players[playerId], playerId);
