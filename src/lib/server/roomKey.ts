/**
 * The single source of truth for socket.io room names.
 *
 * Previously the join path used `game-${gameId}` while the leave path used the bare
 * gameId, so leaving never actually left the room — and the cleanup check then saw a
 * missing room and deleted a game that other players were still in. Routing every
 * join/leave/emit through this helper makes that mismatch unrepresentable.
 */
export const roomKey = (gameId: string): string => `game-${normaliseGameId(gameId)}`;

/** Game ids are case-insensitive; `/game/abc` and `/game/ABC` must be the same room. */
export const normaliseGameId = (gameId: string): string => gameId.trim().toUpperCase();
