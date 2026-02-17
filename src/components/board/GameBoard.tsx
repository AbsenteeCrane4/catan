import { Hex } from "@/types/catan";
import { HexTile } from "./HexTile";
import { HEX_HEIGHT } from "@/lib/constants";

interface GameBoardProps {
  hexes: Hex[];
  radius: number;
}

export function GameBoard({ hexes, radius }: GameBoardProps) {
  // Calculate dynamic ViewBox
  const viewBoxSize = (radius * 2 + 1) * HEX_HEIGHT * 1.2;
  const origin = -viewBoxSize / 2;

  return (
    <div className="flex-1 bg-[#1a365d] relative overflow-hidden flex items-center justify-center">
       <div className="absolute inset-0 opacity-10 pointer-events-none" 
            style={{ 
              backgroundImage: 'radial-gradient(circle, #4299e1 1px, transparent 1px)', 
              backgroundSize: '20px 20px' 
            }} 
       />
      <svg 
        viewBox={`${origin} ${origin} ${viewBoxSize} ${viewBoxSize}`}
        className="w-full h-full max-h-[90vh] touch-pan-x touch-pan-y drop-shadow-2xl"
      >
        <g>
          {hexes.map(hex => <HexTile key={hex.id} hex={hex} />)}
        </g>
      </svg>
    </div>
  );
}