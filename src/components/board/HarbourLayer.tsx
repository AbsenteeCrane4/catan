import { Harbour } from '@/types/catan';
import { HEX_HEIGHT } from '@/lib/constants';

interface HarbourLayerProps {
  harbours: Harbour[];
}

export function HarbourLayer({ harbours }: HarbourLayerProps) {
  const DISTANCE_OUT = HEX_HEIGHT * 0.45; // Push it out into the water

  return (
    <g id="harbour-layer">
      {harbours.map(harbour => {
        // Calculate the vector pointing into the water
        const outX = harbour.x + Math.cos(harbour.angle) * DISTANCE_OUT;
        const outY = harbour.y + Math.sin(harbour.angle) * DISTANCE_OUT;
        
        return (
          <g
            key={harbour.id}
            className="pointer-events-none drop-shadow-md"
            data-cy="harbour"
            data-harbour-type={harbour.type}
          >
            {/* The Wooden Dock */}
            <line 
              x1={harbour.x} y1={harbour.y} 
              x2={outX} y2={outY} 
              stroke="#78350F" // Dark brown dock
              strokeWidth="4"
              strokeLinecap="round"
            />
            
            {/* The Harbour Icon */}
            <g transform={`translate(${outX}, ${outY})`}>
              {/* Outer border & Fill */}
              <circle r="14" fill="#FEF3C7" stroke="#B45309" strokeWidth="2" />
              
              {/* Text / Icon Label */}
              <text 
                textAnchor="middle" 
                alignmentBaseline="central" 
                fontSize="10" 
                fontWeight="900"
                fill="#78350F"
                className="select-none font-sans tracking-tighter"
              >
                {harbour.type === '3:1' ? '3:1' : harbour.type.slice(0, 3).toUpperCase()}
              </text>
            </g>
          </g>
        );
      })}
    </g>
  );
}