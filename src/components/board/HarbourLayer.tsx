import { GameNode, Harbour } from '@/types/catan';
import { HEX_SIZE, RESOURCE_COLORS } from '@/lib/constants';

interface HarbourLayerProps {
  harbours: Harbour[];
  /** Needed to anchor each pier to the two nodes the harbour actually trades from. */
  nodes: GameNode[];
}

/** How far off the coast the port emblem floats. */
const DISTANCE_OUT = HEX_SIZE * 0.72;
const BADGE_RADIUS = 16;

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
            {/* Two piers, one to each tradeable node. Drawn before the emblem so their
                inner ends tuck underneath it. Three stacked round-capped strokes give a
                dark edge, a wood body and a grain highlight without needing a gradient. */}
            {[a, b].map(node => (
              <g key={node.id}>
                {[
                  { w: 8, c: WOOD_DARK, o: 1 },
                  { w: 5, c: WOOD, o: 1 },
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
              </g>
            ))}

            <g transform={`translate(${cx}, ${cy})`}>
              <circle
                r={BADGE_RADIUS}
                fill={fill}
                stroke={WOOD_DARK}
                strokeWidth="3"
                className="drop-shadow-md"
              />
              {/* Inner highlight reads as a raised wooden rim. */}
              <circle
                r={BADGE_RADIUS - 3}
                fill="none"
                stroke={WOOD_LIGHT}
                strokeWidth="1.5"
                opacity="0.55"
              />
              <text
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
