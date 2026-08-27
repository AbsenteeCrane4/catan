import { BoardKind, GameState, PlayerColor } from "@/types/catan";
import {
  Ack,
  LobbyErrorCode,
  LobbySeat,
  LobbySnapshot,
  MAX_NAME_LENGTH,
  MAX_PLAYERS,
  MIN_PLAYERS,
  RoomStatus,
  boardKindForPlayerCount,
} from "@/types/lobby";
import { PLAYER_COLORS } from "@/lib/constants";
import { createInitialState } from "@/lib/game/state/createInitialState";
import { isValidGameId } from "@/lib/game-id";
import { normaliseGameId } from "./roomKey";

/**
 * Server-internal seat. Extends the broadcast shape with the clientId, which must
 * NEVER leave the server — a client holding another player's clientId could take
 * over their seat.
 */
export interface SeatRecord extends LobbySeat {
  clientId: string;
}

export interface Room {
  gameId: string;
  status: RoomStatus;
  /** Sorted by seatIndex. Dense while in lobby; indices freeze once playing. */
  seats: SeatRecord[];
  hostClientId: string | null;
  boardKind: BoardKind;
  game: GameState | null;
  socketIds: Set<string>;
  lastActivityAt: number;
}

const fail = (error: LobbyErrorCode, message: string): Ack<never> => ({ ok: false, error, message });

/** Upper bound on sockets per room (players + spectators + stale tabs). */
export const MAX_SOCKETS_PER_ROOM = 20;

export class RoomStore {
  private rooms = new Map<string, Room>();

  get(gameId: string): Room | undefined {
    return this.rooms.get(normaliseGameId(gameId));
  }

  /** Rooms are created lazily on first entry, in 'lobby' status with no game state. */
  ensure(gameId: string): Room {
    const id = normaliseGameId(gameId);
    let room = this.rooms.get(id);
    if (!room) {
      room = {
        gameId: id,
        status: 'lobby',
        seats: [],
        hostClientId: null,
        boardKind: 'base',
        game: null,
        socketIds: new Set(),
        lastActivityAt: Date.now(),
      };
      this.rooms.set(id, room);
    }
    return room;
  }

  destroy(gameId: string): void {
    this.rooms.delete(normaliseGameId(gameId));
  }

  /** Rooms with no sockets and no activity for `maxIdleMs` are reclaimed. */
  sweep(maxIdleMs = 2 * 60 * 60 * 1000, now = Date.now()): string[] {
    const removed: string[] = [];
    for (const [id, room] of this.rooms) {
      if (room.socketIds.size === 0 && now - room.lastActivityAt > maxIdleMs) {
        this.rooms.delete(id);
        removed.push(id);
      }
    }
    return removed;
  }

  seatFor(room: Room, clientId: string): SeatRecord | undefined {
    return room.seats.find(s => s.clientId === clientId);
  }

  toSnapshot(room: Room): LobbySnapshot {
    return {
      gameId: room.gameId,
      status: room.status,
      // Strip clientId — this object is broadcast to every client in the room.
      seats: room.seats.map(({ clientId: _clientId, ...seat }) => seat),
      boardKind: room.boardKind,
      maxSeats: MAX_PLAYERS,
      canStart: room.status === 'lobby' && room.seats.length >= MIN_PLAYERS,
    };
  }

  /** Claim a seat, or update it if this client already holds one (the reconnect path). */
  sit(
    gameId: string,
    clientId: string,
    name: string,
    color: PlayerColor
  ): Ack<{ seatIndex: number }> {
    if (!isValidGameId(gameId)) return fail('INVALID_GAME_ID', 'That game code is not valid.');

    const trimmed = name.trim().slice(0, MAX_NAME_LENGTH);
    if (!trimmed) return fail('INVALID_NAME', 'Please enter a name.');
    if (!PLAYER_COLORS.includes(color)) return fail('INVALID_COLOR', 'Please choose a colour.');

    const room = this.ensure(gameId);
    room.lastActivityAt = Date.now();

    // Already seated: treat as an update so reconnects and re-submits are idempotent.
    const existing = this.seatFor(room, clientId);
    if (existing) {
      const updated = this.updateSeat(gameId, clientId, { name: trimmed, color });
      return updated.ok ? { ok: true, seatIndex: existing.seatIndex } : updated;
    }

    if (room.status === 'playing') {
      return fail('GAME_IN_PROGRESS', 'That game has already started.');
    }
    if (room.seats.length >= MAX_PLAYERS) {
      return fail('ROOM_FULL', `This game is full (${MAX_PLAYERS} players max).`);
    }
    if (this.isNameTaken(room, trimmed, clientId)) {
      return fail('NAME_TAKEN', `The name "${trimmed}" is already taken.`);
    }
    if (this.isColorTaken(room, color, clientId)) {
      return fail('COLOR_TAKEN', 'That colour is already taken.');
    }

    const seat: SeatRecord = {
      clientId,
      seatIndex: room.seats.length,
      name: trimmed,
      color,
      isHost: room.hostClientId === null,
      connected: true,
    };
    if (room.hostClientId === null) room.hostClientId = clientId;

    room.seats.push(seat);
    this.recompute(room);
    return { ok: true, seatIndex: seat.seatIndex };
  }

