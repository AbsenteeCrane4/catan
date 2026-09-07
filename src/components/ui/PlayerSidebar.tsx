import { playerName } from "@/lib/game/helpers/playerName";
import { PlayerView, ResourceType } from "@/types/catan";
import { isRevealed } from "@/lib/game/helpers/playerView";
import { devCardName } from "@/lib/game/helpers/devCardInfo";
import { RESOURCE_COLORS } from "@/lib/constants";
import { Users, Dice5, ChevronRight, Layers, Shield } from "lucide-react";
import { clsx } from "clsx";
import { DiceRoll } from "./DiceRoll"; // Import your animation component
import { Road } from "./Road"; // Import the Road icon component

interface Props {
  players: PlayerView[];
  currentPlayerIndex: number;
  /** null for a spectator — no seat is ever "you". */
  myPlayerIndex: number | null;
  diceRoll: number | null;
  longestRoad: { playerId: number | null; length: number };
  onRoll: () => void;
  onEndTurn: () => void;
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

export function PlayerSidebar({
  players,
  currentPlayerIndex,
  myPlayerIndex,
  diceRoll,
  longestRoad,
  onRoll,
  onEndTurn,
}: Props) {
  const isMyTurn = currentPlayerIndex === myPlayerIndex;

  // Derive the current holder of the Largest Army
  const largestArmyHolder = players.find(p => p.largestArmy);

  return (
    <aside className="w-72 bg-slate-800/90 backdrop-blur border-r border-slate-700 p-4 flex flex-col gap-4 min-h-0">

      {/* --- TURN CONTROLS SECTION --- */}
      <div className="bg-slate-900/50 p-4 rounded-xl border border-white/5 flex flex-col items-center gap-4 mb-2 shrink-0">
        <h3 data-cy="turn-indicator" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
          {isMyTurn ? "Your Turn" : `${playerName(players[currentPlayerIndex], currentPlayerIndex)}'s Turn`}
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
              data-cy="roll-dice-btn"
              className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-20 disabled:grayscale py-3 rounded-lg font-bold text-slate-900 transition-all flex items-center justify-center gap-2"
            >
              Roll Dice
            </button>
          ) : (
            <button
              disabled={!isMyTurn}
              onClick={onEndTurn}
              data-cy="end-turn-btn"
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-20 py-3 rounded-lg font-bold text-white transition-all flex items-center justify-center gap-2"
            >
              End Turn <ChevronRight size={18} />
            </button>
          )}
        </div>
      </div>

      <div className="h-[1px] bg-slate-700 w-full my-2" />

