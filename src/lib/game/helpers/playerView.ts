import type { PlayerView, RevealedPlayerView } from "@/types/catan";

/**
 * Whether this view carries a real hand.
 *
 * `redactStateFor` sends `resources` / `devCards` as `null` for every seat but the
 * viewer's, so a component that wants to render cards has to prove it was given them.
 * Narrowing through this guard is the point of the nullable fields: a non-null assertion
 * would compile just as well and would render an opponent's hand the moment the
 * redaction rules change.
 */
export const isRevealed = (player: PlayerView): player is RevealedPlayerView =>
  player.resources !== null && player.devCards !== null;

/**
 * The viewing seat's own hand, or `null` for a spectator.
 *
 * Takes the seat from the payload rather than from the caller — `viewerSeatIndex` is
 * built by the same function that decided what to reveal, so the two cannot disagree.
 */
export const ownHand = (
  state: { players: PlayerView[]; viewerSeatIndex: number | null }
): RevealedPlayerView | null => {
  if (state.viewerSeatIndex === null) return null;
  const me = state.players[state.viewerSeatIndex];
  return me && isRevealed(me) ? me : null;
};
