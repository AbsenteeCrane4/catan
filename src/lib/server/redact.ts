import type { GameState, GameStateView, Player, PlayerView } from '@/types/catan';

/**
 * Per-seat redaction. The server holds the whole `GameState`; every client gets one of
 * these instead.
 *
 * Hiding a hand in the UI is not hiding it — before this existed, `broadcastGame` sent
 * `room.game` verbatim to the socket room, so any player could read every opponent's
 * hand and the whole dev-card deck straight off the wire. Redaction has to happen here,
 * on the way out, or it has not happened at all.
 */

const countResources = (player: Player): number =>
  Object.values(player.resources).reduce((total, n) => total + n, 0);

const countDevCards = (player: Player): number =>
  player.devCards.playable.length + player.devCards.boughtThisTurn.length;

/** VP cards held in hand. These are the points that must not be visible to opponents. */
const hiddenVictoryPoints = (player: Player): number =>
  [...player.devCards.playable, ...player.devCards.boughtThisTurn].filter(
    card => card === 'victoryPoint'
  ).length;

function viewOfPlayer(player: Player, reveal: boolean): PlayerView {
  const { resources, devCards, ...publicFields } = player;

  return {
    ...publicFields,
    resources: reveal ? { ...resources } : null,
    devCards: reveal
      ? {
          playable: [...devCards.playable],
          boughtThisTurn: [...devCards.boughtThisTurn],
          played: [...devCards.played],
        }
      : null,
    resourceCount: countResources(player),
    devCardCount: countDevCards(player),
    playedDevCards: [...devCards.played],
    victoryPoints: reveal ? player.victoryPoints : player.victoryPoints - hiddenVictoryPoints(player),
  };
}

/**
 * Build the view one seat is allowed to see.
 *
 * @param seatIndex the receiving seat, or `null` for a spectator (counts only, for
 *   everyone). Seat indices are `players[i].id === i` — an index outside the player list
 *   is treated as a spectator rather than trusted.
 *
 * Once the game is over every hand is revealed, as at a real table: the result is
 * already decided, and the winner's VP total has to add up.
 */
export function redactStateFor(state: GameState, seatIndex: number | null): GameStateView {
  const { players, devCardDeck, ...rest } = state;

  const isSeated = seatIndex !== null && seatIndex >= 0 && seatIndex < players.length;
  const viewerSeatIndex = isSeated ? seatIndex : null;

  return {
    ...rest,
    players: players.map(player => viewOfPlayer(player, state.isGameOver || player.id === viewerSeatIndex)),
    devCardDeckCount: devCardDeck.length,
    viewerSeatIndex,
  };
}