      {/* --- PLAYERS LIST --- */}
      <div className="space-y-3 flex-1 min-h-1 overflow-y-auto pr-1 ">
        {players.map((p, idx) => {
          const isMe = idx === myPlayerIndex;
          // Non-null only where the server chose to reveal: our own seat, or everyone
          // once the game is over. Everyone else is counts, and that is all we have.
          // Our own seat is deliberately excluded here: those cards are the bottom HUD's
          // job now, and drawing them twice leaves two hands to keep in step.
          const hand = !isMe && isRevealed(p) ? p : null;

          return (
            <div
              key={p.id}
              data-cy="sidebar-player"
              data-player-id={p.id}
              data-player-color={p.color}
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
                <span className="font-bold text-sm flex items-center gap-1" style={{ color: p.color }}>
                  <Users size={14} /> {playerName(p, idx)}
                </span>
                <div className="flex gap-1 items-center">
                  {/* Opponent Dev Card Count */}
                  {!isMe && p.devCardCount > 0 && (
                    <span
                      data-cy="player-devcard-count"
                      className="text-[10px] bg-purple-900/50 border border-purple-500/30 px-1.5 py-0.5 rounded flex items-center gap-1 text-purple-300"
                    >
                      <Layers size={15} /> {p.devCardCount}
                    </span>
                  )}
                  <span className="text-[10px] bg-slate-950 px-1 py-0.5 rounded text-slate-400 flex items-center gap-1">
                    <Shield size={10} className="text-red-400" /> {p.knightsPlayed}
                  </span>
                  <span className="text-[10px] bg-slate-950 px-1 py-0.5 rounded text-slate-400 flex items-center gap-1">
                    <Road color={playerColors[p.color]} /> {p.longestRoadLength}
                  </span>
                  <span className="text-[10px] bg-slate-950 px-1.5 py-0.5 rounded text-slate-400 flex items-center gap-1">VP: {p.victoryPoints}</span>
                </div>
              </div>

              {/* Resources. Types only where the server sent them; everyone else is a
                  face-down count, because a count is genuinely all this client knows.
                  Our own row carries the total only — the cards themselves are below. */}
              {isMe ? (
                <div
                  data-cy="own-hand-summary"
                  className="flex items-center gap-2 bg-slate-900/50 p-2 rounded border border-white/5 mb-2"
                >
                  <span className="text-[10px] font-bold text-slate-300">{p.resourceCount}</span>
                  <span className="text-[9px] uppercase tracking-wider text-slate-500">
                    {p.resourceCount === 1 ? 'card in hand' : 'cards in hand'}
                  </span>
                </div>
              ) : hand ? (
                <div data-cy="own-resources" className="grid grid-cols-5 gap-1 text-[10px] text-slate-300 mb-2">
                  {Object.entries(hand.resources).map(([res, count]) => (
                    <div
                      key={res}
                      data-cy="own-resource"
                      data-resource={res}
                      className="flex flex-col items-center bg-slate-900/50 p-1 rounded border border-white/5"
                    >
                      <div className="w-2 h-2 rounded-full mb-1" style={{ backgroundColor: RESOURCE_COLORS[res as ResourceType] }} />
                      <span className={count > 0 ? "text-white font-bold" : "text-slate-600"}>{count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  data-cy="hidden-hand"
                  className="flex items-center gap-2 bg-slate-900/50 p-2 rounded border border-white/5 mb-2"
                >
                  <div className="flex -space-x-2" aria-hidden>
                    {Array.from({ length: Math.min(p.resourceCount, 5) }).map((_, i) => (
                      <div key={i} className="w-3 h-4 rounded-[2px] bg-slate-700 border border-slate-600 shadow-sm" />
                    ))}
                  </div>
                  <span data-cy="hidden-resource-count" className="text-[10px] font-bold text-slate-300">
                    {p.resourceCount}
                  </span>
                  <span className="text-[9px] uppercase tracking-wider text-slate-500">
                    {p.resourceCount === 1 ? 'card' : 'cards'}
                  </span>
                </div>
              )}

              {/* An opponent's dev card faces, once the game is over and the server has
                  revealed them. Nothing is played from here — the only hand with play
                  controls is the viewer's own, in the bottom HUD. */}
              {hand && (hand.devCards.playable.length > 0 || hand.devCards.boughtThisTurn.length > 0) && (
                <div className="mt-2 pt-2 border-t border-slate-700/50 flex flex-col gap-1">
                  <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider mb-1">
                    Dev Cards
                  </span>

                  {[...hand.devCards.playable, ...hand.devCards.boughtThisTurn].map((card, i) => (
                    <div key={`revealed-${i}`} data-cy="dev-card" className="flex justify-between items-center bg-slate-900/50 p-1.5 rounded border border-purple-500/20">
                      <span className="text-[10px] text-purple-300 font-bold">{devCardName(card)}</span>
                    </div>
                  ))}
                </div>
              )}

            </div>
          );
        })}
      </div>

      {/* --- ACHIEVEMENTS BANNERS --- */}
      <div className="flex flex-col gap-2 mt-4 shrink-0">
        {longestRoad.playerId !== null && (
          <div className="bg-orange-600/20 border border-orange-500 text-orange-400 p-2 rounded text-xs font-bold text-center">
            👑 {playerName(players[longestRoad.playerId], longestRoad.playerId)} holds the Longest Road ({longestRoad.length})
          </div>
        )}
        {largestArmyHolder && (
          <div className="bg-red-600/20 border border-red-500 text-red-400 p-2 rounded text-xs font-bold text-center">
            ⚔️ {playerName(largestArmyHolder)} holds the Largest Army ({largestArmyHolder.knightsPlayed})
          </div>
        )}
      </div>
    </aside>
  );
}