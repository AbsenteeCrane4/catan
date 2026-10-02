import { GameNode, PlayerColor, Road } from "@/types/catan";
import { boardEdges } from "@/lib/board/geometry";
import { edgeId } from "@/lib/game/helpers/buildLegality";
import { pieceShades } from "@/lib/constants";
import { clsx } from "clsx";

interface RoadLayerProps {
  nodes: GameNode[];
  roads: Record<string, Road>;
  pendingRoads?: [string, string][];
  /**
   * Edge ids the reducer would accept right now, from `legalRoadEdges`. Undefined means
   * no road mode is armed, and then no edge is clickable at all.
   */
  legalEdges?: ReadonlySet<string>;
  /** The building player's colour, used for the hover preview. */
  previewColor?: PlayerColor;
  onBuildRoad: (n1: string, n2: string) => void;
}

/**
 * The interactive half of the roads: click targets, legal-target markers, the hover
 * preview and the pending Road Building selection.
 *
 * The built road pieces themselves are drawn by `PieceLayer`.
 */
export function RoadLayer({
  nodes,
  roads,
  pendingRoads = [],
  legalEdges,
  previewColor,
  onBuildRoad,
}: RoadLayerProps) {
  return (
    <g className="road-layer">
      {boardEdges(nodes).map(({ id, a: start, b: end }) => {
        const existingRoad = roads[id];
        const isPending = pendingRoads.some(([p1, p2]) => edgeId(p1, p2) === id);
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
            {/* 1. Invisible hitbox, wider than the road so the edge is easy to hit. */}
            <line
              x1={start.pixelPos.x} y1={start.pixelPos.y}
              x2={end.pixelPos.x} y2={end.pixelPos.y}
              stroke="transparent"
              strokeWidth="16"
              pointerEvents={isLegalTarget ? 'stroke' : 'none'}
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
                  stroke={pieceShades(previewColor).base}
                  strokeWidth="9"
                  strokeLinecap="round"
                  className="pointer-events-none opacity-0 transition-opacity group-hover:opacity-90"
                  data-cy="edge-preview"
                />
              </>
            )}

            {/* 3. Pending road (visual feedback for the 1st Road Building selection). */}
            {isPending && (
              <line
                x1={start.pixelPos.x} y1={start.pixelPos.y}
                x2={end.pixelPos.x} y2={end.pixelPos.y}
                stroke={pieceShades(previewColor).top}
                strokeWidth="9"
                strokeLinecap="round"
                strokeDasharray="8 6"
                className="animate-pulse drop-shadow-lg pointer-events-none"
              />
            )}
          </g>
        );
      })}
    </g>
  );
}
