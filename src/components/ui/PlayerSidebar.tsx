import { Player, ResourceType } from "@/types/catan";
import { RESOURCE_COLORS } from "@/lib/constants";
import { Users } from "lucide-react";
import { clsx } from "clsx";

interface Props {
  players: Player[];
  currentPlayerIndex: number;
}

export function PlayerSidebar({ players, currentPlayerIndex }: Props) {
  return (
    <aside className="w-64 bg-slate-800/90 backdrop-blur border-r border-slate-700 p-4 flex flex-col gap-4 overflow-y-auto">
      {players.map((p, idx) => (
        <div 
          key={p.id}
          className={clsx(
            "p-3 rounded-lg border-2 transition-all duration-300",
            idx === currentPlayerIndex 
              ? "border-amber-400 bg-slate-700 shadow-lg" 
              : "border-transparent bg-slate-800/50"
          )}
        >
          <div className="flex justify-between items-center mb-2">
            <span className="font-bold flex items-center gap-2" style={{ color: p.color }}>
              <Users size={16} /> Player {idx + 1}
            </span>
            <span className="text-xs bg-slate-900 px-2 py-1 rounded">VP: {p.score}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs text-slate-300">
            {Object.entries(p.resources).map(([res, count]) => {
              if (res === 'desert') return null;
              return (
                <div key={res} className="flex flex-col items-center bg-slate-900/50 p-1 rounded">
                  <div className="w-3 h-3 rounded-full mb-1" style={{ backgroundColor: RESOURCE_COLORS[res as ResourceType] }} />
                  <span>{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </aside>
  );
}