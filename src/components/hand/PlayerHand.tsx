'use client';

import { useState } from "react";
import { clsx } from "clsx";
import { UserRound } from "lucide-react";
import type { AnyCardArgs, DevelopmentCardType, GameStateView } from "@/types/catan";
import { ownHand } from "@/lib/game/helpers/playerView";
import { playerName } from "@/lib/game/helpers/playerName";
import { isPlayableCardType } from "@/lib/game/helpers/devCardInfo";
import { PLAYER_COLOR_CSS, RESOURCE_TYPES } from "@/lib/constants";
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

const DEV_CARD_ORDER: DevelopmentCardType[] = ['knight', 'victoryPoint', 'monopoly', 'roadBuilding', 'yearOfPlenty'];

/**
 * The viewing seat's own hand: identity, then the cards, inside the bottom hand bar.
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
  // One card per type and state, carrying a count. A Victory Point card is counted the
  // moment it is bought, so it is never "bought this turn" in the player's eyes: both
  // lists fold into one card, which is how a player sees how many they ended up with.
  const tally = (types: DevelopmentCardType[]) =>
    types.reduce<Partial<Record<DevelopmentCardType, number>>>((m, t) => ({ ...m, [t]: (m[t] ?? 0) + 1 }), {});
  const heldDev = tally([
    ...hand.devCards.playable,
    ...hand.devCards.boughtThisTurn.filter(t => t === 'victoryPoint'),
  ]);
  const fresh = tally(hand.devCards.boughtThisTurn.filter(t => t !== 'victoryPoint'));
  const devCards = [
    ...DEV_CARD_ORDER.filter(type => heldDev[type]).map(type => ({ type, count: heldDev[type]!, boughtThisTurn: false })),
    ...DEV_CARD_ORDER.filter(type => fresh[type]).map(type => ({ type, count: fresh[type]!, boughtThisTurn: true })),
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
      <div data-cy="player-hand" className="flex min-w-0 flex-1 items-center">
        {/* Identity: colour comes from player.color, never from the seat index. */}
        <div data-cy="hand-identity" className="flex shrink-0 items-center gap-3.5 pr-6">
          <span
            data-cy="hand-player-swatch"
            data-player-color={hand.color}
            className="flex h-[58px] w-[58px] items-center justify-center rounded-full shadow-[0_0_0_2px_rgba(150,200,255,0.3)]"
            style={{ background: PLAYER_COLOR_CSS[hand.color] }}
          >
            <UserRound size={30} className="text-hs-abyss" fill="currentColor" strokeWidth={0} aria-hidden />
          </span>
          <div className="flex min-w-0 max-w-[140px] flex-col gap-[3px]">
            <p className="truncate text-[19px] font-bold text-hs-text">{playerName(hand, hand.id)}</p>
            <p
              data-cy="hand-total"
              data-total={total}
              className={clsx(
                "text-[13px]",
                total > DISCARD_THRESHOLD ? "font-semibold text-amber-400" : "text-hs-mute"
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

        <span className="h-[110px] w-px shrink-0 bg-[rgba(110,160,220,0.16)]" aria-hidden />

        {/* min-w-0 is what makes the overflow scroll rather than widening the page:
            a flex child will not shrink below its content without it. The vertical
            padding leaves room for a card's hover lift inside the scroll box. */}
        <div className="hs-scroll flex min-w-0 flex-1 items-center gap-3 overflow-x-auto px-6 py-2.5">
          {/* One card per resource type held; the count lives on the badge. */}
          <div data-cy="hand-resources" className="flex items-center gap-3">
            {held.map(resource => (
              <ResourceCard
                key={resource}
                resource={resource}
                count={hand.resources[resource]}
                justGained={justGained.includes(resource)}
              />
            ))}
            {held.length === 0 && (
              <p data-cy="hand-empty" className="text-[13px] italic text-hs-mute">
                No resource cards
              </p>
            )}
          </div>

          {devCards.length > 0 && (
            <div data-cy="hand-dev-cards" className="flex items-center gap-3">
              {devCards.map((card, i) => {
                const lockReason = lockReasonFor(card);
                return (
                  <DevCard
                    key={`${card.type}-${card.boughtThisTurn ? 'new' : 'held'}-${i}`}
                    type={card.type}
                    count={card.count}
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
          )}
        </div>
      </div>

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
