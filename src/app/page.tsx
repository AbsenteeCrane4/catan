'use client';

import { useCatanGame } from '@/hooks/useCatanGame';
import { GameBoard } from '@/components/board/GameBoard';
import { PlayerSidebar } from '@/components/ui/PlayerSidebar';
import { Hexagon, Map as MapIcon, Users } from 'lucide-react';

export default function CatanPage() {
  const { state, actions } = useCatanGame();

  return (
    <div className="h-screen w-screen bg-slate-900 text-slate-100 flex flex-col font-sans overflow-hidden">
      
      {/* --- Top Navigation --- */}
      <header className="h-16 px-6 bg-slate-800 border-b border-slate-700 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-2">
          <Hexagon className="text-amber-500" fill="currentColor" />
          <h1 className="text-xl font-bold bg-gradient-to-r from-amber-500 to-orange-600 bg-clip-text text-transparent">
            Catan Clone
          </h1>
        </div>

        {/* Settings Controls */}
        <div className="flex items-center gap-6 text-sm">
           <div className="flex flex-col items-end">
             <label className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Map Radius</label>
             <div className="flex items-center gap-2">
                <MapIcon size={14} />
                <input 
                  type="range" min="2" max="5" 
                  value={state.boardRadius} 
                  onChange={(e) => actions.setBoardRadius(Number(e.target.value))}
                  className="accent-amber-500 h-1 w-24"
                />
                <span className="w-3 font-mono">{state.boardRadius}</span>
             </div>
           </div>
           
           <div className="flex flex-col items-end">
             <label className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Players</label>
             <div className="flex items-center gap-2">
                <Users size={14} />
                <input 
                  type="range" min="2" max="8" 
                  value={state.playerCount} 
                  onChange={(e) => actions.setPlayerCount(Number(e.target.value))}
                  className="accent-amber-500 h-1 w-24"
                />
                <span className="w-3 font-mono">{state.playerCount}</span>
             </div>
           </div>
        </div>
      </header>

      {/* --- Main Content Area --- */}
      <main className="flex-1 flex overflow-hidden">
        <PlayerSidebar players={state.players} currentPlayerIndex={state.currentPlayerIndex} />
        
        <GameBoard 
          hexes={state.hexes}
          nodes={state.nodes}
          settlements={state.settlements}
          radius={state.boardRadius}
          onBuildSettlement={actions.buildSettlement}
          roads={state.roads}
          onBuildRoad={actions.buildRoad}
        />
        
        {/* Right Sidebar: Controls & Log */}
        <aside className="w-72 bg-slate-800 border-l border-slate-700 flex flex-col">
           {/* Extract this into <GameControls /> */}
           <div className="p-6 border-b border-slate-700">
             <div className="text-center mb-6">
                <div className="text-4xl font-mono font-bold text-amber-400 bg-slate-900 py-4 rounded border border-slate-700 shadow-inner">
                  {state.diceRoll ?? '-'}
                </div>
             </div>
             <button 
               onClick={actions.rollDice}
               disabled={state.diceRoll !== null}
               className="w-full py-3 mb-2 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-700 disabled:text-slate-500 rounded font-bold transition-colors"
             >
               Roll Dice
             </button>
             <button 
               onClick={actions.endTurn}
               disabled={state.diceRoll === null}
               className="w-full py-3 bg-slate-600 hover:bg-slate-500 disabled:opacity-50 rounded font-bold transition-colors"
             >
               End Turn
             </button>
           </div>
           
           <div className="flex-1 p-4 overflow-y-auto font-mono text-xs text-slate-300">
             <h3 className="font-bold text-slate-500 mb-2 uppercase text-[10px] tracking-widest">Activity Log</h3>
             <ul className="space-y-2">
               {state.gameLog.map((log, i) => (
                 <li key={i} className="border-b border-slate-700/50 pb-1">{log}</li>
               ))}
             </ul>
           </div>
        </aside>
      </main>
    </div>
  );
}