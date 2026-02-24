'use client';

import React, { useState } from 'react';
import { ResourceType, TradeOffer, Player } from '@/types/catan';

const RESOURCES: ResourceType[] = ['wood', 'brick', 'wheat', 'sheep', 'ore'];

interface TradeUIProps {
  localPlayerId: number;
  currentPlayerIndex: number;
  localPlayer: Player;
  currentTradeOffer: TradeOffer | null;
  onTradeWithBank: (offerResource: ResourceType, requestResource: ResourceType) => void;
  onProposeTrade: (offer: TradeOffer) => void;
  onAcceptTrade: () => void;
  onCancelTrade: () => void;
}

export function TradeUI({
  localPlayerId,
  currentPlayerIndex,
  localPlayer,
  currentTradeOffer,
  onTradeWithBank,
  onProposeTrade,
  onAcceptTrade,
  onCancelTrade
}: TradeUIProps) {
  const isMyTurn = localPlayerId === currentPlayerIndex;

  // Local state for building an offer
  const [offerMap, setOfferMap] = useState<Record<ResourceType, number>>({ wood: 0, brick: 0, wheat: 0, sheep: 0, ore: 0 });
  const [requestMap, setRequestMap] = useState<Record<ResourceType, number>>({ wood: 0, brick: 0, wheat: 0, sheep: 0, ore: 0 });

  const handleAdjust = (type: 'offer' | 'request', res: ResourceType, delta: number) => {
    if (type === 'offer') {
      const newVal = Math.max(0, offerMap[res] + delta);
      if (newVal <= localPlayer.resources[res]) { // Prevent offering more than you have
        setOfferMap(prev => ({ ...prev, [res]: newVal }));
      }
    } else {
      setRequestMap(prev => ({ ...prev, [res]: Math.max(0, prev[res] + delta) }));
    }
  };

  const handlePropose = () => {
    console.log("Proposing trade...");
    const totalOffered = Object.values(offerMap).reduce((a, b) => a + b, 0);
    const totalRequested = Object.values(requestMap).reduce((a, b) => a + b, 0);
    if (totalOffered === 0 || totalRequested === 0) return;

    onProposeTrade({
      initiatorId: localPlayerId,
      offer: offerMap,
      request: requestMap
    });
  };

  // --- VIEW 1: Someone else has proposed a trade ---
  if (currentTradeOffer) {
    const isInitiator = Number(currentTradeOffer.initiatorId) === Number(localPlayerId);
    
    return (
      <div className="bg-blue-900/40 p-4 rounded-xl border border-blue-500/50 shadow-2xl animate-in zoom-in-95 duration-200">
        <h3 className="text-white font-bold text-sm mb-1">Active Trade Offer</h3>
        <p className="text-blue-200 text-[10px] uppercase tracking-wider mb-4">
          From Player {currentTradeOffer.initiatorId + 1}
        </p>
        
        <div className="space-y-3 mb-6">
          <div className="bg-slate-900/50 p-2 rounded border border-white/5">
            <span className="text-[9px] text-slate-400 block mb-1 uppercase">They Give</span>
            <div className="flex flex-wrap gap-2 text-xs font-mono">
              {Object.entries(currentTradeOffer.offer).map(([res, amt]) => amt > 0 && (
                <span key={res} className="text-emerald-400">{amt} {res}</span>
              ))}
            </div>
          </div>

          <div className="bg-slate-900/50 p-2 rounded border border-white/5">
            <span className="text-[9px] text-slate-400 block mb-1 uppercase">They Want</span>
            <div className="flex flex-wrap gap-2 text-xs font-mono">
              {Object.entries(currentTradeOffer.request).map(([res, amt]) => amt > 0 && (
                <span key={res} className="text-amber-400">{amt} {res}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          {isInitiator ? (
            <button 
              onClick={() => { console.log("Cancel clicked"); onCancelTrade(); }}
              className="flex-1 bg-red-500/20 hover:bg-red-500/40 text-red-200 py-2 rounded text-xs font-bold border border-red-500/50 transition-all"
            >
              Cancel Offer
            </button>
          ) : (
            <button 
              onClick={() => { console.log("Accept clicked"); onAcceptTrade(); }}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded text-xs font-bold shadow-lg shadow-emerald-900/20 transition-all active:scale-95"
            >
              Accept Trade
            </button>
          )}
        </div>
      </div>
    );
  }

  // --- VIEW 2: Propose Section (Only on player's turn) ---
  if (!isMyTurn) {
    return (
      <div className="p-4 text-center border border-dashed border-slate-800 rounded-xl">
        <p className="text-slate-600 text-[10px] uppercase font-bold tracking-widest">Waiting for Turn to Trade</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 shadow-inner">
      <h3 className="text-white font-bold text-sm mb-4">Trading Post</h3>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <h4 className="text-slate-400 text-[9px] uppercase font-black mb-2">Offer</h4>
          {RESOURCES.map(res => (
            <div key={res} className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-white capitalize">{res}</span>
              <div className="flex items-center gap-1">
                <button onClick={() => handleAdjust('offer', res, -1)} className="w-5 h-5 flex items-center justify-center bg-slate-700 text-white rounded text-xs">-</button>
                <span className="text-white text-xs w-4 text-center font-mono">{offerMap[res]}</span>
                <button onClick={() => handleAdjust('offer', res, 1)} className="w-5 h-5 flex items-center justify-center bg-slate-700 text-white rounded text-xs">+</button>
              </div>
            </div>
          ))}
        </div>

        <div>
          <h4 className="text-slate-400 text-[9px] uppercase font-black mb-2">Request</h4>
          {RESOURCES.map(res => (
            <div key={res} className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-white capitalize">{res}</span>
              <div className="flex items-center gap-1">
                <button onClick={() => handleAdjust('request', res, -1)} className="w-5 h-5 flex items-center justify-center bg-slate-700 text-white rounded text-xs">-</button>
                <span className="text-white text-xs w-4 text-center font-mono">{requestMap[res]}</span>
                <button onClick={() => handleAdjust('request', res, 1)} className="w-5 h-5 flex items-center justify-center bg-slate-700 text-white rounded text-xs">+</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <button 
          onClick={handlePropose}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2 rounded text-xs font-bold transition-all active:scale-[0.98]"
        >
          Propose to Players
        </button>
        
        {Object.entries(offerMap).some(([_, v]) => v >= 4) && (
          <button 
            onClick={() => {
              const offerRes = Object.keys(offerMap).find(k => offerMap[k as ResourceType] >= 4) as ResourceType;
              const reqRes = Object.keys(requestMap).find(k => requestMap[k as ResourceType] > 0) as ResourceType;
              if (offerRes && reqRes) onTradeWithBank(offerRes, reqRes);
            }}
            className="w-full bg-amber-600/20 hover:bg-amber-600/40 text-amber-400 py-2 rounded text-[10px] font-bold border border-amber-600/50 transition-all"
          >
            Bank Trade (4:1)
          </button>
        )}
      </div>
    </div>
  );
}