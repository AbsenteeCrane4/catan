import { GameNode, Harbour } from '@/types/catan';
import { HEX_SIZE, RESOURCE_COLORS } from '@/lib/constants';

interface HarbourLayerProps {
  harbours: Harbour[];
  /** Needed to anchor each pier to the two nodes the harbour actually trades from. */
  nodes: GameNode[];
}

/** How far off the coast the trading post sits. */
const DISTANCE_OUT = HEX_SIZE * 0.78;

const WOOD = '#8B5A2B';
const WOOD_DARK = '#4A2C14';
const WOOD_LIGHT = '#C08850';
const PARCHMENT = '#F3E3C3';

/**
 * Perceived brightness (ITU-R BT.601) picks legible text per resource fill —
 * wheat and sheep are bright enough to need dark text where wood, brick and ore
 * need light text.
 */
function textOn(background: string): string {
  const hex = background.replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b > 140 ? '#3B2412' : '#FFF8EC';
}

/**
 * Trading posts, built as part of the board rather than badges floating over it
 * (`docs/DESIGN.md` §16): a planked jetty out from each of the two tradeable corners, a
 * decked platform where they meet, and the ratio painted on a board mounted on it.
 *
 * Everything here stays flat on the board plane and foreshortens with the terrain, which
 * is what makes it read as built structure. Only `<line>` elements may run from a node to
 * the platform — the harbour spec identifies piers by exactly that, so planks and decking
 * are drawn as paths and rects.
 */
export function HarbourLayer({ harbours, nodes }: HarbourLayerProps) {
  const byId = new Map(nodes.map(n => [n.id, n]));

  return (
    <g id="harbour-layer">
      {harbours.map(harbour => {
        const [a, b] = harbour.nodeIds.map(id => byId.get(id));
        if (!a || !b) return null;

        // Outward normal of the coastal edge itself. `harbour.angle` is the radial ray
        // from the board centroid, which is only an approximation of "out to sea" — on
        // the off-centre expansion board it can sit noticeably off the edge's true
        // perpendicular. Using the normal keeps both planks the same length, and the
        // stored angle is still what disambiguates which side is water.
        const ex = b.pixelPos.x - a.pixelPos.x;
        const ey = b.pixelPos.y - a.pixelPos.y;
        const len = Math.hypot(ex, ey) || 1;

        let nx = -ey / len;
        let ny = ex / len;
        if (nx * Math.cos(harbour.angle) + ny * Math.sin(harbour.angle) < 0) {
          nx = -nx;
          ny = -ny;
        }

        const cx = harbour.x + nx * DISTANCE_OUT;
        const cy = harbour.y + ny * DISTANCE_OUT;

        const isGeneric = harbour.type === '3:1';
        // Compared inline rather than via `isGeneric` so the false branch narrows
        // PortResource to ResourceType — RESOURCE_COLORS has no '3:1' key.
        const fill = harbour.type === '3:1' ? PARCHMENT : RESOURCE_COLORS[harbour.type];

        return (
          <g
            key={harbour.id}
            className="pointer-events-none"
            data-cy="harbour"
            data-harbour-type={harbour.type}
          >
            {/* Two jetties, one to each tradeable corner. Three stacked round-capped
                strokes give a dark edge, a wood body and a grain highlight without
                needing a gradient. */}
            {[a, b].map(node => (
              <g key={node.id}>
                {[
                  { w: 9, c: WOOD_DARK, o: 1 },
                  { w: 6, c: WOOD, o: 1 },
                  { w: 1.5, c: WOOD_LIGHT, o: 0.5 },
                ].map(({ w, c, o }) => (
                  <line
                    key={w}
                    x1={node.pixelPos.x}
                    y1={node.pixelPos.y}
                    x2={cx}
                    y2={cy}
                    stroke={c}
                    strokeWidth={w}
                    strokeLinecap="round"
                    opacity={o}
                  />
                ))}
                <Planks
                  from={node.pixelPos}
                  to={{ x: cx, y: cy }}
                />
              </g>
            ))}

            <g transform={`translate(${cx}, ${cy})`}>
              {/* Decked platform: octagonal so it reads as built, not as a UI disc. */}
              <path
                d="M-8 -19 L8 -19 L19 -8 L19 8 L8 19 L-8 19 L-19 8 L-19 -8 Z"
                fill={WOOD}
                stroke={WOOD_DARK}
                strokeWidth="2.5"
              />
              <path
                d="M-15 -6 H15 M-15 0 H15 M-15 6 H15"
                stroke={WOOD_DARK}
                strokeWidth="1"
                opacity="0.45"
              />

              {/* Mooring posts at the corners give the platform some height. */}
              <circle cx="-14" cy="-11" r="2.6" fill={WOOD_LIGHT} stroke={WOOD_DARK} strokeWidth="1.4" />
              <circle cx="14" cy="-11" r="2.6" fill={WOOD_LIGHT} stroke={WOOD_DARK} strokeWidth="1.4" />

              {/* The ratio, painted on a board mounted on the deck. */}
              <rect
                x="-14"
                y="-8"
                width="28"
                height="16"
                rx="3"
                fill={fill}
                stroke={WOOD_DARK}
                strokeWidth="2.2"
              />
              <text
                y="0"
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="12"
                fontWeight="900"
                fill={isGeneric ? '#3B2412' : textOn(fill)}
                className="select-none font-sans tracking-tight"
              >
                {isGeneric ? '3:1' : '2:1'}
              </text>
            </g>
          </g>
        );
      })}
    </g>
  );
}

/** Cross planks along a jetty. Rects, never lines — see the note on `HarbourLayer`. */
function Planks({ from, to }: { from: { x: number; y: number }; to: { x: number; y: number } }) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  const count = Math.max(2, Math.round(length / 9));

  return (
    <g transform={`translate(${from.x}, ${from.y}) rotate(${angle})`} opacity="0.5">
      {Array.from({ length: count - 1 }, (_, i) => (
        <rect
          key={i}
          x={((i + 1) * length) / count - 0.5}
          y={-4.5}
          width="1.2"
          height="9"
          fill={WOOD_DARK}
        />
      ))}
    </g>
  );
}
