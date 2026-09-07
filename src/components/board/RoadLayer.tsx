import { GameNode, PlayerColor, Road } from "@/types/catan";
import { edgeId } from "@/lib/game/helpers/buildLegality";
import { clsx } from "clsx";

interface RoadLayerProps {
  nodes: GameNode[];
  roads: Record<string, Road>;
  pendingRoads?: [string, string][];
  /** playerId -> chosen colour. Supplied by GameBoard, never derived from seat index. */
  playerColors: Record<number, PlayerColor>;
  /**
   * Edge ids the reducer would accept right now, from `legalRoadEdges`. Undefined means
   * no road mode is armed, and then no edge is clickable at all.
   */
  legalEdges?: ReadonlySet<string>;
  /** The building player's colour, used for the hover preview. */
  previewColor?: PlayerColor;
  onBuildRoad: (n1: string, n2: string) => void;
}

export function RoadLayer({
  nodes,
  roads,
  pendingRoads = [],
  playerColors,
  legalEdges,
  previewColor,
  onBuildRoad,
}: RoadLayerProps) {
  // Use a Set to prevent rendering connections twice (A-B vs B-A)
  const processed = new Set<string>();
  const connections: { id: string; start: GameNode; end: GameNode; existingRoad: Road; isPending: boolean; }[] = [];

  nodes.forEach(node => {
    node.neighbors.forEach(neighborId => {
      const neighbor = nodes.find(n => n.id === neighborId);
      if (!neighbor) return;

      const id = edgeId(node.id, neighborId);

      if (!processed.has(id)) {
        processed.add(id);

        const isPending = pendingRoads.some(([p1, p2]) => edgeId(p1, p2) === id);

        connections.push({
          id,
          start: node,
          end: neighbor,
          existingRoad: roads[id],
          isPending
        });
      }
    });
  });

  return (
    <g className="road-layer">
      {connections.map(({ id, start, end, existingRoad, isPending }) => {
        // Legality is decided by the shared selector, never by hit-testing here.
        const isLegalTarget = !!legalEdges?.has(id) && !isPending;

        return (
          <g
            key={id}
            onClick={(e) => {
              e.stopPropagation();
              if (isLegalTarget) onBuildRoad(start.id, end.id);
            }}
            className={clsx(isLegalTarget && "cursor-pointer group")}
            data-cy="edge"
            data-node-1={start.id}
            data-node-2={end.id}
            data-owner-id={existingRoad ? existingRoad.playerId : undefined}
            data-legal-target={isLegalTarget ? 'true' : undefined}
          >
            {/* 1. Invisible Hitbox (Thicker than visible road for easier clicking) */}
            <line
              x1={start.pixelPos.x} y1={start.pixelPos.y}
              x2={end.pixelPos.x} y2={end.pixelPos.y}
              stroke="transparent"
              strokeWidth="14"
            />

            {/* 2. Legal target marker, then the piece itself previewed on hover. */}
            {isLegalTarget && (
              <>
                {/* Marker weight matches a built road: the board is drawn well under
                    1:1, and anything thinner vanishes at the scale the player sees. */}
                <line
                  x1={start.pixelPos.x} y1={start.pixelPos.y}
                  x2={end.pixelPos.x} y2={end.pixelPos.y}
                  stroke="#fbbf24"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray="10 7"
                  className="legal-target-pulse pointer-events-none drop-shadow-[0_0_3px_rgba(251,191,36,0.9)] group-hover:opacity-0"
                  data-cy="legal-edge-marker"
                />
                <line
                  x1={start.pixelPos.x} y1={start.pixelPos.y}
                  x2={end.pixelPos.x} y2={end.pixelPos.y}
                  stroke={previewColor ?? 'white'}
                  strokeWidth="8"
                  strokeLinecap="round"
                  className="pointer-events-none opacity-0 transition-opacity group-hover:opacity-90"
                  data-cy="edge-preview"
                />
              </>
            )}

            {/* 3. Pending Road (Visual feedback for the 1st Road Building selection) */}
            {isPending && (
              <line
                x1={start.pixelPos.x} y1={start.pixelPos.y}
                x2={end.pixelPos.x} y2={end.pixelPos.y}
                stroke="#3b82f6" /* Tailwind blue-500 */
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray="8 6"
                className="animate-pulse drop-shadow-lg pointer-events-none"
              />
            )}

            {/* 4. Built Road */}
            {existingRoad && (
              <line
                x1={start.pixelPos.x} y1={start.pixelPos.y}
                x2={end.pixelPos.x} y2={end.pixelPos.y}
                stroke={playerColors[existingRoad.playerId] ?? 'white'}
                strokeWidth="8"
                strokeLinecap="round"
                className="drop-shadow-md pointer-events-none"
              />
            )}
          </g>
        );
      })}
    </g>
  );
}
