import { Trophy, LogOut } from 'lucide-react';
import { Player } from '@/types/catan';

interface GameOverModalProps {
  winnerId: number;
  players: Player[];
  onLeaveRoom: () => void;
}

export function GameOverModal({ winnerId, players, onLeaveRoom }: GameOverModalProps) {
  const winner = players.find(p => p.id === winnerId);

  if (!winner) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100]">
      <div className="bg-slate-900 p-8 rounded-2xl border-2 border-amber-500 shadow-2xl shadow-amber-500/20 max-w-md w-full text-center flex flex-col items-center gap-6">
        
        <div className="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center border border-amber-500">
          <Trophy size={40} className="text-amber-500" />
        </div>

        <div>
          <h1 className="text-3xl font-black text-white mb-2 uppercase tracking-widest">
            Game Over
          </h1>
          <p className="text-lg text-slate-300">
            Player {winnerId + 1} has won the game with{' '}
            <span className="font-bold text-amber-400">{winner.victoryPoints} VP</span>!
          </p>
        </div>

        <div className="w-full h-[1px] bg-slate-800" />

        <button
          onClick={onLeaveRoom}
          className="w-full bg-red-600 hover:bg-red-500 text-white py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
        >
          <LogOut size={20} /> Leave Game
        </button>
      </div>
    </div>
  );
}