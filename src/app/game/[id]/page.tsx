'use client';

import { use } from 'react';
import { useMultiplayerGame } from '@/hooks/useMultiplayerGame';
import { createInitialState } from '@/lib/game-reducer';
import { GameBoard } from '@/components/board/GameBoard';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function CatanPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const gameId = resolvedParams.id;

  const { state, performAction } = useMultiplayerGame(
    gameId, 
    createInitialState(2) 
  );

  if (!state) return <div className="text-white p-10">Loading Game...</div>;

  return (
    <div className="flex h-screen bg-slate-900 overflow-hidden">
      <main className="flex-1 relative flex flex-col">
        <div className="absolute top-4 left-4 z-10 flex gap-4 items-center bg-slate-800/80 p-4 rounded-2xl border border-white/10 backdrop-blur-md">
           <span className="text-white font-mono text-xs">ID: {gameId}</span>
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
    </div>
  );
}