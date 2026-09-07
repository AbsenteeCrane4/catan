'use client';

import { useState } from "react";
import { clsx } from "clsx";
import type { AnyCardArgs, DevelopmentCardType, GameStateView } from "@/types/catan";
import { ownHand } from "@/lib/game/helpers/playerView";
import { playerName } from "@/lib/game/helpers/playerName";
import { isPlayableCardType } from "@/lib/game/helpers/devCardInfo";
import { PLAYER_COLOR_CLASSES, RESOURCE_TYPES } from "@/lib/constants";
import { DevCardModal } from "@/components/ui/DevCardModal";
import { ResourceCard } from "./ResourceCard";
import { DevCard } from "./DevCard";
import { useResourceGain } from "./useResourceGain";

interface PlayerHandProps {
  state: GameStateView;
  onPlayDevCard: (cardType: DevelopmentCardType, cardArgs?: AnyCardArgs) => void;
  /** Cards that are resolved by clicking the board rather than in a modal. */
  onInitiateMapCard: (cardType: 'roadBuilding') => void;
}

/** Discarding starts above this many cards on a 7, which is why the total is on screen. */
const DISCARD_THRESHOLD = 7;

/**
 * The viewing seat's own hand, along the bottom of the screen.
 *
 * It renders from `ownHand`, so it is drawn only where the server actually sent a hand:
 * the viewer's own seat. A spectator has no seat, gets no `resources`, and therefore
 * gets no hand at all rather than an empty one.
 */
export function PlayerHand({ state, onPlayDevCard, onInitiateMapCard }: PlayerHandProps) {
  const hand = ownHand(state);
  const [activeCardPrompt, setActiveCardPrompt] = useState<DevelopmentCardType | null>(null);
  // Called before the spectator bail-out below: hooks cannot be conditional.
  const justGained = useResourceGain(hand?.resources ?? null);

  if (!hand) return null;

  const isMyTurn = state.currentPlayerIndex === hand.id;
  const held = RESOURCE_TYPES.filter(r => hand.resources[r] > 0);
  const total = RESOURCE_TYPES.reduce((sum, r) => sum + hand.resources[r], 0);

  // playable and boughtThisTurn are the reducer's own split; the UI reports it rather
  // than maintaining a second idea of which cards are usable.
  const devCards = [
    ...hand.devCards.playable.map(type => ({ type, boughtThisTurn: false })),
    ...hand.devCards.boughtThisTurn.map(type => ({ type, boughtThisTurn: true })),
  ];

  const lockReasonFor = (card: { type: DevelopmentCardType; boughtThisTurn: boolean }): string | null => {
    if (!isPlayableCardType(card.type)) return null;
    if (card.boughtThisTurn) return 'Bought this turn';
    if (!isMyTurn) return 'Not your turn';
    if (state.hasPlayedDevCardThisTurn) return 'One card per turn';
    return null;
  };

  const handleInitiatePlay = (card: DevelopmentCardType) => {
    if (card === 'monopoly' || card === 'yearOfPlenty') {
      setActiveCardPrompt(card);
    } else if (card === 'roadBuilding') {
      onInitiateMapCard(card);
    } else {
      onPlayDevCard(card);
    }
  };

  const handleModalSubmit = (cardArgs: AnyCardArgs) => {
    if (!activeCardPrompt) return;
    onPlayDevCard(activeCardPrompt, cardArgs);
    setActiveCardPrompt(null);
  };

  return (
    <>
      <footer
        data-cy="player-hand"
        className="shrink-0 border-t border-white/10 bg-slate-950/85 px-4 py-3 backdrop-blur"
      >
        <div className="flex items-center gap-5">
          {/* Identity: colour comes from player.color, never from the seat index. */}
          <div data-cy="hand-identity" className="flex w-40 shrink-0 items-center gap-3">
            <span
              data-cy="hand-player-swatch"
              data-player-color={hand.color}
              className={clsx(
                "h-9 w-9 rounded-full border-2 border-white/20 shadow-inner",
                PLAYER_COLOR_CLASSES[hand.color]
              )}
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-white">{playerName(hand, hand.id)}</p>
              <p
                data-cy="hand-total"
                data-total={total}
                className={clsx(
                  "text-[11px] font-semibold",
                  total > DISCARD_THRESHOLD ? "text-amber-400" : "text-slate-400"
                )}
                title={
                  total > DISCARD_THRESHOLD
                    ? 'Over 7 cards — you discard half on a roll of 7'
                    : undefined
                }
              >
                {total} {total === 1 ? 'card' : 'cards'}
              </p>
            </div>
          </div>

          {/* min-w-0 is what makes the overflow scroll rather than widening the page:
              a flex child will not shrink below its content without it. */}
          <div className="flex min-w-0 flex-1 items-center gap-5 overflow-x-auto pb-1">
            {/* One card per resource type held; the count lives on the badge. */}
            <div data-cy="hand-resources" className="flex items-center gap-2">
              {held.map(resource => (
                <ResourceCard
                  key={resource}
                  resource={resource}
                  count={hand.resources[resource]}
                  justGained={justGained.includes(resource)}
                />
              ))}
              {held.length === 0 && (
                <p data-cy="hand-empty" className="text-xs italic text-slate-500">
                  No resource cards
                </p>
              )}
            </div>

            {devCards.length > 0 && (
              <>
                <span className="h-16 w-px shrink-0 bg-white/10" aria-hidden />
                <div data-cy="hand-dev-cards" className="flex items-center gap-2">
                  {devCards.map((card, i) => {
                    const lockReason = lockReasonFor(card);
                    return (
                      <DevCard
                        key={`${card.type}-${card.boughtThisTurn ? 'new' : 'held'}-${i}`}
                        type={card.type}
                        lockReason={lockReason}
                        onPlay={
                          isPlayableCardType(card.type) && lockReason === null
                            ? () => handleInitiatePlay(card.type)
                            : undefined
                        }
                      />
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </footer>

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
