import { pieceShades } from "@/lib/constants";

/** A low walled wing beside a towered keep. */
const SILHOUETTE = "M-12 8 L-12 -1.2 L-2.4 -1.2 L-2.4 -3.6 L3.4 -11 L9.2 -3.6 L9.2 8 Z";

/**
 * A city: told apart from a settlement by silhouette rather than by being the same house
 * drawn larger (`docs/DESIGN.md` §13).
 *
 * Same contract as `SettlementIcon` — a `<g>` around the origin with its base on y = 8,
 * a dark outline underneath so it holds up against the terrain, and the lightest planes
 * facing the same way as every other piece on the board.
 */
export function CityIcon({ color }: { color: string }) {
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

      {/* Wing: the lit block. */}
      <path d="M-11.2 7.3 L-11.2 -0.5 L-3.2 -0.5 L-3.2 7.3 Z" fill={c.top} />
      <path d="M-5.6 -0.5 L-3.2 -0.5 L-3.2 7.3 L-5.6 7.3 Z" fill={c.base} />

      {/* Keep, standing behind and above it. */}
      <path d="M-2.4 7.3 L-2.4 -2.9 L8.4 -2.9 L8.4 7.3 Z" fill={c.base} />
      <path d="M4.4 -2.9 L8.4 -2.9 L8.4 7.3 L4.4 7.3 Z" fill={c.side} />
      <path d="M-1.7 -3.5 L3.4 -10.2 L8.5 -3.5 Z" fill={c.top} />
      <path d="M3.4 -10.2 L8.5 -3.5 L3.4 -3.5 Z" fill={c.base} />

      {/* Windows, for scale. */}
      <g fill={c.edge} opacity="0.72">
        <rect x="-9.6" y="1.6" width="2.6" height="3.4" rx="0.6" />
        <rect x="-0.9" y="-1" width="2.6" height="3.4" rx="0.6" />
        <rect x="-0.9" y="3.6" width="2.6" height="3.4" rx="0.6" />
      </g>
    </g>
  );
}
