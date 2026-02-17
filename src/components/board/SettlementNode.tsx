import { PLAYER_COLORS } from "@/lib/constants";
import { GameNode, Settlement } from "@/types/catan";

// components/board/SettlementNode.tsx
export function SettlementNode({ node, owner, onBuild }: { 
  node: GameNode; 
  owner?: Settlement; 
  onBuild: () => void 
}) {
  return (
    <g 
      transform={`translate(${node.pixelPos.x}, ${node.pixelPos.y})`}
      onClick={(e) => { e.stopPropagation(); onBuild(); }}
      className="cursor-pointer group"
    >
      {/* Ghost node for building */}
      {!owner && (
        <circle 
          r="8" 
          className="fill-white/20 opacity-0 group-hover:opacity-100 transition-opacity" 
        />
      )}
      
      {/* Actual Settlement */}
      {owner && (
        <path
          d="M -8 4 L -8 -2 L 0 -8 L 8 -2 L 8 4 Z" // Simple house shape
          fill={PLAYER_COLORS[owner.playerId]}
          stroke="white"
          strokeWidth="1"
          className="drop-shadow-md"
        />
      )}
    </g>
  );
}