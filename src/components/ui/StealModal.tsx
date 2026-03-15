import { Player } from "@/types/catan";
import { Users } from "lucide-react";

interface StealModalProps {
  victims: number[];
  players: Player[];
  onSelect: (victimId: number) => void;
}

export function StealModal({ victims, players, onSelect }: StealModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl shadow-2xl max-w-sm w-full flex flex-col gap-4">
        <h2 className="text-xl font-bold text-white text-center">Select Victim</h2>
        <p className="text-sm text-slate-400 text-center mb-2">
          Choose a player to steal a random resource from.
        </p>
        
        <div className="flex flex-col gap-2">
          {victims.map(victimId => {
            const p = players[victimId];
            return (
              <button
                key={victimId}
                onClick={() => onSelect(victimId)}
                className="flex items-center justify-between p-4 rounded-lg bg-slate-900 border border-slate-700 hover:bg-slate-700 hover:border-slate-500 transition-all group"
              >
                <span className="font-bold flex items-center gap-2" style={{ color: p.color }}>
                  <Users size={18} /> Player {victimId + 1}
                </span>
                <span className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-300 group-hover:text-white">
                  Steal
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}