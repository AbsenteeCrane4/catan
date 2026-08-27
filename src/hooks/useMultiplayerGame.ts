import { useCallback, useEffect, useState } from 'react';
import { socket } from '@/lib/socket-client';
import { GameAction, GameState, PlayerColor } from '@/types/catan';
import { Ack, LobbySnapshot, LobbyStateMessage } from '@/types/lobby';
import { getClientId } from '@/lib/client-id';

interface EnterResponse {
  status: 'lobby' | 'playing';
  lobby: LobbySnapshot;
  seatIndex: number | null;
  state: GameState | null;
}

export interface GameError {
  code: string;
  message: string;
}

/** Promisified socket.io ack so callers can await a seat claim and surface its error. */
function request<T>(event: string, payload: unknown): Promise<Ack<T>> {
  return new Promise(resolve => {
    socket.emit(event, payload, (response: Ack<T>) =>
      resolve(response ?? { ok: false, error: 'ROOM_NOT_FOUND', message: 'No response from server.' })
    );
  });
}

export function useMultiplayerGame(gameId: string) {
  // Lazily initialised rather than set from an effect. The guard keeps it null during
  // SSR (no localStorage there); the initialiser re-runs on the client at hydration,
  // and the first paint is the same "Connecting" markup either way, so nothing mismatches.
  const [clientId] = useState<string | null>(() =>
    typeof window === 'undefined' ? null : getClientId()
  );
  const [lobby, setLobby] = useState<LobbySnapshot | null>(null);
  const [state, setState] = useState<GameState | null>(null);
  const [seatIndex, setSeatIndex] = useState<number | null>(null);
  const [lastError, setLastError] = useState<GameError | null>(null);

  useEffect(() => {
    if (!clientId) return;

    const enter = async () => {
      const response = await request<EnterResponse>('room:enter', { gameId, clientId });
      if (!response.ok) {
        setLastError({ code: response.error, message: response.message });
        return;
      }
      setLobby(response.lobby);
      setSeatIndex(response.seatIndex);
      setState(response.state);
    };

    // The server addresses each client individually, so our own seat index stays
    // correct even when the lobby compacts after someone leaves.
    const handleLobby = ({ yourSeatIndex, ...snapshot }: LobbyStateMessage) => {
      setLobby(snapshot);
      setSeatIndex(yourSeatIndex);
    };

    const handleGame = (message: { type: string; payload: GameState }) => {
      if (message.type === 'SYNC_STATE') setState(message.payload);
    };

    const handleError = (error: GameError) => setLastError(error);

    // socket.io room membership does not survive a reconnect (new socket.id), so
    // re-enter on every connect rather than only on mount.
    socket.on('connect', enter);
    socket.on('lobby:state', handleLobby);
    socket.on('game-update', handleGame);
    socket.on('game-error', handleError);

    if (socket.connected) enter();

    return () => {
      // Unregister by handler reference — socket.off(event) would drop every listener.
      socket.off('connect', enter);
      socket.off('lobby:state', handleLobby);
      socket.off('game-update', handleGame);
      socket.off('game-error', handleError);
    };
  }, [gameId, clientId]);

  const sit = useCallback(async (name: string, color: PlayerColor) => {
    const response = await request<{ seatIndex: number }>('lobby:sit', { name, color });
    if (response.ok) {
      setSeatIndex(response.seatIndex);
      setLastError(null);
    } else {
      setLastError({ code: response.error, message: response.message });
    }
    return response;
  }, []);

  const updateSeat = useCallback(async (patch: { name?: string; color?: PlayerColor }) => {
    const response = await request('lobby:update-seat', patch);
    if (!response.ok) setLastError({ code: response.error, message: response.message });
    return response;
  }, []);

  const stand = useCallback(async () => {
    const response = await request('lobby:stand', {});
    if (response.ok) setSeatIndex(null);
    return response;
  }, []);

  const start = useCallback(async () => {
    const response = await request('lobby:start', {});
    if (!response.ok) setLastError({ code: response.error, message: response.message });
    return response;
  }, []);

  const performAction = useCallback((action: GameAction) => {
    socket.emit('game-action', { action });
  }, []);

  const leaveRoom = useCallback(() => {
    socket.emit('lobby:leave', {});
  }, []);

  return {
    clientId,
    lobby,
    state,
    seatIndex,
    lastError,
    clearError: useCallback(() => setLastError(null), []),
    sit,
    updateSeat,
    stand,
    start,
    performAction,
    leaveRoom,
  };
}
