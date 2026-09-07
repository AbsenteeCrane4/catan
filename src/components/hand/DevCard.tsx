import { clsx } from "clsx";
import { Lock, Play } from "lucide-react";
import type { DevelopmentCardType } from "@/types/catan";
import { DEV_CARD_INFO } from "@/lib/game/helpers/devCardInfo";
import { DevCardArt, devCardAccent } from "./DevCardArt";

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
  const accent = devCardAccent(type);
  const locked = lockReason !== null;
  const playable = !locked && onPlay !== undefined;

  const face = (
    <>
      <div
        aria-hidden
        className="absolute -right-3 -bottom-3 opacity-20"
        style={{ color: accent }}
      >
        <DevCardArt type={type} className="h-16 w-16" />
      </div>

      <div className="relative flex h-full flex-col gap-1 p-1.5 text-left">
        <div className="flex items-start gap-1">
          <span
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded"
            style={{ backgroundColor: accent }}
          >
            <DevCardArt type={type} className="h-4 w-4" />
          </span>
          <span className="text-[9px] font-black uppercase leading-[1.1] tracking-tight text-slate-100 xl:text-[10px]">
            {info.name}
          </span>
        </div>

        <p className="text-[8px] leading-[1.25] text-slate-300 xl:text-[9px]">{info.description}</p>

        <span className="mt-auto flex items-center gap-1 text-[8px] font-bold uppercase tracking-wide">
          {playable && (
            <span className="flex items-center gap-1 text-emerald-300">
              <Play size={8} fill="currentColor" /> Play
            </span>
          )}
          {locked && (
            <span
              data-cy="dev-card-lock-reason"
              className="flex items-center gap-1 truncate text-slate-400"
            >
              <Lock size={8} /> {lockReason}
            </span>
          )}
          {!playable && !locked && (
            <span className="truncate text-amber-200/70">Scores at the end</span>
          )}
        </span>
      </div>
    </>
  );

  const faceClasses = clsx(
    "relative h-[92px] w-[116px] overflow-hidden rounded-lg border-2 bg-slate-900/95 shadow-[0_4px_10px_rgba(2,6,23,0.6)]",
    "xl:h-[106px] xl:w-[132px]",
    playable && "cursor-pointer transition-transform duration-150 hover:-translate-y-1.5",
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
          style={{ borderColor: accent }}
          aria-label={`Play ${info.name}`}
        >
          {face}
        </button>
      ) : (
        <div
          className={faceClasses}
          style={{ borderColor: locked ? '#334155' : accent }}
          aria-label={info.name}
        >
          {face}
        </div>
      )}
    </div>
  );
}
