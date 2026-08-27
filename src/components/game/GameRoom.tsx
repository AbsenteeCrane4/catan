'use client';

import { useRouter } from 'next/navigation';
import { useMultiplayerGame } from '@/hooks/useMultiplayerGame';
import { LobbyScreen } from '@/components/lobby/LobbyScreen';
import { GameView } from './GameView';

export function GameRoom({ gameId }: { gameId: string }) {
  const router = useRouter();
  const { lobby, state, seatIndex, lastError, sit, stand, start, performAction, leaveRoom } =
    useMultiplayerGame(gameId);

  const goHome = () => {
    leaveRoom();
    router.push('/');
  };

  if (!lobby) {
    return (
      <div className="h-screen bg-slate-900 text-white flex items-center justify-center">
        <p className="text-slate-400">Connecting…</p>
      </div>
    );
  }

  if (lobby.status === 'lobby') {
    return (
      <LobbyScreen
        lobby={lobby}
        seatIndex={seatIndex}
        errorMessage={lastError?.message ?? null}
        onSit={(name, color) => void sit(name, color)}
        onStand={() => void stand()}
        onStart={() => void start()}
      />
    );
  }

  // Started, but this browser never claimed a seat — spectating is not supported yet.
  if (seatIndex === null) {
    return (
      <div className="h-screen bg-slate-900 text-white flex flex-col items-center justify-center gap-4 p-4 text-center">
        <h1 className="text-2xl font-bold">Game already in progress</h1>
        <p className="text-slate-400">This game started without you, so there is no free seat.</p>
        <button
          onClick={() => router.push('/')}
          className="bg-blue-600 hover:bg-blue-500 px-6 py-3 rounded-xl font-bold transition-colors"
        >
          Back to home
        </button>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="h-screen bg-slate-900 text-white flex items-center justify-center">
        <p className="text-slate-400">Loading game…</p>
      </div>
    );
  }

  return (
    <GameView
      state={state}
      myPlayerIndex={seatIndex}
      performAction={performAction}
      onLeave={goHome}
    />
  );
}
