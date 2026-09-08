import { pieceShades } from "@/lib/constants";

/**
 * A city: a crenellated hall, a keep and a corner tower, stepping upwards.
 *
 * Drawn to the same shape as the three.js city that lands on the board, so the piece in
 * the build panel is the piece the player is about to place. Told apart from a settlement
 * by silhouette rather than by being the same house drawn larger (`docs/DESIGN.md` §13).
 *
 * A `<g>` around the origin with its base on y = 8, and a dark outline under every block
 * so it holds up against the terrain when the flat fallback is in use.
 */
export function CityIcon({ color }: { color: string }) {
  const c = pieceShades(color);

  /** A wall with its battlements, as one outlined block plus merlons. */
  const wall = (x: number, w: number, top: number, merlons: number, lit: string) => {
    const gap = w / merlons;
    return (
      <g key={x}>
        <rect x={x} y={top} width={w} height={8 - top} fill={c.base} />
        <rect x={x} y={top} width={w * 0.45} height={8 - top} fill={lit} />
        {Array.from({ length: merlons }, (_, i) => (
          <rect
            key={i}
            x={x + i * gap + gap * 0.12}
            y={top - 2.6}
            width={gap * 0.62}
            height={3}
            fill={i === 0 ? lit : c.base}
          />
        ))}
      </g>
    );
  };

  return (
    <g className="transition-all duration-300" stroke={c.edge} strokeWidth="1.6" strokeLinejoin="round">
      {wall(-12, 11, 0, 3, c.top)}
      {wall(-1.5, 5.5, -4, 2, c.base)}
      {wall(4, 7, -9, 2, c.side)}
      <rect x="-8.6" y="3" width="2.8" height="3.4" rx="0.5" fill={c.edge} strokeWidth="0" />
      <rect x="0" y="-0.8" width="2.6" height="3.2" rx="0.5" fill={c.edge} strokeWidth="0" />
    </g>
  );
}
