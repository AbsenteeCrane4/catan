import { Hex } from "@/types/catan";
import { hexToPixel } from "@/lib/hex-utils";
import { HEX_RESOURCE_COLORS, HEX_SIZE } from "@/lib/constants";
import { clsx } from "clsx";

export function HexTile({ hex }: { hex: Hex }) {
  const { x, y } = hexToPixel(hex.q, hex.r);
  
  // Calculate polygon points
  const points = [];
  for (let i = 0; i < 6; i++) {
    const angle_deg = 60 * i;
    const angle_rad = Math.PI / 180 * angle_deg;
    points.push(`${HEX_SIZE * Math.sin(angle_rad)},${HEX_SIZE * Math.cos(angle_rad)}`);
  }

  return (
    <g transform={`translate(${x}, ${y})`} className="group">
      <polygon
        points={points.join(" ")}
        fill={HEX_RESOURCE_COLORS[hex.resource]}
        stroke="#f8fafc"
        strokeWidth="2"
        className="transition-opacity hover:opacity-90 cursor-pointer"
      />
      {hex.resource !== 'desert' && (
        <g className="pointer-events-none">
          <circle r="16" fill="navajowhite" className="opacity-90 shadow-sm" />
          <text 
            y="5" textAnchor="middle" 
            className={clsx(
              "text-[14px] font-bold font-serif select-none",
              (hex.numberToken === 6 || hex.numberToken === 8) ? "fill-red-600" : "fill-slate-900"
            )}
          >
            {hex.numberToken}
          </text>
           {/* Probability Dots */}
           <text y="14" textAnchor="middle" fontSize="8" fill="#333">
              {Array.from({length: 6 - Math.abs(7 - (hex.numberToken || 0))}).map(() => '.').join('')}
           </text>
        </g>
      )}
    </g>
  );
}