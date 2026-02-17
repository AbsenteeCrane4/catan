import React from 'react';
import { Dice5, CheckCircle2, Hammer, Landmark, Waypoints } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';

interface GameControlsProps {
  diceRoll: number | null;
  onRoll: () => void;
  onEndTurn: () => void;
  canRoll: boolean;
  canEndTurn: boolean;
}

export function GameControls({
  diceRoll,
  onRoll,
  onEndTurn,
  canRoll,
  canEndTurn,
}: GameControlsProps) {
  return (
    <div className="flex flex-col h-full">
      {/* 1. Dice Section */}
      <div className="p-6 border-b border-slate-700 bg-slate-800/50">
        <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4">
          Action Phase
        </h3>
        
        <div className="relative flex justify-center items-center mb-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={diceRoll ?? 'empty'}
              initial={{ scale: 0.8, opacity: 0, rotate: -10 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 0.8, opacity: 0, rotate: 10 }}
              className="text-5xl font-mono font-bold text-amber-400 bg-slate-900 w-full py-6 rounded-xl border border-slate-600 shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] flex items-center justify-center gap-3"
            >
              {diceRoll ?? <span className="text-slate-700 opacity-50">--</span>}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="space-y-3">
          <button
            onClick={onRoll}
            disabled={!canRoll}
            className={clsx(
              "w-full py-4 rounded-lg font-bold flex items-center justify-center gap-2 transition-all active:scale-95",
              canRoll 
                ? "bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-900/20" 
                : "bg-slate-700 text-slate-500 cursor-not-allowed"
            )}
          >
            <Dice5 size={20} className={canRoll ? "animate-pulse" : ""} />
            Roll Dice
          </button>

          <button
            onClick={onEndTurn}
            disabled={!canEndTurn}
            className={clsx(
              "w-full py-4 rounded-lg font-bold flex items-center justify-center gap-2 transition-all active:scale-95",
              canEndTurn 
                ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20" 
                : "bg-slate-700 text-slate-500 cursor-not-allowed"
            )}
          >
            <CheckCircle2 size={20} />
            End Turn
          </button>
        </div>
      </div>

      {/* 2. Construction Section */}
      <div className="p-6 border-b border-slate-700">
        <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
          <Hammer size={12} /> Construction
        </h3>
        
        <div className="grid grid-cols-1 gap-2">
          <BuildButton icon={<Waypoints size={16} />} label="Build Road" cost="1 Wood, 1 Brick" disabled={!canEndTurn} />
          <BuildButton icon={<Landmark size={16} />} label="Settlement" cost="1 Wood, 1 Brick, 1 Sheep, 1 Wheat" disabled={!canEndTurn} />
        </div>
      </div>
    </div>
  );
}

// Internal helper for UI consistency
function BuildButton({ icon, label, cost, disabled }: { icon: React.ReactNode; label: string; cost: string; disabled: boolean }) {
  return (
    <button 
      disabled={disabled}
      className="group w-full p-3 bg-slate-700/30 hover:bg-slate-700 border border-slate-600 rounded-lg text-left transition-all disabled:opacity-40 disabled:hover:bg-transparent"
    >
      <div className="flex items-center gap-3">
        <div className="p-2 bg-slate-800 rounded group-hover:text-amber-400 transition-colors">
          {icon}
        </div>
        <div>
          <div className="text-sm font-semibold">{label}</div>
          <div className="text-[10px] text-slate-500">{cost}</div>
        </div>
      </div>
    </button>
  );
}