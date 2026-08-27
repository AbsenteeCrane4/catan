'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createGameId, isValidGameId } from '@/lib/game-id';

export default function LobbyPage() {
  const router = useRouter();
  const [gameId, setGameId] = useState('');

  const createNewGame = () => {
    router.push(`/game/${createGameId()}`);
  };

  const joinGame = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValidGameId(gameId)) router.push(`/game/${gameId.trim().toUpperCase()}`);
  };

  return (
    <div className="h-screen bg-slate-900 text-white flex flex-center items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8 text-center">
        <h1 className="text-6xl font-black text-blue-500 italic uppercase tracking-tighter">
          Catan <span className="text-white text-4xl block">Multiplayer</span>
        </h1>
        
        <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-700 space-y-6">
          <button
            onClick={createNewGame}
            data-cy="create-game-btn"
            className="w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-xl font-bold text-xl transition-all active:scale-95"
          >
            Create New Game
          </button>

          <div className="relative flex py-5 items-center">
            <div className="flex-grow border-t border-slate-700"></div>
            <span className="flex-shrink mx-4 text-slate-500 uppercase text-xs font-bold">Or Join Game</span>
            <div className="flex-grow border-t border-slate-700"></div>
          </div>

          <form onSubmit={joinGame} className="flex gap-2">
            <input
              type="text"
              placeholder="Enter Game ID"
              data-cy="join-game-input"
              className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 flex-1 focus:ring-2 focus:ring-blue-500 outline-none"
              value={gameId}
              onChange={(e) => setGameId(e.target.value)}
            />
            <button
              type="submit"
              disabled={!isValidGameId(gameId)}
              data-cy="join-game-btn"
              className="bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed px-6 py-3 rounded-xl font-bold transition-colors"
            >
              Join
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}