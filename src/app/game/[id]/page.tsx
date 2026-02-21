'use client';

import { use } from 'react';
import { useMultiplayerGame } from '@/hooks/useMultiplayerGame';
import { GameBoard } from '@/components/board/GameBoard';
import { PlayerSidebar } from '@/components/ui/PlayerSidebar';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function CatanPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const gameId = resolvedParams.id;

  const { state, performAction } = useMultiplayerGame(gameId);

  if (!state) return <div className="text-white p-10 flex h-screen items-center justify-center">Loading Server State...</div>;

  return (
    <div className="flex h-screen bg-slate-900 overflow-hidden text-white">
      
      {/* Left Sidebar (Players 1 & 2) */}
      <PlayerSidebar 
        players={state.players} 
        currentPlayerIndex={state.currentPlayerIndex} 
      />

      {/* Main Board Area */}
      <main className="flex-1 relative flex flex-col items-center justify-center">
        {/* Controls Overlay */}
        <div className="absolute top-4 left-4 z-10 flex gap-4 items-center bg-slate-800/80 p-4 rounded-2xl border border-white/10 backdrop-blur-md">
           <span className="font-mono text-xs text-slate-400">ROOM: {gameId}</span>
           <div className="h-4 w-[1px] bg-white/20" />
           <input
              type="range" min="2" max="5"
              value={state.boardRadius}
              onChange={(e) => performAction({ 
                type: 'SET_RADIUS', 
                payload: Number(e.target.value) 
              })}
              className="accent-blue-500 h-1 w-24"
            />
        </div>

        <GameBoard 
          state={state}
          onBuildSettlement={(nodeId) => performAction({
            type: 'BUILD_SETTLEMENT',
            payload: { nodeId, playerId: state.currentPlayerIndex }
          })}
          onBuildRoad={(nodeId1, nodeId2) => performAction({
            type: 'BUILD_ROAD',
            payload: { nodeId1, nodeId2, playerId: state.currentPlayerIndex }
          })}
        />
      </main>

      <aside className="w-64 bg-slate-800 border-l border-slate-700 p-4 flex flex-col">
        <h2 className="text-xl font-bold mb-4">Game Actions</h2>
        
        <div className="space-y-4">
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-500">Turn Controls</h2>
          
          {/* 1. Roll Dice Button */}
          {!state.diceRoll ? (
            <button 
              onClick={() => performAction({ type: 'ROLL_DICE' } as any)}
              className="w-full bg-amber-500 hover:bg-amber-400 active:scale-95 transition-all py-4 rounded-xl font-bold text-slate-900 shadow-lg shadow-amber-900/20"
            >
              🎲 Roll Dice
            </button>
          ) : (
            <div className="w-full bg-slate-700 py-4 rounded-xl text-center font-black text-2xl border border-white/10">
              🎲 {state.diceRoll}
            </div>
          )}

          {/* 2. End Turn Button (Only show after rolling) */}
          <button 
            disabled={!state.diceRoll}
            onClick={() => performAction({ type: 'END_TURN' } as any)}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all py-4 rounded-xl font-bold"
          >
            End Turn
          </button>
        </div>

        <div className="flex-1 bg-slate-900 rounded-lg p-3 overflow-y-auto font-mono text-sm text-slate-400 space-y-2">
          {state.gameLog.map((log, i) => (
            <div key={i}>&gt; {log}</div>
          ))}
        </div>
      </aside>

    </div>
  );
}