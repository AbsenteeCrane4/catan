import { clsx } from "clsx";

interface CardBackProps {
  /** Extra classes for size; the default matches a resource card face. */
  className?: string;
}

/**
 * A face-down card.
 *
 * Nothing in the bottom HUD shows a card back — the player's own hand is always face up.
 * It lives here because the opponent panels in #56 need exactly this face for the counts
 * they render, and a second hand-drawn version of it would drift from this one.
 */
export function CardBack({ className }: CardBackProps) {
  return (
    <div
      data-cy="card-back"
      aria-hidden
      className={clsx(
        "relative overflow-hidden rounded-lg border border-slate-950/80 bg-slate-900",
        "shadow-[0_2px_6px_rgba(2,6,23,0.55)] ring-1 ring-inset ring-white/10",
        className ?? "h-[106px] w-[74px]"
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,#1e3a5f_0%,#0f2038_60%,#0a1526_100%)]" />
      <div className="absolute inset-[5px] rounded-[5px] border border-amber-200/25" />
      <svg viewBox="0 0 40 40" className="absolute inset-0 m-auto h-1/2 w-1/2 text-amber-200/45">
        <path d="M20 3 L24 16 L37 20 L24 24 L20 37 L16 24 L3 20 L16 16 Z" fill="currentColor" />
        <circle cx="20" cy="20" r="3.2" className="fill-slate-900" />
      </svg>
    </div>
  );
}
