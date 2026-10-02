import { GameNode, Hex, PlayerColor, Road, Settlement } from '@/types/catan';
import { boardEdges } from '@/lib/board/geometry';
import { hexToPixel } from '@/lib/hex-utils';
import { pieceShades } from '@/lib/constants';
import { cityBody, robberBody, roadBody, settlementBody } from '@/components/build/IsoPiece';

/**
 * Everything that stands on the board, drawn in the board's own SVG coordinates.
 *
 * The board is flat and seen from directly above; the pieces are drawn in an isometric
 * projection over it, so they still read as objects. Nothing here takes the pointer:
 * click targets live in `SettlementNode`, `RoadLayer` and `HexTile`, so a piece can never
 * intercept a click meant for the spot underneath it.
 */

/** Board scales from the piece spec. */
const SCALE = { settlement: 0.95, city: 0.85, robber: 1.25 } as const;

/** Road bar: node distance minus this, so it stops short of the corners. */
const ROAD = { trim: 18, width: 7, height: 4.5 } as const;

export function NumberTokens({ hexes }: { hexes: Hex[] }) {
  return (
    <g className="pointer-events-none">
      {hexes.map(hex => {
        if (hex.resource === 'desert' || hex.numberToken === null) return null;
        const { x, y } = hexToPixel(hex.q, hex.r);
        return (
          <g key={hex.id} transform={`translate(${x}, ${y})`} data-cy="number-token">
            <NumberToken token={hex.numberToken} />
          </g>
        );
      })}
    </g>
  );
}

/**
 * A number token: parchment disc, dark numeral, red for the two numbers that decide
 * games. The pip row repeats the probability so emphasis is not carried by colour alone.
 */
function NumberToken({ token }: { token: number }) {
  const hot = token === 6 || token === 8;
  const pips = 6 - Math.abs(7 - token);
  const ink = hot ? '#c0392b' : '#2c2418';

  return (
    <g filter="url(#piece-shadow)">
      <circle r="19" fill="#f2e3c4" stroke="#b9a274" strokeWidth="2" />
      <circle r="15.5" fill="none" stroke="#d9c49a" strokeWidth="1" />
      <text
        y="1"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="19"
        fontWeight="800"
        fill={ink}
        className="select-none font-hud"
      >
        {token}
      </text>
      <g fill={ink}>
        {Array.from({ length: pips }, (_, i) => (
          <circle key={i} cx={(i - (pips - 1) / 2) * 3.4} cy="12" r="1.1" />
        ))}
      </g>
    </g>
  );
}

interface PieceLayerProps {
  hexes: Hex[];
  nodes: GameNode[];
  settlements: Record<string, Settlement>;
  roads: Record<string, Road>;
  playerColors: Record<number, PlayerColor>;
  robberHexId: string;
  /** A ghosted piece under the pointer at a legal spot. */
  preview?: { nodeId: string; kind: 'settlement' | 'city'; color: PlayerColor | undefined } | null;
}

export function PieceLayer({
  hexes,
  nodes,
  settlements,
  roads,
  playerColors,
  robberHexId,
  preview,
}: PieceLayerProps) {
  const byId = new Map(nodes.map(n => [n.id, n]));
  const robberHex = hexes.find(h => h.id === robberHexId);
  const robber = robberHex ? hexToPixel(robberHex.q, robberHex.r) : null;

  const road = (key: string, a: GameNode, b: GameNode, color: string) => {
    const cx = (a.pixelPos.x + b.pixelPos.x) / 2;
    const cy = (a.pixelPos.y + b.pixelPos.y) / 2;
    const angle = Math.atan2(b.pixelPos.y - a.pixelPos.y, b.pixelPos.x - a.pixelPos.x);
    const len = Math.hypot(b.pixelPos.x - a.pixelPos.x, b.pixelPos.y - a.pixelPos.y) - ROAD.trim;
    return roadBody(cx, cy, angle, len, ROAD.width, ROAD.height, color).map((el, i) => (
      <g key={`${key}-${i}`}>{el}</g>
    ));
  };

  // Painter's algorithm: pieces lower on screen are drawn last, so they overlap correctly.
  const built = nodes
    .filter(n => settlements[n.id])
    .sort((a, b) => a.pixelPos.y - b.pixelPos.y);

  const previewNode = preview ? byId.get(preview.nodeId) : undefined;

  return (
    <g className="pointer-events-none">
      <g data-cy="road-pieces">
        {boardEdges(nodes).map(edge => {
          const r = roads[edge.id];
          if (!r) return null;
          return (
            <g key={edge.id} className="animate-piece-fade" filter="url(#piece-shadow)">
              {road(edge.id, edge.a, edge.b, pieceShades(playerColors[r.playerId]).base)}
            </g>
          );
        })}
      </g>

      {robber && (
        <g
          data-cy="robber"
          data-x={robber.x}
          data-y={robber.y}
          transform={`translate(${robber.x}, ${robber.y + 8}) scale(${SCALE.robber})`}
          filter="url(#piece-shadow)"
        >
          {robberBody()}
        </g>
      )}

      {built.map(node => {
        const s = settlements[node.id];
        const color = pieceShades(playerColors[s.playerId]).base;
        const kind = s.isCity ? 'city' : 'settlement';
        return (
          <g
            key={node.id}
            data-cy="board-piece"
            data-piece={kind}
            transform={`translate(${node.pixelPos.x}, ${node.pixelPos.y}) scale(${SCALE[kind]})`}
          >
            <ellipse cx={3} cy={4} rx={s.isCity ? 15 : 11} ry={s.isCity ? 6 : 4.6} fill="#040a14" opacity={0.45} />
            <g filter="url(#piece-shadow)" className="animate-piece-drop">
              {s.isCity ? cityBody(color) : settlementBody(color)}
            </g>
          </g>
        );
      })}

      {preview && previewNode && (
        <g
          data-cy="piece-preview"
          transform={`translate(${previewNode.pixelPos.x}, ${previewNode.pixelPos.y}) scale(${SCALE[preview.kind]})`}
        >
          <circle r={30} fill="url(#prev-glow)" />
          <g opacity={0.6}>
            {preview.kind === 'city'
              ? cityBody(pieceShades(preview.color).base)
              : settlementBody(pieceShades(preview.color).base)}
          </g>
        </g>
      )}
    </g>
  );
}

/** Shared SVG defs: the piece drop shadow and the placement-preview glow. */
export function PieceDefs() {
  return (
    <>
      <filter id="piece-shadow" x="-60%" y="-60%" width="220%" height="220%">
        <feDropShadow dx="3" dy="5" stdDeviation="3" floodColor="#04070f" floodOpacity="0.55" />
      </filter>
      <radialGradient id="prev-glow">
        <stop offset="0%" stopColor="#4ade80" stopOpacity="0.8" />
        <stop offset="60%" stopColor="#22c55e" stopOpacity="0.25" />
        <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
      </radialGradient>
    </>
  );
}
