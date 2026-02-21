import { useEffect, useState } from 'react';
import { socket } from '@/lib/socket-client';
import { GameState, GameAction } from '@/types/catan';

export function useMultiplayerGame(gameId: string) {
  const [state, setState] = useState<GameState | null>(null);

  useEffect(() => {
    socket.emit('join-room', gameId);

    const handleUpdate = (action: GameAction) => {
      if (action.type === 'SYNC_STATE') {
        setState(action.payload);
      }
    };

    socket.on('game-update', handleUpdate);

    return () => {
      socket.off('game-update', handleUpdate);
    };
  }, [gameId]);

  const performAction = (action: GameAction) => {
    socket.emit('game-action', { gameId, action });
  };

  return { state, performAction };
}