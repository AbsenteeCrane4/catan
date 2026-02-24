'use client';

import { useState, use } from 'react';
import { useMultiplayerGame } from '@/hooks/useMultiplayerGame';
import { GameBoard } from '@/components/board/GameBoard';
import { PlayerSidebar } from '@/components/ui/PlayerSidebar';
import { TradeUI } from '@/components/ui/TradeUI';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function CatanPage({ params }: PageProps) {
  const { id: gameId } = use(params);
  const [myPlayerIndex, setMyPlayerIndex] = useState<number | null>(null);
  
  const { state, performAction } = useMultiplayerGame(gameId, myPlayerIndex);

  // 1. Initial Selection Screen
  if (myPlayerIndex === null) {
    return (
      <div className="h-screen bg-slate-900 flex flex-col items-center justify-center gap-8">
        <h1 className="text-3xl font-bold text-white">Select Your Player</h1>
        <div className="flex gap-4">
          {[0, 1, 2, 3].map(i => (
            <button key={i} onClick={() => setMyPlayerIndex(i)} className="p-8 bg-slate-800 rounded-xl hover:bg-slate-700 text-white font-bold border-2 border-slate-700 transition-all">
              Player {i + 1}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (!state) return <div className="text-white">Loading...</div>;

  return (
  <div className="flex h-screen bg-slate-900 text-white">
    {/* Left Sidebar is now the master control */}
      <PlayerSidebar 
        players={state.players} 
        currentPlayerIndex={state.currentPlayerIndex}
        myPlayerIndex={myPlayerIndex}
        diceRoll={state.diceRoll}
        onRoll={() => performAction({ type: 'ROLL_DICE' })}
        onEndTurn={() => performAction({ type: 'END_TURN' })}
      />

      {/* Center: The Map */}
      <main className="flex-1 relative flex items-center justify-center overflow-hidden">
        <div className="absolute top-4 left-4 z-10 bg-slate-800/80 p-3 rounded-xl border border-white/10 backdrop-blur-md flex items-center gap-3">
           <span className="text-[10px] font-bold text-slate-400 uppercase">Map Zoom</span>
           <input
              type="range" min="2" max="5"
              value={state.boardRadius}
              onChange={(e) => performAction({ type: 'SET_RADIUS', payload: Number(e.target.value) })}
              className="accent-blue-500 h-1 w-20"
            />
        </div>

        <GameBoard 
          state={state} 
          onBuildSettlement={(nodeId) => performAction({ type: 'BUILD_SETTLEMENT', payload: { nodeId, playerId: myPlayerIndex }})}
          onBuildRoad={(n1, n2) => performAction({ type: 'BUILD_ROAD', payload: { nodeId1: n1, nodeId2: n2, playerId: myPlayerIndex }})}
          onUpgradeSettlement={(nodeId) => performAction({ type: 'UPGRADE_SETTLEMENT', payload: { nodeId, playerId: myPlayerIndex }})}
        />
      </main>

      {/* Right Sidebar: Trading & Logs */}
      <aside className="w-80 bg-slate-900/50 border-l border-slate-800 flex flex-col overflow-hidden">
        {/* Trading Section */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/30">
          <TradeUI 
            localPlayerId={myPlayerIndex}
            currentPlayerIndex={state.currentPlayerIndex}
            localPlayer={state.players[myPlayerIndex]}
            currentTradeOffer={state.currentTradeOffer}
            onTradeWithBank={(offerResource, requestResource) => 
              performAction({ type: 'TRADE_WITH_BANK', payload: { playerId: myPlayerIndex, offerResource, requestResource }})
            }
            onProposeTrade={(offer) => 
              performAction({ type: 'PROPOSE_TRADE', payload: { offer }})
            }
            onAcceptTrade={() => 
              performAction({ type: 'ACCEPT_TRADE', payload: { acceptorId: myPlayerIndex }})
            }
            onCancelTrade={() => 
              performAction({ type: 'CANCEL_TRADE', payload: {} })
            }
          />
        </div>

        {/* Event Log Section */}
        <div className="flex-1 p-4 flex flex-col overflow-hidden">
          <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-4">Event Log</h2>
          <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
            {[...state.gameLog].reverse().map((log, i) => (
              <div key={i} className="text-[10px] font-mono text-slate-500 border-l border-slate-800 pl-2 leading-relaxed animate-in fade-in slide-in-from-left-1">
                <span className="text-slate-700">#</span> {log}
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}