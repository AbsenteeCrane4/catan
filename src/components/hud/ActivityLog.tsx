import { Clock } from "lucide-react";
import type { PlayerView } from "@/types/catan";
import { PLAYER_TEXT_CSS } from "@/lib/constants";
import { playerName } from "@/lib/game/helpers/playerName";

const NEUTRAL = '#8ba3c0';

/**
 * The game log, newest first (the reducer already prepends).
 *
 * Each entry gets a rule and a name in the actor's colour. The actor is parsed off the
 * front of the line rather than carried as data, so the log stays the plain strings the
 * reducer writes. Longest name wins, so "Ann" never claims a line by "Anna".
 */
export function ActivityLog({ log, players }: { log: string[]; players: PlayerView[] }) {
  const named = players
    .map((p, i) => ({ name: playerName(p, i), color: PLAYER_TEXT_CSS[p.color] ?? NEUTRAL }))
    .sort((a, b) => b.name.length - a.name.length);

  return (
    <aside data-cy="activity-log" className="hs-panel hs-scroll min-h-[180px] flex-1 overflow-y-auto">
      <div className="sticky top-0 z-[1] flex items-center gap-[11px] border-b border-[rgba(110,160,220,0.16)] bg-[rgba(11,24,42,0.97)] px-4 py-3.5">
        <Clock size={18} className="text-hs-accent" />
        <h2 className="text-[13px] font-bold uppercase tracking-[0.13em] text-hs-text">Activity</h2>
      </div>

      {/* `custom-scrollbar > div` is one row per entry. */}
      <div className="custom-scrollbar flex flex-col px-4 pt-1.5 pb-3.5">
        {log.map((text, i) => {
          const actor = named.find(p => text.startsWith(p.name + ' ') || text === p.name);
          const color = actor?.color ?? NEUTRAL;
          return (
            <div
              key={log.length - i}
              className="flex gap-[9px] border-b border-[rgba(110,160,220,0.07)] py-[7px] text-[13px] leading-[1.4]"
            >
              <span className="w-[3px] shrink-0 rounded-sm" style={{ background: color }} />
              <span className="min-w-0 break-words text-hs-dim">
                {actor ? (
                  <>
                    <span className="font-bold" style={{ color }}>{actor.name}</span>
                    {text.slice(actor.name.length)}
                  </>
                ) : (
                  text
                )}
              </span>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
