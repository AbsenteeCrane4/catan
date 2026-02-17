import React from 'react';
import { Hex, GameNode, Settlement } from '@/types/catan';
import { HexTile } from './HexTile';
import { SettlementNode } from './SettlementNode';
import { HEX_HEIGHT } from '@/lib/constants';

interface GameBoardProps {
  hexes: Hex[];
  nodes: GameNode[];
  settlements: Record<string, Settlement>;
  radius: number;
  onBuildSettlement: (nodeId: string) => void;
}

export function GameBoard({ 
  hexes, 
  nodes, 
  settlements, 
  radius, 
  onBuildSettlement 
}: GameBoardProps) {
  
  // Calculate dynamic ViewBox so the board is always centered
  const viewBoxSize = (radius * 2 + 1) * HEX_HEIGHT * 1.3;
  const origin = -viewBoxSize / 2;

  return (
    <div className="flex-1 bg-slate-900 relative overflow-hidden flex items-center justify-center">
      {/* Decorative Ocean Background */}
      <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:24px_24px]" />
      
      <svg 
        viewBox={`${origin} ${origin} ${viewBoxSize} ${viewBoxSize}`}
        className="w-full h-full max-h-[85vh] drop-shadow-2xl transition-all duration-500"
      >
        {/* Bottom Layer: Hex Tiles */}
        <g id="hex-layer">
          {hexes.map(hex => (
            <HexTile key={hex.id} hex={hex} />
          ))}
        </g>
        
        {/* Top Layer: Interaction Nodes (Settlements) */}
        <g id="node-layer">
          {nodes.map(node => (
            <SettlementNode 
              key={node.id} 
              node={node} 
              owner={settlements[node.id]} 
              onBuild={() => onBuildSettlement(node.id)}
            />
          ))}
        </g>
      </svg>

      {/* Map Size Legend */}
      <div className="absolute bottom-4 left-4 bg-slate-800/80 p-2 rounded text-[10px] text-slate-400 font-mono uppercase tracking-widest border border-slate-700">
        Grid: {hexes.length} Hexes | {nodes.length} Intersections
      </div>
    </div>
  );
}