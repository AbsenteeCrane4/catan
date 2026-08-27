import { GameAction, GameState } from "@/types/catan";

/**
 * Rewrites the "who is doing this" field of an action to the actor the SERVER
 * determined from the socket's seat, discarding whatever the client claimed.
 *
 * Without this, `acceptorId` (and every other playerId) is attacker-controlled:
 * ACCEPT_TRADE was exempt from the turn guard, so any connected socket could accept
 * a trade as another player and move their resources.
 *
 * Declared as a mapped type over GameAction['type'] so adding a new action fails to
 * compile until its actor field is handled here.
 */
type ActorRewriters = {
  [K in GameAction['type']]: (
    action: Extract<GameAction, { type: K }>,
    actor: number
  ) => GameAction;
};

/** Every action whose payload identifies the acting player as `playerId`. */
type PlayerIdAction = Extract<GameAction, { payload: { playerId: number } }>;

const rewritePlayerId = (action: PlayerIdAction, actor: number): GameAction =>
  ({ ...action, payload: { ...action.payload, playerId: actor } }) as GameAction;

export const actorRewriters: ActorRewriters = {
  BUILD_SETTLEMENT: rewritePlayerId,
  UPGRADE_SETTLEMENT: rewritePlayerId,
  BUILD_ROAD: rewritePlayerId,
  MOVE_ROBBER: rewritePlayerId,
  TRADE_WITH_BANK: rewritePlayerId,
  BUY_DEV_CARD: rewritePlayerId,
  PLAY_DEV_CARD: rewritePlayerId,
  STEAL_RESOURCE: (action, actor) => ({ ...action, payload: { ...action.payload, thiefId: actor } }),
  PROPOSE_TRADE: (action, actor) => ({
    ...action,
    payload: { offer: { ...action.payload.offer, initiatorId: actor } },
  }),
  ACCEPT_TRADE: (action, actor) => ({ ...action, payload: { acceptorId: actor } }),
  ROLL_DICE: action => action,
  END_TURN: action => action,
  CANCEL_TRADE: action => action,
  // Never reached — isActionAllowedFor rejects SYNC_STATE outright.
  SYNC_STATE: action => action,
};

export function withActor(action: GameAction, actor: number): GameAction {
  const rewrite = actorRewriters[action.type] as (a: GameAction, actor: number) => GameAction;
  return rewrite(action, actor);
}

/**
 * Server-side authorisation for an incoming action.
 *
 * SYNC_STATE is rejected because it is a command in the registry that returns
 * `action.payload` verbatim — a client emitting it could overwrite the entire game
 * state (arbitrary resources, instant win). It exists only for server->client broadcast.
 */
export function isActionAllowedFor(state: GameState, action: GameAction, actor: number): boolean {
  if (action.type === 'SYNC_STATE') return false;
  // A trade is accepted by someone OTHER than the player whose turn it is.
  if (action.type === 'ACCEPT_TRADE') return state.currentPlayerIndex !== actor;
  return state.currentPlayerIndex === actor;
}
