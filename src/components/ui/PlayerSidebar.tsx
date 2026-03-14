import { useState } from 'react';
import { Player, ResourceType, DevelopmentCardType, AnyCardArgs } from "@/types/catan";
import { RESOURCE_COLORS } from "@/lib/constants";
import { Users, Dice5, ChevronRight, Layers, Lock, Play } from "lucide-react";
import { clsx } from "clsx";
import { DiceRoll } from "./DiceRoll"; // Import your animation component
import { Road } from "./Road"; // Import the Road icon component
import { DevCardModal } from "./DevCardModal";

interface Props {
  players: Player[];
  currentPlayerIndex: number;
  myPlayerIndex: number;
  diceRoll: number | null;
  longestRoad: { playerId: number | null; length: number };
  hasPlayedDevCardThisTurn: boolean;
  onRoll: () => void;
  onEndTurn: () => void;
  onPlayDevCard: (cardType: DevelopmentCardType, cardArgs?: AnyCardArgs) => void;
  onInitiateMapCard: (cardType: 'knight' | 'roadBuilding') => void;
}

const playerColors = {
  red: 'bg-red-700',
  blue: 'bg-blue-700',
  white: 'bg-slate-200',
  orange: 'bg-amber-500',
  green: 'bg-emerald-600',
  brown: 'bg-amber-900',
  purple: 'bg-purple-700',
};

// Helper to format dev card names cleanly
const formatCardName = (type: DevelopmentCardType) => {
  const names: Record<string, string> = {
    knight: 'Knight', victoryPoint: '+1 VP', roadBuilding: 'Road Bldg', yearOfPlenty: 'Yr of Plenty', monopoly: 'Monopoly'
  };
  return names[type] || type;
};

