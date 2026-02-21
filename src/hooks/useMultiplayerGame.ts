import { useEffect, useState } from 'react';
import { socket } from '@/lib/socket-client';
import { GameState, GameAction } from '@/types/catan';

export function useMultiplayerGame(gameId: string, playerIndex: number | null) {
  const [state, setState] = useState<GameState | null>(null);

  useEffect(() => {
    if (playerIndex === null) return;

    socket.emit('join-room', { gameId, playerIndex });
    socket.on('game-update', (action) => {
      if (action.type === 'SYNC_STATE') setState(action.payload);
    });

    return () => { socket.off('game-update'); };
  }, [gameId, playerIndex]);

  const performAction = (action: any) => {
    socket.emit('game-action', { gameId, action });
  };

  return { state, performAction };
}