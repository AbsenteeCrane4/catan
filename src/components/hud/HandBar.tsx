import { ArrowLeftRight, Dices } from "lucide-react";
import type { AnyCardArgs, DevelopmentCardType, GameStateView } from "@/types/catan";
import { PlayerHand } from "@/components/hand/PlayerHand";
import { Dice } from "./Dice";

interface HandBarProps {
  state: GameStateView;
  onRoll: () => void;
  onEndTurn: () => void;
  onPlayDevCard: (cardType: DevelopmentCardType, cardArgs?: AnyCardArgs) => void;
  onInitiateMapCard: (cardType: 'roadBuilding') => void;
}

/**
 * The bottom band: your hand face up, the last roll, and the one primary turn action.
 *
 * A sibling of the board region rather than an overlay, so it can never cover the board.
 * A spectator still gets the bar — the dice are public — just with no hand and an inert
 * button.
 */
export function HandBar({ state, onRoll, onEndTurn, onPlayDevCard, onInitiateMapCard }: HandBarProps) {
  const seat = state.viewerSeatIndex;
  const isMyTurn = seat !== null && state.currentPlayerIndex === seat;
  const needsRoll = !state.diceRoll;

  return (
    <footer className="hs-bar relative z-20 flex shrink-0 items-center border-t border-[rgba(110,160,220,0.16)] px-[22px] py-3 font-hud text-hs-text [@media(min-height:880px)]:min-h-[196px]">
      {seat !== null ? (
        <PlayerHand state={state} onPlayDevCard={onPlayDevCard} onInitiateMapCard={onInitiateMapCard} />
      ) : (
        <p className="flex-1 text-[14px] text-hs-mute">You are watching this game.</p>
      )}

      <div className="mr-[22px] flex h-[112px] shrink-0 items-center rounded-xl border border-[rgba(110,160,220,0.16)] bg-[rgba(20,40,68,0.5)] px-[26px]">
        <Dice total={state.diceRoll} />
      </div>

      {needsRoll ? (
        <button
          type="button"
          data-cy="roll-dice-btn"
          disabled={!isMyTurn || state.phase !== 'main'}
          onClick={onRoll}
          className="hs-primary-btn flex shrink-0 cursor-pointer items-center justify-center gap-3 rounded-[11px] px-11 py-[26px] text-[19px] font-semibold"
        >
          <Dices size={22} />
          Roll Dice
        </button>
      ) : (
        <button
          type="button"
          data-cy="end-turn-btn"
          disabled={!isMyTurn}
          onClick={onEndTurn}
          className="hs-primary-btn flex shrink-0 cursor-pointer items-center justify-center gap-3 rounded-[11px] px-11 py-[26px] text-[19px] font-semibold"
        >
          <ArrowLeftRight size={22} />
          End Turn
        </button>
      )}
    </footer>
  );
}
