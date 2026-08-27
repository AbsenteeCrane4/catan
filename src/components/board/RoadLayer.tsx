import { GameNode, PlayerColor, Road } from "@/types/catan";
import { clsx } from "clsx";

interface RoadLayerProps {
  nodes: GameNode[];
  roads: Record<string, Road>;
  pendingRoads?: [string, string][];
  /** playerId -> chosen colour. Supplied by GameBoard, never derived from seat index. */
  playerColors: Record<number, PlayerColor>;
  onBuildRoad: (n1: string, n2: string) => void;
  // In a real app, pass boolean for 'canBuild' based on turn/resources
}

export function RoadLayer({ nodes, roads, pendingRoads = [], playerColors, onBuildRoad }: RoadLayerProps) {
  // Use a Set to prevent rendering connections twice (A-B vs B-A)
  const processed = new Set<string>();
  const connections: { id: string; start: GameNode; end: GameNode; existingRoad: Road; isPending: boolean; }[] = [];

  nodes.forEach(node => {
    node.neighbors.forEach(neighborId => {
      const neighbor = nodes.find(n => n.id === neighborId);
      if (!neighbor) return;

      const edgeId = [node.id, neighborId].sort().join('-');
      
      if (!processed.has(edgeId)) {
        processed.add(edgeId);

        const isPending = pendingRoads.some(
          ([p1, p2]) => [p1, p2].sort().join('-') === edgeId
        );

        connections.push({
          id: edgeId,
          start: node,
          end: neighbor,
          existingRoad: roads[edgeId],
          isPending
        });
      }
    });
  });

  return (
    <g className="road-layer">
      {connections.map(({ id, start, end, existingRoad, isPending }) => (
        <g 
          key={id} 
          onClick={(e) => {
            e.stopPropagation();
            // Prevent clicking if a road is already built OR if it's already selected as pending
            if (!existingRoad && !isPending) onBuildRoad(start.id, end.id);
          }}
          className={clsx(
            (!existingRoad && !isPending) ? "cursor-pointer group" : ""
          )}
        >
          {/* 1. Invisible Hitbox (Thicker than visible road for easier clicking) */}
          <line
            x1={start.pixelPos.x} y1={start.pixelPos.y}
            x2={end.pixelPos.x} y2={end.pixelPos.y}
            stroke="transparent"
            strokeWidth="14"
          />

          {/* 2. Ghost Road (Visible on hover, hides if pending) */}
          {!existingRoad && !isPending && (
            <line
              x1={start.pixelPos.x} y1={start.pixelPos.y}
              x2={end.pixelPos.x} y2={end.pixelPos.y}
              stroke="white"
              strokeWidth="6"
              strokeDasharray="4 4"
              className="opacity-0 group-hover:opacity-40 transition-opacity pointer-events-none"
            />
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
      ))}
    </g>
  );
}