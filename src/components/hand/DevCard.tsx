import { clsx } from "clsx";
import { Lock, Play } from "lucide-react";
import type { DevelopmentCardType } from "@/types/catan";
import { DEV_CARD_INFO } from "@/lib/game/helpers/devCardInfo";
import { HAND_CARD_SIZE } from "./ResourceCard";

interface DevCardProps {
  type: DevelopmentCardType;
  /** How many of this card the player holds in this state. Always >= 1. */
  count: number;
  /**
   * Why this card cannot be played right now, or null when nothing is blocking it. The
   * wording is shown on the card, so the player is never left guessing why one is inert.
   */
  lockReason: string | null;
  /**
   * Absent for a card that is never played at all. A Victory Point card is scored the
   * moment it is bought and `PLAY_DEV_CARD` ignores it, so it is not locked — it simply
   * has no action.
   */
  onPlay?: () => void;
}

/**
 * Each card type gets its own ground, ink and emblem, so a hand reads at a glance.
 * Emblems are 24-unit Lucide glyph paths, drawn large.
 */
const DEV_CARD_STYLE: Record<
  DevelopmentCardType,
  { label: string; ink: string; from: string; to: string; border: string; paths: string[] }
> = {
  knight: {
    label: 'KNIGHT', ink: '#fca5a5', from: '#4a1a22', to: '#1a0b12', border: '#8a3340',
    paths: ['M14.5 17.5 3 6V3h3l11.5 11.5', 'm13 19 6-6', 'm16 16 4 4', 'm19 21 2-2', 'M14.5 6.5 18 3h3v3l-3.5 3.5', 'm5 14 4 4', 'm7 17-3 3', 'm3 19 2 2'],
  },
  victoryPoint: {
    label: 'VICTORY POINT', ink: '#fcd34d', from: '#4a3a12', to: '#1c1508', border: '#8a6d24',
    paths: ['M6 9H4.5a2.5 2.5 0 0 1 0-5H6', 'M18 9h1.5a2.5 2.5 0 0 0 0-5H18', 'M4 22h16', 'M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22', 'M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22', 'M18 2H6v7a6 6 0 0 0 12 0V2Z'],
  },
  monopoly: {
    label: 'MONOPOLY', ink: '#d8b4fe', from: '#36184f', to: '#140a22', border: '#6b3a94',
    paths: ['m6 15-4-4 6.75-6.77a7.79 7.79 0 0 1 11 11L13 22l-4-4 6.39-6.36a2.14 2.14 0 0 0-3-3L6 15', 'm5 8 4 4', 'm12 15 4 4'],
  },
  roadBuilding: {
    label: 'ROAD BUILDING', ink: '#86efac', from: '#123d26', to: '#08180f', border: '#2f7a4c',
    paths: ['M4 19 10 5', 'M14 5l6 14', 'M12 6v2', 'M12 11v2', 'M12 16v2'],
  },
  yearOfPlenty: {
    label: 'YEAR OF PLENTY', ink: '#7dd3fc', from: '#0f3a52', to: '#071824', border: '#2a6f94',
    paths: ['M3 8h18v4H3z', 'M12 8v13', 'M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7', 'M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5'],
  },
};

/** The card's own art: name, rule, emblem. Everything status-related is drawn in HTML. */
function CardArt({ type }: { type: DevelopmentCardType }) {
  const s = DEV_CARD_STYLE[type];
  return (
    <svg viewBox="0 0 100 142" className="absolute inset-0 h-full w-full" aria-hidden>
      <text
        x={50}
        y={20}
        textAnchor="middle"
        fill={s.ink}
        fontSize={10}
        fontWeight={800}
        letterSpacing={0.3}
        textLength={s.label.length > 10 ? 86 : undefined}
        lengthAdjust="spacingAndGlyphs"
      >
        {s.label}
      </text>
      <line x1={22} y1={27} x2={78} y2={27} stroke={s.ink} strokeOpacity={0.35} strokeWidth={1} />
      <circle cx={50} cy={68} r={30} fill={s.ink} fillOpacity={0.08} stroke={s.ink} strokeOpacity={0.3} strokeWidth={1} />
      <g
        transform="translate(29 47) scale(1.75)"
        fill="none"
        stroke={s.ink}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {s.paths.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
    </svg>
  );
}

/**
 * One development card type in the hand, face up: a single card carrying the count, not
 * `count` separate cards, the same way a resource does.
 *
 * Three states: playable, locked this turn, or scoring-only (Victory Point). "Locked" is
 * not new state: it is `devCards.boughtThisTurn`, `hasPlayedDevCardThisTurn` and whose
 * turn it is, resolved into a sentence by the caller.
 */
export function DevCard({ type, count, lockReason, onPlay }: DevCardProps) {
  const info = DEV_CARD_INFO[type];
  const style = DEV_CARD_STYLE[type];
  const locked = lockReason !== null;
  const playable = !locked && onPlay !== undefined;

  const face = (
    <>
      <CardArt type={type} />
      <span
        data-cy="hand-dev-card-count"
        className="absolute right-1.5 bottom-[26px] flex h-[22px] min-w-[22px] items-center justify-center rounded-[5px] bg-[rgba(6,14,28,0.5)] px-[5px] text-[15px] font-extrabold text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.9)]"
      >
        {count}
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
        {!playable && !locked && (
          <span style={{ color: style.ink }} className="truncate">Counted</span>
        )}
      </span>
    </>
  );

  const faceClasses = clsx(
    "relative block overflow-hidden rounded-lg border-2 p-0 shadow-[0_10px_24px_rgba(2,8,18,0.5)]",
    HAND_CARD_SIZE,
    playable && "cursor-pointer transition-transform duration-150 hover:-translate-y-1.5",
    locked && "opacity-55"
  );

  const faceStyle = {
    borderColor: playable ? '#4da3ff' : style.border,
    background: `radial-gradient(120% 90% at 50% 42%, ${style.from} 0%, ${style.to} 72%)`,
  };

  return (
    <div
      data-cy="hand-dev-card"
      data-card-type={type}
      data-count={count}
      data-playable={playable}
      data-locked={locked}
      className="shrink-0"
      title={`${info.name} ×${count} — ${info.description}${lockReason ? ` (${lockReason})` : ''}`}
    >
      {playable ? (
        <button
          type="button"
          data-cy="play-dev-card-btn"
          onClick={onPlay}
          className={faceClasses}
          style={faceStyle}
          aria-label={`Play ${info.name}`}
        >
          {face}
        </button>
      ) : (
        <div className={faceClasses} style={faceStyle} aria-label={info.name}>
          {face}
        </div>
      )}
    </div>
  );
}
