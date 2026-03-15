'use client';

import { useState, use } from 'react';
import { useMultiplayerGame } from '@/hooks/useMultiplayerGame';
import { GameBoard } from '@/components/board/GameBoard';
import { PlayerSidebar } from '@/components/ui/PlayerSidebar';
import { TradeUI } from '@/components/ui/TradeUI';
import { StealModal } from '@/components/ui/StealModal';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function CatanPage({ params }: PageProps) {
  const { id: gameId } = use(params);
  const [myPlayerIndex, setMyPlayerIndex] = useState<number | null>(null);
  const [activeMapAction, setActiveMapAction] = useState<'none' | 'roadBuilding' | 'knight'>('none');
  const [pendingRoadBuildingRoads, setPendingRoadBuildingRoads] = useState<[string, string][]>([]);
  
  const { state, performAction } = useMultiplayerGame(gameId, myPlayerIndex);

  const isMyTurn = state?.currentPlayerIndex === myPlayerIndex;
  const isMovingRobber = state?.pendingRobberAction?.status === 'moving' && isMyTurn;
  const isStealing = state?.pendingRobberAction?.status === 'stealing' && isMyTurn;

  // Intercept road building clicks before they hit performAction
  const handleEdgeClick = (n1: string, n2: string) => {
    if (activeMapAction === 'none') {
      // Standard phase build
      performAction({ type: 'BUILD_ROAD', payload: { nodeId1: n1, nodeId2: n2, playerId: myPlayerIndex }});
    } else if (activeMapAction === 'roadBuilding') {
      // Dev Card build logic
      const newRoad: [string, string] = [n1, n2];
      const updatedPending = [...pendingRoadBuildingRoads, newRoad];

      if (updatedPending.length === 1) {
        setPendingRoadBuildingRoads(updatedPending);
      } else if (updatedPending.length === 2) {
        performAction({
          type: 'PLAY_DEV_CARD',
          payload: {
            playerId: myPlayerIndex,
            cardType: 'roadBuilding',
            cardArgs: { road1: updatedPending[0], road2: updatedPending[1] }
          }
        });
        // Reset state after dispatch
        setActiveMapAction('none');
        setPendingRoadBuildingRoads([]);
      }
    }
  };

  const handleHexClick = (hexId: string) => {
    if (isMovingRobber) {
      performAction({ 
        type: 'MOVE_ROBBER', 
        payload: { hexId, playerId: myPlayerIndex } 
      });
    }
  };

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
        longestRoad={state.longestRoad}
        onRoll={() => performAction({ type: 'ROLL_DICE' })}
        onEndTurn={() => performAction({ type: 'END_TURN' })}
        hasPlayedDevCardThisTurn={state.hasPlayedDevCardThisTurn}
        onPlayDevCard={(cardType, cardArgs) => performAction({ type: 'PLAY_DEV_CARD', payload: { playerId: myPlayerIndex, cardType: cardType, cardArgs: cardArgs}})}
        onInitiateMapCard={(cardType) => {
          setActiveMapAction(cardType);
          if (cardType === 'roadBuilding') setPendingRoadBuildingRoads([]);
        }}
      />

      {/* Center: The Map */}
      <main className="flex-1 relative flex items-center justify-center overflow-hidden">
        {/* Dynamic Map Prompts */}
        {activeMapAction === 'roadBuilding' && (
          <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-6 py-3 rounded-full font-bold shadow-xl shadow-blue-900/50 animate-pulse z-20 border border-blue-400">
            {pendingRoadBuildingRoads.length === 0 
              ? "Select an edge for your 1st free road" 
              : "Select an edge for your 2nd free road"}
          </div>
        )}

        {isMovingRobber && (
          <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-purple-600 text-white px-6 py-3 rounded-full font-bold shadow-xl shadow-purple-900/50 animate-pulse z-20 border border-purple-400">
            Select a tile to place the Robber
          </div>
        )}

        <div className="absolute top-4 left-4 z-10 bg-slate-800/80 p-3 rounded-xl border border-white/10 backdrop-blur-md flex items-center gap-3">
           <span className="text-[10px] font-bold text-slate-400 uppercase">Map Zoom</span>
           <input
              type="range" min="2" max="5"
              value={state.boardRadius}
              onChange={(e) => performAction({ type: 'SET_RADIUS', payload: Number(e.target.value) })}
              className="accent-blue-500 h-1 w-20"
              disabled
            />
        </div>

        <GameBoard 
          state={state} 
          pendingRoads={pendingRoadBuildingRoads}
          isMovingRobber={isMovingRobber}
          onHexClick={handleHexClick}
          onBuildSettlement={(nodeId) => performAction({ type: 'BUILD_SETTLEMENT', payload: { nodeId, playerId: myPlayerIndex }})}
          onBuildRoad={handleEdgeClick}
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
            onTradeWithBank={(offerResource, requestResource) => performAction({ type: 'TRADE_WITH_BANK', payload: { playerId: myPlayerIndex, offerResource, requestResource }})}
            onProposeTrade={(offer) => performAction({ type: 'PROPOSE_TRADE', payload: { offer }})}
            onAcceptTrade={() => performAction({ type: 'ACCEPT_TRADE', payload: { acceptorId: myPlayerIndex }})}
            onCancelTrade={() => performAction({ type: 'CANCEL_TRADE', payload: {} })}
            onBuyDevCard={() => performAction({ type: 'BUY_DEV_CARD', payload: { playerId: myPlayerIndex }})}
          />
        </div>

        {/* Event Log Section */}
        <div className="flex-1 p-4 flex flex-col overflow-hidden">
          <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-4">Event Log</h2>
          <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
            {[...state.gameLog].map((log, i) => (
              <div key={i} className="text-[10px] font-mono text-slate-500 border-l border-slate-800 pl-2 leading-relaxed animate-in fade-in slide-in-from-left-1">
                <span className="text-slate-700">#</span> {log}
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* Steal Modal */}
      {isStealing && state.pendingRobberAction?.validVictims && (
        <StealModal 
          victims={state.pendingRobberAction.validVictims}
          players={state.players}
          onSelect={(victimId) => performAction({ 
            type: 'STEAL_RESOURCE', 
            payload: { thiefId: myPlayerIndex, victimId } 
          })}
        />
      )}
    </div>
  );
}