import type { Server, Socket } from 'socket.io';
import { GameAction, PlayerColor } from '@/types/catan';
import { LobbyErrorCode } from '@/types/lobby';
import { catanReducer } from '@/lib/game-reducer';
import { isValidGameId } from '@/lib/game-id';
import { MAX_SOCKETS_PER_ROOM, RoomStore } from './rooms';
import { normaliseGameId, roomKey } from './roomKey';
import { isActionAllowedFor, withActor } from './actionGuards';

/** What the server remembers about a live socket. Keyed by socket.id, cleared on disconnect. */
interface SocketContext {
  gameId: string;
  clientId: string;
}

/** How long an emptied room is kept before its state is discarded. */
const LOBBY_GRACE_MS = 10_000;
const PLAYING_GRACE_MS = 60_000;
const SWEEP_INTERVAL_MS = 5 * 60_000;

type AckFn = (response: unknown) => void;

const reply = (ack: unknown, response: unknown) => {
  if (typeof ack === 'function') (ack as AckFn)(response);
};

const failure = (error: LobbyErrorCode, message: string) => ({ ok: false as const, error, message });

export function registerSocketHandlers(io: Server, store: RoomStore = new RoomStore()) {
  const socketToRoom = new Map<string, SocketContext>();
  const deleteTimers = new Map<string, ReturnType<typeof setTimeout>>();

  const cancelDeletion = (gameId: string) => {
    const timer = deleteTimers.get(gameId);
    if (timer) {
      clearTimeout(timer);
      deleteTimers.delete(gameId);
    }
  };

  /**
   * Membership is read from the room record we own, not from the socket.io adapter.
   * The adapter returns undefined for an unknown key, which is what previously caused
   * a live game to be deleted out from under connected players.
   */
  const scheduleDeletionIfEmpty = (gameId: string) => {
    const room = store.get(gameId);
    if (!room || room.socketIds.size > 0) return;

    cancelDeletion(gameId);
    const grace = room.status === 'playing' ? PLAYING_GRACE_MS : LOBBY_GRACE_MS;
    deleteTimers.set(
      gameId,
      setTimeout(() => {
        deleteTimers.delete(gameId);
        const current = store.get(gameId);
        if (current && current.socketIds.size === 0) store.destroy(gameId);
      }, grace)
    );
  };

  /**
   * Sent per-socket rather than to the room: each client needs its own seat index,
   * which shifts whenever the lobby compacts after someone leaves.
   */
  const broadcastLobby = (gameId: string) => {
    const room = store.get(gameId);
    if (!room) return;

    const snapshot = store.toSnapshot(room);
    for (const socketId of room.socketIds) {
      const ctx = socketToRoom.get(socketId);
      const seat = ctx ? store.seatFor(room, ctx.clientId) : undefined;
      io.to(socketId).emit('lobby:state', { ...snapshot, yourSeatIndex: seat?.seatIndex ?? null });
    }
  };

  const broadcastGame = (gameId: string) => {
    const room = store.get(gameId);
    if (room?.game) {
      io.to(roomKey(gameId)).emit('game-update', { type: 'SYNC_STATE', payload: room.game });
    }
  };

  const sweeper = setInterval(() => store.sweep(), SWEEP_INTERVAL_MS);
  if (typeof sweeper.unref === 'function') sweeper.unref();

  io.on('connection', (socket: Socket) => {
    socket.on('room:enter', (payload: { gameId?: string; clientId?: string }, ack?: unknown) => {
      const { gameId, clientId } = payload ?? {};
      if (!isValidGameId(gameId) || !clientId) {
        reply(ack, failure('INVALID_GAME_ID', 'That game code is not valid.'));
        return;
      }

      const id = normaliseGameId(gameId);
      const room = store.ensure(id);
      cancelDeletion(id);

      if (room.socketIds.size >= MAX_SOCKETS_PER_ROOM) {
        reply(ack, failure('ROOM_FULL', 'Too many people are connected to this game.'));
        return;
      }

      socket.join(roomKey(id));
      room.socketIds.add(socket.id);
      room.lastActivityAt = Date.now();
      socketToRoom.set(socket.id, { gameId: id, clientId });

      // Reconnects arrive with a fresh socket.id but the same clientId, so the seat is
      // matched back rather than reallocated.
      const seat = store.seatFor(room, clientId);
      if (seat) seat.connected = true;

      reply(ack, {
        ok: true,
        status: room.status,
        lobby: store.toSnapshot(room),
        seatIndex: seat?.seatIndex ?? null,
        state: room.game,
      });

      broadcastLobby(id);
      if (room.game) socket.emit('game-update', { type: 'SYNC_STATE', payload: room.game });
    });

    socket.on('lobby:sit', (payload: { name?: string; color?: PlayerColor }, ack?: unknown) => {
      const ctx = socketToRoom.get(socket.id);
      if (!ctx) {
        reply(ack, failure('NOT_SEATED', 'You are not connected to a game.'));
        return;
      }

      const result = store.sit(ctx.gameId, ctx.clientId, payload?.name ?? '', payload?.color as PlayerColor);
      reply(ack, result);
      if (result.ok) broadcastLobby(ctx.gameId);
    });

    socket.on('lobby:update-seat', (payload: { name?: string; color?: PlayerColor }, ack?: unknown) => {
      const ctx = socketToRoom.get(socket.id);
      if (!ctx) {
        reply(ack, failure('NOT_SEATED', 'You are not connected to a game.'));
        return;
      }

      const result = store.updateSeat(ctx.gameId, ctx.clientId, payload ?? {});
      reply(ack, result);
      if (result.ok) broadcastLobby(ctx.gameId);
    });

    socket.on('lobby:stand', (_payload: unknown, ack?: unknown) => {
      const ctx = socketToRoom.get(socket.id);
      if (!ctx) {
        reply(ack, failure('NOT_SEATED', 'You are not connected to a game.'));
        return;
      }

      const result = store.stand(ctx.gameId, ctx.clientId);
      reply(ack, result);
      broadcastLobby(ctx.gameId);
    });

    socket.on('lobby:start', (_payload: unknown, ack?: unknown) => {
      const ctx = socketToRoom.get(socket.id);
      if (!ctx) {
        reply(ack, failure('NOT_SEATED', 'You are not connected to a game.'));
        return;
      }

      const result = store.start(ctx.gameId, ctx.clientId);
      if (!result.ok) {
        reply(ack, result);
        return;
      }

      reply(ack, { ok: true });
      broadcastLobby(ctx.gameId);
      broadcastGame(ctx.gameId);
    });

    socket.on('lobby:leave', (_payload: unknown, ack?: unknown) => {
      const ctx = socketToRoom.get(socket.id);
      if (!ctx) {
        reply(ack, { ok: true });
        return;
      }

      store.stand(ctx.gameId, ctx.clientId);
      store.get(ctx.gameId)?.socketIds.delete(socket.id);
      socket.leave(roomKey(ctx.gameId));
      socketToRoom.delete(socket.id);

      reply(ack, { ok: true });
      broadcastLobby(ctx.gameId);
      scheduleDeletionIfEmpty(ctx.gameId);
    });

    socket.on('game-action', (payload: { action?: GameAction }) => {
      const ctx = socketToRoom.get(socket.id);
      if (!ctx) {
        socket.emit('game-error', { code: 'NOT_SEATED', message: 'You are not connected to a game.' });
        return;
      }

      const room = store.get(ctx.gameId);
      if (!room || room.status !== 'playing' || !room.game) {
        socket.emit('game-error', { code: 'GAME_IN_PROGRESS', message: 'That game has not started.' });
        return;
      }

      const seat = store.seatFor(room, ctx.clientId);
      if (!seat) {
        socket.emit('game-error', { code: 'NOT_SEATED', message: 'You are only spectating this game.' });
        return;
      }

      const action = payload?.action;
      if (!action) return;

      // The actor is the seat the server assigned — never what the client claimed.
      const actor = seat.seatIndex;
      if (!isActionAllowedFor(room.game, action, actor)) {
        socket.emit('game-error', { code: 'NOT_YOUR_TURN', message: 'It is not your turn.' });
        return;
      }

      room.game = catanReducer(room.game, withActor(action, actor));
      room.lastActivityAt = Date.now();
      broadcastGame(ctx.gameId);
    });

    socket.on('disconnect', () => {
      const ctx = socketToRoom.get(socket.id);
      socketToRoom.delete(socket.id);
      if (!ctx) return;

      store.detach(ctx.gameId, ctx.clientId, socket.id);
      broadcastLobby(ctx.gameId);
      scheduleDeletionIfEmpty(ctx.gameId);
    });
  });

  return store;
}