  updateSeat(
    gameId: string,
    clientId: string,
    patch: { name?: string; color?: PlayerColor }
  ): Ack {
    const room = this.get(gameId);
    if (!room) return fail('ROOM_NOT_FOUND', 'That game no longer exists.');

    const seat = this.seatFor(room, clientId);
    if (!seat) return fail('NOT_SEATED', 'You do not have a seat in this game.');

    if (patch.name !== undefined) {
      const trimmed = patch.name.trim().slice(0, MAX_NAME_LENGTH);
      if (!trimmed) return fail('INVALID_NAME', 'Please enter a name.');
      if (this.isNameTaken(room, trimmed, clientId)) {
        return fail('NAME_TAKEN', `The name "${trimmed}" is already taken.`);
      }
      seat.name = trimmed;
    }

    if (patch.color !== undefined) {
      if (!PLAYER_COLORS.includes(patch.color)) return fail('INVALID_COLOR', 'Please choose a colour.');
      if (this.isColorTaken(room, patch.color, clientId)) {
        return fail('COLOR_TAKEN', 'That colour is already taken.');
      }
      seat.color = patch.color;
    }

    seat.connected = true;
    room.lastActivityAt = Date.now();
    this.recompute(room);
    return { ok: true };
  }

  /** Give up a seat entirely. In a started game the seat is kept but marked disconnected. */
  stand(gameId: string, clientId: string): Ack {
    const room = this.get(gameId);
    if (!room) return fail('ROOM_NOT_FOUND', 'That game no longer exists.');

    const seat = this.seatFor(room, clientId);
    if (!seat) return { ok: true };

    if (room.status === 'playing') {
      seat.connected = false;
    } else {
      room.seats = room.seats.filter(s => s.clientId !== clientId);
      if (room.hostClientId === clientId) room.hostClientId = null;
    }

    room.lastActivityAt = Date.now();
    this.recompute(room);
    return { ok: true };
  }

  /** A socket dropped. Same as standing while in lobby; keeps the seat mid-game. */
  detach(gameId: string, clientId: string, socketId: string): void {
    const room = this.get(gameId);
    if (!room) return;
    room.socketIds.delete(socketId);
    this.stand(gameId, clientId);
  }

  start(gameId: string, clientId: string): Ack<{ game: GameState }> {
    const room = this.get(gameId);
    if (!room) return fail('ROOM_NOT_FOUND', 'That game no longer exists.');
    if (room.status !== 'lobby') return fail('ALREADY_STARTED', 'That game has already started.');
    if (room.hostClientId !== clientId) return fail('NOT_HOST', 'Only the host can start the game.');
    if (room.seats.length < MIN_PLAYERS) {
      return fail('NOT_ENOUGH_PLAYERS', `You need at least ${MIN_PLAYERS} players to start.`);
    }

    // Compact BEFORE building the game: seatIndex becomes Player.id becomes the
    // players[] array index, and the reducer indexes players[playerId] throughout.
    this.compact(room);
    room.boardKind = boardKindForPlayerCount(room.seats.length);

    // Board generation asserts its own post-conditions (pool sizes, harbour placement).
    // Let those surface as a lobby error rather than an unhandled throw inside a socket
    // event handler, which would take the whole server down with it.
    let game: GameState;
    try {
      game = createInitialState({
        players: room.seats.map(s => ({ name: s.name, color: s.color })),
        boardKind: room.boardKind,
      });
    } catch (error) {
      console.error(`Failed to generate a ${room.boardKind} board for ${gameId}:`, error);
      return fail('BOARD_GENERATION_FAILED', 'Could not create a board for that many players.');
    }

    room.game = game;
    room.status = 'playing';
    room.lastActivityAt = Date.now();

    return { ok: true, game: room.game };
  }

  private isNameTaken(room: Room, name: string, exceptClientId: string): boolean {
    const target = name.toLowerCase();
    return room.seats.some(s => s.clientId !== exceptClientId && s.name.toLowerCase() === target);
  }

  private isColorTaken(room: Room, color: PlayerColor, exceptClientId: string): boolean {
    return room.seats.some(s => s.clientId !== exceptClientId && s.color === color);
  }

  /** Seat indices are only safe to renumber before the game exists. */
  private compact(room: Room): void {
    room.seats.forEach((seat, i) => { seat.seatIndex = i; });
  }

  private recompute(room: Room): void {
    if (room.status === 'lobby') this.compact(room);

    // Promote a new host if the old one is gone; prefer a connected seat.
    if (!room.seats.some(s => s.clientId === room.hostClientId)) {
      const next = room.seats.find(s => s.connected) ?? room.seats[0];
      room.hostClientId = next?.clientId ?? null;
    }
    room.seats.forEach(s => { s.isHost = s.clientId === room.hostClientId; });
  }
}
