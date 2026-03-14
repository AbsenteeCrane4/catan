import { useState } from 'react';
import { GameState } from '@/types/catan';
import { HexTile } from './HexTile';
import { SettlementNode } from './SettlementNode';
import { RoadLayer } from './RoadLayer';
import { HEX_HEIGHT, HEX_SIZE } from '@/lib/constants';
import { Robber } from '@/components/ui/Robber';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { HarbourLayer } from './HarbourLayer';

interface GameBoardProps {
  state: GameState; // Accept the whole state object
  pendingRoads?: [string, string][];
  onBuildSettlement: (nodeId: string) => void;
  onBuildRoad: (nodeId1: string, nodeId2: string) => void;
  onUpgradeSettlement: (nodeId: string) => void;
}

export function GameBoard({ 
  state: { hexes, nodes, settlements, roads, harbours, boardRadius: radius, robberHexId },
  pendingRoads = [],
  onBuildSettlement,
  onBuildRoad, 
  onUpgradeSettlement 
}: GameBoardProps) {
  
  const [pendingUpgradeNode, setPendingUpgradeNode] = useState<string | null>(null);
  
  const viewBoxSize = (radius * 2 + 1) * HEX_HEIGHT * 1.3;
  const origin = -viewBoxSize / 2;

  const robberHex = hexes.find(h => h.id === robberHexId);

  const robberPos = robberHex ? { x: HEX_SIZE * Math.sqrt(3) * (robberHex.q + robberHex.r / 2), y: HEX_SIZE * 3 / 2 * robberHex.r } : null;

  const handleUpgradeConfirm = () => {
    if (pendingUpgradeNode) {
      onUpgradeSettlement(pendingUpgradeNode);
      setPendingUpgradeNode(null);
    }
  };

  return (
    <div className="flex-1 bg-slate-900 relative overflow-hidden flex items-center justify-center">
      <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:24px_24px]" />
      
      <svg 
        viewBox={`${origin} ${origin} ${viewBoxSize} ${viewBoxSize}`}
        className="w-full h-full max-h-[85vh] drop-shadow-2xl"
      >
        <g id="hex-layer">
          {hexes.map(hex => <HexTile key={hex.id} hex={hex} />)}
        </g>

        <HarbourLayer harbours={harbours} />

        {robberPos && <Robber x={robberPos.x} y={robberPos.y} />}
        
        <RoadLayer nodes={nodes} roads={roads} pendingRoads={pendingRoads} onBuildRoad={onBuildRoad} />
        
        <g id="node-layer">
          {nodes.map(node => (
            <SettlementNode 
              key={node.id} 
              node={node} 
              owner={settlements[node.id]} 
              onBuild={() => onBuildSettlement(node.id)}
              onUpgrade={() => setPendingUpgradeNode(node.id)} 
            />
          ))}
        </g>
      </svg>

      <ConfirmationModal 
        isOpen={!!pendingUpgradeNode}
        title="Upgrade to City?"
        message="Transform this settlement into a city for 3 Ore and 2 Wheat. Cities generate double resources."
        onConfirm={handleUpgradeConfirm}
        onCancel={() => setPendingUpgradeNode(null)}
      />
    </div>
  );
}