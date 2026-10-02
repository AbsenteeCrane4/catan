import { clsx } from "clsx";
import { Lock, Play } from "lucide-react";
import type { DevelopmentCardType } from "@/types/catan";
import { DEV_CARD_INFO } from "@/lib/game/helpers/devCardInfo";
import { HAND_CARD_SIZE } from "./ResourceCard";

interface DevCardProps {
  type: DevelopmentCardType;
  /**
   * Why this card cannot be played right now, or null when nothing is blocking it. The
   * wording is shown on the card, so the player is never left guessing why one is inert.
   */
  lockReason: string | null;
  /**
   * Absent for a card that is never played at all. A Victory Point card is scored at buy
   * time and `PLAY_DEV_CARD` ignores it, so it is not locked — it simply has no action.
   */
  onPlay?: () => void;
}

/** The development card face: a compass rose on deep navy. */
function CompassRose() {
  return (
    <svg viewBox="0 0 100 142" className="absolute inset-0 h-full w-full" aria-hidden>
      <circle cx={50} cy={71} r={31} fill="none" stroke="#cbb28a" strokeWidth={1} opacity={0.35} />
      <path d="M50 33 L56 65 L88 71 L56 77 L50 109 L44 77 L12 71 L44 65 Z" fill="#e3cfa2" opacity={0.9} />
      <path d="M27 48 L52 68 L73 94 L48 74 Z" fill="#e3cfa2" opacity={0.45} />
    </svg>
  );
}

/**
 * One development card, face up, in one of three states: playable, locked this turn, or
 * scoring-only.
 *
 * "Locked" is not a new piece of state: it is `devCards.boughtThisTurn`,
 * `hasPlayedDevCardThisTurn` and whose turn it is, resolved into a sentence by the
 * caller. This component only renders the resulting faces.
 */
export function DevCard({ type, lockReason, onPlay }: DevCardProps) {
  const info = DEV_CARD_INFO[type];
  const locked = lockReason !== null;
  const playable = !locked && onPlay !== undefined;

  const face = (
    <>
      <CompassRose />
      <span className="absolute inset-x-0 top-0 bg-gradient-to-b from-[rgba(6,14,28,0.85)] to-transparent px-1.5 pt-1.5 pb-4 text-center text-[11px] leading-tight font-bold text-hs-parchment">
        {info.name}
      </span>
      <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-[rgba(6,14,28,0.7)] px-1 py-1 text-[10px] font-bold uppercase tracking-wide">
        {playable && (
          <span className="flex items-center gap-1 text-hs-ok">
            <Play size={9} fill="currentColor" /> Play
          </span>
        )}
        {locked && (
          <span data-cy="dev-card-lock-reason" className="flex items-center gap-1 truncate text-hs-mute">
            <Lock size={9} /> {lockReason}
          </span>
        )}
        {!playable && !locked && <span className="truncate text-hs-parchment-2/80">Scores at end</span>}
      </span>
    </>
  );

  const faceClasses = clsx(
    "relative block overflow-hidden rounded-lg border-2 p-0 shadow-[0_10px_24px_rgba(2,8,18,0.5)]",
    "bg-[radial-gradient(120%_90%_at_50%_40%,#16395f_0%,#0a1c33_70%)]",
    HAND_CARD_SIZE,
    playable
      ? "cursor-pointer border-hs-accent transition-transform duration-150 hover:-translate-y-1.5"
      : "border-[#3c5a80]",
    locked && "opacity-60 saturate-50"
  );

  return (
    <div
      data-cy="hand-dev-card"
      data-card-type={type}
      data-playable={playable}
      data-locked={locked}
      className="shrink-0"
      title={lockReason ?? `${info.name} — ${info.description}`}
    >
      {playable ? (
        <button
          type="button"
          data-cy="play-dev-card-btn"
          onClick={onPlay}
          className={faceClasses}
          aria-label={`Play ${info.name}`}
        >
          {face}
        </button>
      ) : (
        <div className={faceClasses} aria-label={info.name}>
          {face}
        </div>
      )}
    </div>
  );
}
