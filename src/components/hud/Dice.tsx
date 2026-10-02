import { clsx } from "clsx";

const PIPS: Record<number, [number, number][]> = {
  1: [[31, 31]],
  2: [[17, 17], [45, 45]],
  3: [[17, 17], [31, 31], [45, 45]],
  4: [[17, 17], [45, 17], [17, 45], [45, 45]],
  5: [[17, 17], [45, 17], [31, 31], [17, 45], [45, 45]],
  6: [[17, 17], [45, 17], [17, 31], [45, 31], [17, 45], [45, 45]],
};

function Die({ face, rolled }: { face: number | null; rolled: boolean }) {
  return (
    <svg
      viewBox="0 0 62 62"
      className={clsx(
        "h-[50px] w-[50px] [@media(min-height:880px)]:h-[62px] [@media(min-height:880px)]:w-[62px]",
        rolled && "animate-dice-roll"
      )}
      aria-hidden
    >
      <rect
        x={2} y={2} width={58} height={58} rx={11}
        fill={face ? '#f4f6f8' : 'rgba(20,40,68,0.6)'}
        stroke={face ? '#c3ccd6' : 'rgba(110,160,220,0.35)'}
        strokeWidth={1.5}
        strokeDasharray={face ? undefined : '5 4'}
      />
      {face && <rect x={5} y={5} width={52} height={26} rx={8} fill="#ffffff" opacity={0.75} />}
      {face && PIPS[face].map(([cx, cy]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={4.6} fill="#22303f" />)}
    </svg>
  );
}

/**
 * The last roll as two dice.
 *
 * The game state records only the total, so the faces are one fair split of it — the
 * total is the number that matters and it is printed underneath.
 */
export function Dice({ total }: { total: number | null }) {
  const a = total ? Math.min(6, Math.ceil(total / 2)) : null;
  const b = total && a ? total - a : null;

  return (
    <div data-cy="dice" data-total={total ?? ''} className="flex flex-col items-center gap-2.5">
      {/* Keyed on the total so a new roll replays the tumble. */}
      <div key={total ?? 'none'} className="flex gap-3">
        <Die face={a} rolled={total !== null} />
        <Die face={b} rolled={total !== null} />
      </div>
      <span className="text-[14px] text-hs-dim">
        Total: <span className="font-bold text-white">{total ?? '–'}</span>
      </span>
    </div>
  );
}