export function PlayerSidebar({ 
  players, 
  currentPlayerIndex, 
  myPlayerIndex, 
  diceRoll, 
  longestRoad,
  hasPlayedDevCardThisTurn,
  onRoll, 
  onEndTurn,
  onPlayDevCard,
  onInitiateMapCard
}: Props) {
  const isMyTurn = currentPlayerIndex === myPlayerIndex;

  // Track which card is waiting for user input
  const [activeCardPrompt, setActiveCardPrompt] = useState<DevelopmentCardType | null>(null);

  const handleInitiatePlay = (card: DevelopmentCardType) => {
    if (card === 'monopoly' || card === 'yearOfPlenty') {
      setActiveCardPrompt(card);
    } else if (card === 'roadBuilding' || card === 'knight') {
      onInitiateMapCard(card);
    } else {
      onPlayDevCard(card);
    }
  };

  const handleModalSubmit = (cardArgs: AnyCardArgs) => {
    if (activeCardPrompt) {
      onPlayDevCard(activeCardPrompt, cardArgs);
      setActiveCardPrompt(null);
    }
  };

  return (
  <>
    <aside className="w-72 bg-slate-800/90 backdrop-blur border-r border-slate-700 p-4 flex flex-col gap-4 overflow-y-auto">
      
      {/* --- TURN CONTROLS SECTION --- */}
      <div className="bg-slate-900/50 p-4 rounded-xl border border-white/5 flex flex-col items-center gap-4 mb-2">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
          {isMyTurn ? "Your Turn" : `Player ${currentPlayerIndex + 1}'s Turn`}
        </h3>
        
        {/* The Dice Animation moved here */}
        <div className="h-20 flex items-center justify-center">
          {diceRoll ? (
            <DiceRoll value={diceRoll} />
          ) : (
            <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-700 flex items-center justify-center text-slate-700">
              <Dice5 size={32} />
            </div>
          )}
        </div>

        <div className="w-full space-y-2">
          {!diceRoll ? (
            <button 
              disabled={!isMyTurn}
              onClick={onRoll}
              className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-20 disabled:grayscale py-3 rounded-lg font-bold text-slate-900 transition-all flex items-center justify-center gap-2"
            >
              Roll Dice
            </button>
          ) : (
            <button 
              disabled={!isMyTurn}
              onClick={onEndTurn}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-20 py-3 rounded-lg font-bold text-white transition-all flex items-center justify-center gap-2"
            >
              End Turn <ChevronRight size={18} />
            </button>
          )}
        </div>
      </div>

      <div className="h-[1px] bg-slate-700 w-full my-2" />

      {/* --- PLAYERS LIST --- */}
      <div className="space-y-3">
        {players.map((p, idx) => {
          const isMe = idx === myPlayerIndex;
          const totalHiddenCards = (p.devCards?.playable?.length || 0) + (p.devCards?.boughtThisTurn?.length || 0);

          return (
            <div 
              key={p.id}
              className={clsx(
                "p-3 rounded-lg border-2 transition-all duration-300 relative",
                isMe 
                  ? "border-amber-400 bg-slate-700 shadow-lg" 
                  : "border-transparent bg-slate-800/50"
              )}
            >
              {isMe && (
                <span className="absolute -top-2 -right-1 bg-blue-500 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter">You</span>
              )}

              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-sm flex items-center gap-2" style={{ color: p.color }}>
                  <Users size={14} /> Player {idx + 1}
                </span>
                <div className="flex gap-1">
                  {/* Opponent Dev Card Count */}
                  {!isMe && totalHiddenCards > 0 && (
                    <span className="text-[10px] bg-purple-900/50 border border-purple-500/30 px-1.5 py-0.5 rounded flex items-center gap-1 text-purple-300">
                      <Layers size={15} /> {totalHiddenCards}
                    </span>
                  )}
                  <span className="text-[10px] bg-slate-950 px-2 py-0.5 rounded text-slate-400"><Road color={playerColors[p.color]} /> {p.longestRoadLength}</span>
                  <span className="text-[10px] bg-slate-950 px-2 py-0.5 rounded text-slate-400">VP: {p.victoryPoints}</span>
                </div>
              </div>

              {/* Resources */}
              <div className="grid grid-cols-5 gap-1 text-[10px] text-slate-300 mb-2">
                {Object.entries(p.resources).map(([res, count]) => (
                  <div key={res} className="flex flex-col items-center bg-slate-900/50 p-1 rounded border border-white/5">
                    <div className="w-2 h-2 rounded-full mb-1" style={{ backgroundColor: RESOURCE_COLORS[res as ResourceType] }} />
                    <span className={count > 0 ? "text-white font-bold" : "text-slate-600"}>{count}</span>
                  </div>
                ))}
              </div>

              {/* LOCAL PLAYER DEV CARDS */}
              {isMe && (p.devCards?.playable.length > 0 || p.devCards?.boughtThisTurn.length > 0) && (
                <div className="mt-2 pt-2 border-t border-slate-700/50 flex flex-col gap-1">
                  <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider mb-1">Your Dev Cards</span>
                  
                  {/* Playable Cards */}
                  {p.devCards.playable.map((card, i) => (
                    <div key={`playable-${i}`} className="flex justify-between items-center bg-slate-900/50 p-1.5 rounded border border-purple-500/20">
                      <span className="text-[10px] text-purple-300 font-bold">{formatCardName(card)}</span>
                      {card !== 'victoryPoint' && (
                        <button
                          onClick={() => handleInitiatePlay(card)}
                          disabled={!isMyTurn || hasPlayedDevCardThisTurn}
                          className="bg-purple-600 hover:bg-purple-500 disabled:opacity-30 text-white text-[9px] px-2 py-1 rounded flex items-center gap-1 transition-all"
                        >
                          <Play size={8} /> Play
                        </button>
                      )}
                    </div>
                  ))}

                  {/* Bought This Turn (Locked) */}
                  {p.devCards.boughtThisTurn.map((card, i) => (
                    <div key={`locked-${i}`} className="flex justify-between items-center bg-slate-900/30 p-1.5 rounded border border-slate-700 opacity-60">
                      <span className="text-[10px] text-slate-400 line-through">{formatCardName(card)}</span>
                      <Lock size={10} className="text-slate-500" />
                    </div>
                  ))}
                </div>
              )}

            </div>
          );
        })}
      </div>

      <div>
        {longestRoad.playerId !== null && (
          <div className="bg-orange-600/20 border border-orange-500 text-orange-400 p-2 rounded text-xs font-bold text-center mt-4">
            👑 Player {longestRoad.playerId + 1} holds the Longest Road ({longestRoad.length})
          </div>
        )}
      </div>
    </aside> 
    
    {activeCardPrompt && (
      <DevCardModal 
        cardType={activeCardPrompt} 
        onClose={() => setActiveCardPrompt(null)} 
        onSubmit={handleModalSubmit}
      />
    )}
  </>
  );
}