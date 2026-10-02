import { clsx } from "clsx";
import { Crown, Layers, Shield, Users } from "lucide-react";
import type { GameStateView, ResourceType } from "@/types/catan";
import { isRevealed } from "@/lib/game/helpers/playerView";
import { playerName } from "@/lib/game/helpers/playerName";
import { devCardName } from "@/lib/game/helpers/devCardInfo";
import { PLAYER_COLOR_CSS, PLAYER_TEXT_CSS, RESOURCE_TYPES } from "@/lib/constants";
import { PanelHeader, ResourceChip } from "./primitives";

/**
 * Every seat at the table: score, public counts, and who holds the two awards.
 *
 * Opponents are face-down counts, because a count is genuinely all this client is sent.
 * Our own cards are the hand bar's job, so our row carries the total only. Once the game
 * is over the server reveals every hand, and those rows show the cards.
 */
export function PlayersPanel({ state }: { state: GameStateView }) {
  const me = state.viewerSeatIndex;

  return (
    <section data-cy="players-panel" className="hs-panel shrink-0 overflow-hidden">
      <PanelHeader icon={<Users size={20} />} title="Players" />

      <ul className="flex flex-col gap-2 p-3">
        {state.players.map((p, idx) => {
          const isMe = idx === me;
          const isTurn = idx === state.currentPlayerIndex;
          const hand = !isMe && isRevealed(p) ? p : null;
          const name = playerName(p, idx);
          const longest = state.longestRoad.playerId === idx;

          return (
            <li
              key={p.id}
              data-cy="sidebar-player"
              data-player-id={p.id}
              data-player-color={p.color}
              data-current-turn={isTurn}
              className={clsx(
                "rounded-[10px] border px-3 py-2.5",
                isTurn
                  ? "border-[rgba(77,163,255,0.55)] bg-[rgba(45,86,140,0.4)]"
                  : "border-[rgba(110,160,220,0.16)] bg-[rgba(20,40,68,0.5)]"
              )}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="h-[18px] w-[18px] shrink-0 rounded-full shadow-[0_0_0_1px_rgba(255,255,255,0.18)]"
                  style={{ background: PLAYER_COLOR_CSS[p.color] }}
                />
                <span className="min-w-0 flex-1 truncate text-[14px] font-semibold" style={{ color: PLAYER_TEXT_CSS[p.color] }}>
                  {name}
                </span>
                {isMe && (
                  <span className="rounded-[5px] bg-hs-accent px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-hs-abyss">
                    You
                  </span>
                )}
                <span
                  data-cy="player-vp"
                  title="Victory points"
                  className="rounded-[5px] bg-[rgba(8,18,34,0.7)] px-2 py-0.5 text-[12px] font-extrabold tabular-nums text-hs-parchment"
                >
                  {p.victoryPoints} VP
                </span>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-hs-mute">
                {isMe ? (
                  <span data-cy="own-hand-summary" className="flex items-center gap-1">
                    <span className="font-bold text-hs-dim">{p.resourceCount}</span>
                    {p.resourceCount === 1 ? 'card' : 'cards'}
                  </span>
                ) : hand ? (
                  <span data-cy="own-resources" className="flex items-center gap-1.5">
                    {RESOURCE_TYPES.map((res: ResourceType) => (
                      <span key={res} data-cy="own-resource" data-resource={res} className="flex items-center gap-0.5">
                        <ResourceChip resource={res} size={16} />
                        <span className={hand.resources[res] > 0 ? "font-bold text-hs-text" : ""}>{hand.resources[res]}</span>
                      </span>
                    ))}
                  </span>
                ) : (
                  <span data-cy="hidden-hand" className="flex items-center gap-1.5" title="Resource cards in hand">
                    <span className="flex -space-x-1.5" aria-hidden>
                      {Array.from({ length: Math.min(p.resourceCount, 5) }).map((_, i) => (
                        <span key={i} className="h-4 w-3 rounded-[2px] border border-[#3c5a80] bg-[#16395f]" />
                      ))}
                    </span>
                    <span data-cy="hidden-resource-count" className="font-bold text-hs-dim">{p.resourceCount}</span>
                    {p.resourceCount === 1 ? 'card' : 'cards'}
                  </span>
                )}

                {!isMe && p.devCardCount > 0 && (
                  <span data-cy="player-devcard-count" className="flex items-center gap-1" title="Development cards">
                    <Layers size={13} /> {p.devCardCount}
                  </span>
                )}
                <span className={clsx("flex items-center gap-1", p.largestArmy && "text-hs-parchment")} title="Knights played">
                  <Shield size={13} /> {p.knightsPlayed}
                  {p.largestArmy && <Crown size={12} aria-label="Largest Army" />}
                </span>
                <span className={clsx("flex items-center gap-1", longest && "text-hs-parchment")} title="Longest road">
                  <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" aria-hidden>
                    <path d="M4 19 20 5" />
                  </svg>
                  {p.longestRoadLength}
                  {longest && <Crown size={12} aria-label="Longest Road" />}
                </span>
              </div>

              {/* An opponent's dev cards, once the game is over and the server revealed them. */}
              {hand && (hand.devCards.playable.length > 0 || hand.devCards.boughtThisTurn.length > 0) && (
                <div className="mt-2 flex flex-wrap gap-1 border-t border-[rgba(110,160,220,0.1)] pt-2">
                  {[...hand.devCards.playable, ...hand.devCards.boughtThisTurn].map((card, i) => (
                    <span key={i} data-cy="dev-card" className="rounded-[5px] bg-[rgba(8,18,34,0.7)] px-1.5 py-0.5 text-[11px] font-semibold text-hs-parchment-2">
                      {devCardName(card)}
                    </span>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
