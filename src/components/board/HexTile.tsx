import { useState } from "react";
import { Hex } from "@/types/catan";
import { hexToPixel } from "@/lib/hex-utils";
import {
  HEX_RESOURCE_COLORS,
  HEX_SIZE,
  HEX_TILE_IMAGES,
  TILE_IMAGE_SOURCE_SIZE,
  TILE_IMAGE_HEX_BOUNDS,
} from "@/lib/constants";
import { clsx } from "clsx";

interface HexTileProps {
  hex: Hex;
  isSelectable?: boolean;
  onClick?: () => void;
}

// Calculate polygon points
const points: [number, number][] = [];
for (let i = 0; i < 6; i++) {
  const angle_rad = (Math.PI / 180) * (60 * i);
  points.push([HEX_SIZE * Math.sin(angle_rad), HEX_SIZE * Math.cos(angle_rad)]);
}
const POLYGON_POINTS = points.map(([x, y]) => `${x},${y}`).join(" ");

// Maps the source PNG's painted hexagon onto the polygon above, so the image sits
// flush against its neighbours instead of showing its square canvas's letterboxing.
const { minX, maxX, minY, maxY } = TILE_IMAGE_HEX_BOUNDS;
const bboxW = maxX - minX;
const bboxH = maxY - minY;
const polyW = Math.sqrt(3) * HEX_SIZE;
const polyH = 2 * HEX_SIZE;
const IMAGE_WIDTH = (TILE_IMAGE_SOURCE_SIZE * polyW) / bboxW;
const IMAGE_HEIGHT = (TILE_IMAGE_SOURCE_SIZE * polyH) / bboxH;
const IMAGE_X = -((minX + maxX) / 2) * (polyW / bboxW);
const IMAGE_Y = -((minY + maxY) / 2) * (polyH / bboxH);

export function HexTile({ hex, isSelectable, onClick }: HexTileProps) {
  const { x, y } = hexToPixel(hex.q, hex.r);
  const [imageFailed, setImageFailed] = useState(false);
  const clipId = `hex-clip-${hex.id}`;
  const imageSrc = HEX_TILE_IMAGES[hex.resource];

  return (
    <g
      transform={`translate(${x}, ${y})`}
      className={clsx(
        "group transition-all duration-300",
        isSelectable && "cursor-pointer hover:brightness-125 hover:drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]"
      )}
      onClick={isSelectable ? onClick : undefined}
      data-cy="hex"
      data-hex-id={hex.id}
      data-resource={hex.resource}
      data-token={hex.numberToken ?? undefined}
      data-image-failed={imageFailed || undefined}
    >
      {!imageFailed && (
        <clipPath id={clipId}>
          <polygon points={POLYGON_POINTS} />
        </clipPath>
      )}

      <polygon
        points={POLYGON_POINTS}
        fill={imageFailed ? HEX_RESOURCE_COLORS[hex.resource] : "transparent"}
        data-cy={imageFailed ? "hex-fallback-fill" : undefined}
      />

      {!imageFailed && (
        <image
          href={imageSrc}
          x={IMAGE_X}
          y={IMAGE_Y}
          width={IMAGE_WIDTH}
          height={IMAGE_HEIGHT}
          clipPath={`url(#${clipId})`}
          preserveAspectRatio="none"
          data-cy="hex-image"
          data-image-src={imageSrc}
          onError={() => setImageFailed(true)}
        />
      )}

      <polygon
        points={POLYGON_POINTS}
        fill="none"
        stroke="rgba(20, 15, 10, 0.35)"
        strokeWidth="1.5"
        className={clsx(
          "transition-opacity",
          !isSelectable && "hover:opacity-90 cursor-pointer"
        )}
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
