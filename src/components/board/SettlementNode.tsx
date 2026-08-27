// components/board/SettlementNode.tsx
import { GameNode, PlayerColor } from "@/types/catan";
import { SettlementIcon } from "@/components/ui/SettlementIcon";
import { CityIcon } from "@/components/ui/CityIcon";

interface SettlementNodeProps {
  node: GameNode;
  owner?: { playerId: number; isCity: boolean } | null;
  /** The owning player's chosen colour. Supplied by GameBoard, never derived from seat index. */
  ownerColor?: PlayerColor;
  onBuild: () => void;
  onUpgrade: () => void;
}

export function SettlementNode({ node, owner, ownerColor, onBuild, onUpgrade }: SettlementNodeProps) {
  
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!owner) {
      // Logic for building a new settlement
      onBuild();
    } else if (!owner.isCity) {
      // Logic for upgrading to a city
      onUpgrade();
    } else {
      console.log("This is already a city.");
    }
  };

  return (
    <g
      transform={`translate(${node.pixelPos.x}, ${node.pixelPos.y})`}
      onClick={handleClick}
      className="cursor-pointer group"
      data-cy="node"
      data-node-id={node.id}
      data-x={node.pixelPos.x}
      data-y={node.pixelPos.y}
      data-owner-id={owner ? owner.playerId : undefined}
      data-is-city={owner?.isCity ? 'true' : undefined}
    >
      {/* Ghost node (Hover state for empty spots) */}
      {!owner && (
        <circle 
          r="10" 
          className="fill-white/20 opacity-0 group-hover:opacity-100 transition-opacity" 
        />
      )}
      
      {/* Render either City or Settlement based on state */}
      {owner && (
        owner.isCity ? (
          <CityIcon color={ownerColor ?? 'white'} />
        ) : (
          <SettlementIcon color={ownerColor ?? 'white'} />
        )
      )}
    </g>
  );
}