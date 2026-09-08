import { pieceShades } from "@/lib/constants";

/** Walls, then an overhanging gable roof. Drawn once, reused as the outline. */
const SILHOUETTE = "M-9 7.5 L-9 -0.6 L-11.6 -0.6 L-4.2 -7.2 L-4.2 -10 L-1.6 -10 L-1.6 -9.5 L0 -11 L11.6 -0.6 L9 -0.6 L9 7.5 Z";

/**
 * A settlement as a moulded game piece rather than a flat glyph (`docs/DESIGN.md` §13).
 *
 * Drawn to the same shape as the three.js house that lands on the board, so the piece in
 * the build panel is the piece the player is about to place. The dark silhouette
 * underneath everything is what makes it survive on a board full of painted terrain when
 * the flat fallback is in use; the roof is the lightest face and overhangs the walls, so
 * a settlement is told apart from a road end by shape alone.
 *
 * One `<g>` around the origin with its base on y = 7.5 — the board stands it up as a
 * billboard, the build panel shows the same shape at 28px.
 */
export function SettlementIcon({ color }: { color: string }) {
  const c = pieceShades(color);

  return (
    <g className="transition-all duration-300">
      <path
        d={SILHOUETTE}
        fill={c.edge}
        stroke={c.edge}
        strokeWidth="2.6"
        strokeLinejoin="round"
      />

      {/* Walls: lit front, shaded return on the right. */}
      <path d="M-8.2 6.9 L-8.2 -0.6 L8.2 -0.6 L8.2 6.9 Z" fill={c.base} />
      <path d="M-8.2 6.9 L-8.2 -0.6 L-1.4 -0.6 L-1.4 6.9 Z" fill={c.top} opacity="0.4" />
      <path d="M4.2 -0.6 L8.2 -0.6 L8.2 6.9 L4.2 6.9 Z" fill={c.side} />
      <path d="M-2.3 6.9 L-2.3 2.4 Q0 1 2.3 2.4 L2.3 6.9 Z" fill={c.edge} opacity="0.72" />

      {/* Chimney, matching the three.js piece this stands in for. */}
      <path d="M-4.2 -7.2 L-4.2 -9.6 L-1.6 -9.6 L-1.6 -5 Z" fill={c.side} />

      {/* Roof, the lightest plane on the piece. */}
      <path d="M-10.6 -1.3 L0 -9.9 L10.6 -1.3 Z" fill={c.top} />
      <path d="M0 -9.9 L10.6 -1.3 L3.6 -1.3 Z" fill={c.base} />
    </g>
  );
}
