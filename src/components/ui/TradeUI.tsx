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
    const isInitiator = currentTradeOffer.initiatorId === localPlayerId;
    return (
      <div className="bg-slate-800 p-4 rounded-xl border border-blue-500 shadow-xl">
        <h3 className="text-white font-bold mb-2">Active Trade Offer</h3>
        <p className="text-slate-300 text-sm mb-4">Player {currentTradeOffer.initiatorId + 1} is offering...</p>
        
        {/* Render the offer details here (simplified for brevity) */}
        <div className="flex justify-between mb-4 text-sm">
          <div className="text-red-400">Gives: {Object.entries(currentTradeOffer.offer).filter(([_, v]) => v > 0).map(([k, v]) => `${v} ${k}`).join(', ')}</div>
          <div className="text-green-400">Wants: {Object.entries(currentTradeOffer.request).filter(([_, v]) => v > 0).map(([k, v]) => `${v} ${k}`).join(', ')}</div>
        </div>

        <div className="flex gap-2">
          {isInitiator ? (
            <button onClick={onCancelTrade} className="flex-1 bg-red-600/80 text-white py-2 rounded">Cancel Offer</button>
          ) : (
            <button onClick={onAcceptTrade} className="flex-1 bg-green-600 hover:bg-green-500 text-white py-2 rounded">Accept Trade</button>
          )}
        </div>
      </div>
    );
  }

  // --- VIEW 2: Your turn, build a trade ---
  if (!isMyTurn) return null;

  return (
    <div className="bg-slate-800 p-4 rounded-xl border border-slate-600">
      <h3 className="text-white font-bold mb-4">Trading Post</h3>
      
      <div className="flex gap-4">
        {/* Offer Column */}
        <div className="flex-1">
          <h4 className="text-slate-400 text-xs uppercase mb-2">You Offer</h4>
          {RESOURCES.map(res => (
            <div key={res} className="flex items-center justify-between mb-1">
              <span className="text-white text-sm capitalize">{res} ({localPlayer.resources[res]})</span>
              <div className="flex items-center gap-2">
                <button onClick={() => handleAdjust('offer', res, -1)} className="px-2 bg-slate-700 text-white rounded">-</button>
                <span className="text-white w-4 text-center">{offerMap[res]}</span>
                <button onClick={() => handleAdjust('offer', res, 1)} className="px-2 bg-slate-700 text-white rounded">+</button>
              </div>
            </div>
          ))}
        </div>

        {/* Request Column */}
        <div className="flex-1">
          <h4 className="text-slate-400 text-xs uppercase mb-2">You Want</h4>
          {RESOURCES.map(res => (
            <div key={res} className="flex items-center justify-between mb-1">
              <span className="text-white text-sm capitalize">{res}</span>
              <div className="flex items-center gap-2">
                <button onClick={() => handleAdjust('request', res, -1)} className="px-2 bg-slate-700 text-white rounded">-</button>
                <span className="text-white w-4 text-center">{requestMap[res]}</span>
                <button onClick={() => handleAdjust('request', res, 1)} className="px-2 bg-slate-700 text-white rounded">+</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 flex gap-2 border-t border-slate-700 pt-4">
        <button 
          onClick={handlePropose}
          className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded font-semibold transition-colors"
        >
          Propose to Players
        </button>
        {/* Simple Bank Trade shortcut: Check if any offered resource is exactly 4 and request is exactly 1 */}
        {Object.values(offerMap).some(v => v >= 4) && Object.values(requestMap).some(v => v === 1) && (
          <button 
            onClick={() => {
              const offerRes = Object.keys(offerMap).find(k => offerMap[k as ResourceType] >= 4) as ResourceType;
              const reqRes = Object.keys(requestMap).find(k => requestMap[k as ResourceType] === 1) as ResourceType;
              onTradeWithBank(offerRes, reqRes);
              setOfferMap({ wood: 0, brick: 0, wheat: 0, sheep: 0, ore: 0 });
              setRequestMap({ wood: 0, brick: 0, wheat: 0, sheep: 0, ore: 0 });
            }}
            className="flex-1 bg-amber-600 hover:bg-amber-500 text-white py-2 rounded font-semibold transition-colors"
          >
            Trade with Bank (4:1)
          </button>
        )}
      </div>
    </div>
  );
}