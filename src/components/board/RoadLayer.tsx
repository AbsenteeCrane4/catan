import { GameNode, Road } from "@/types/catan";
import { PLAYER_COLORS } from "@/lib/constants";
import { clsx } from "clsx";

interface RoadLayerProps {
  nodes: GameNode[];
  roads: Record<string, Road>;
  onBuildRoad: (n1: string, n2: string) => void;
  // In a real app, pass boolean for 'canBuild' based on turn/resources
}

export function RoadLayer({ nodes, roads, onBuildRoad }: RoadLayerProps) {
  // Use a Set to prevent rendering connections twice (A-B vs B-A)
  const processed = new Set<string>();
  const connections: { id: string; start: GameNode; end: GameNode; existingRoad: Road; }[] = [];

  nodes.forEach(node => {
    node.neighbors.forEach(neighborId => {
      const neighbor = nodes.find(n => n.id === neighborId);
      if (!neighbor) return;

      const edgeId = [node.id, neighborId].sort().join('-');
      
      if (!processed.has(edgeId)) {
        processed.add(edgeId);
        connections.push({
          id: edgeId,
          start: node,
          end: neighbor,
          existingRoad: roads[edgeId]
        });
      }
    });
  });

  return (
    <g className="road-layer">
      {connections.map(({ id, start, end, existingRoad }) => (
        <g 
          key={id} 
          onClick={(e) => {
            e.stopPropagation();
            if (!existingRoad) onBuildRoad(start.id, end.id);
          }}
          className={clsx(
            !existingRoad ? "cursor-pointer group" : ""
          )}
        >
          {/* 1. Invisible Hitbox (Thicker than visible road for easier clicking) */}
          <line
            x1={start.pixelPos.x} y1={start.pixelPos.y}
            x2={end.pixelPos.x} y2={end.pixelPos.y}
            stroke="transparent"
            strokeWidth="14"
          />

          {/* 2. Ghost Road (Visible on hover) */}
          {!existingRoad && (
            <line
              x1={start.pixelPos.x} y1={start.pixelPos.y}
              x2={end.pixelPos.x} y2={end.pixelPos.y}
              stroke="white"
              strokeWidth="6"
              strokeDasharray="4 4"
              className="opacity-0 group-hover:opacity-40 transition-opacity pointer-events-none"
            />
          )}

          {/* 3. Built Road */}
          {existingRoad && (
            <line
              x1={start.pixelPos.x} y1={start.pixelPos.y}
              x2={end.pixelPos.x} y2={end.pixelPos.y}
              stroke={PLAYER_COLORS[existingRoad.playerId]}
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