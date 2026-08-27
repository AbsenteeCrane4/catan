import { BoardKind, PlayerColor } from "./catan";

/**
 * Wire types shared between the browser and the socket server.
 * Deliberately free of socket.io / React / Next imports so both the client bundle
 * and the tsup-bundled server can import this module.
 */

export type RoomStatus = 'lobby' | 'playing';

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 6;

/** Player count at which the game switches to the official 5-6 player extension board. */
export const EXPANSION_MIN_PLAYERS = 5;

/**
 * A claimed seat, as broadcast to every client in the room.
 * NOTE: this deliberately omits clientId — that is a server-only secret. Broadcasting it
 * would let any viewer impersonate another player's seat.
 */
export interface LobbySeat {
  /** 0..MAX_PLAYERS-1. Becomes Player.id verbatim when the game starts. */
  seatIndex: number;
  name: string;
  color: PlayerColor;
  isHost: boolean;
  /** false = the seat is held but its socket is gone (mid-game disconnect / refresh in flight). */
  connected: boolean;
}

export interface LobbySnapshot {
  gameId: string;
  status: RoomStatus;
  /** Sorted by seatIndex; dense (compacted) while status === 'lobby'. */
  seats: LobbySeat[];
  boardKind: BoardKind;
  maxSeats: number;
  /** Server-computed so the Start button always agrees with the server's own rule. */
  canStart: boolean;
}

/**
 * A LobbySnapshot addressed to one client, carrying that client's own seat index.
 * Seat indices compact when someone leaves the lobby, so a client cannot cache its
 * own index -- and the shared snapshot deliberately carries no clientId to match on.
 */
export interface LobbyStateMessage extends LobbySnapshot {
  yourSeatIndex: number | null;
}

export type LobbyErrorCode =
  | 'INVALID_GAME_ID'
  | 'ROOM_NOT_FOUND'
  | 'ROOM_FULL'
  | 'GAME_IN_PROGRESS'
  | 'NAME_TAKEN'
  | 'COLOR_TAKEN'
  | 'INVALID_NAME'
  | 'INVALID_COLOR'
  | 'NOT_HOST'
  | 'NOT_ENOUGH_PLAYERS'
  | 'ALREADY_STARTED'
  | 'NOT_SEATED'
  | 'NOT_YOUR_TURN';

export type Ack<T = object> =
  | ({ ok: true } & T)
  | { ok: false; error: LobbyErrorCode; message: string };

export const MAX_NAME_LENGTH = 20;

/** Board kind is derived from the seat count, never chosen directly. */
export const boardKindForPlayerCount = (count: number): BoardKind =>
  count >= EXPANSION_MIN_PLAYERS ? 'expansion' : 'base';
