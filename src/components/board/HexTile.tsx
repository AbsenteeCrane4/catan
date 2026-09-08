import { useState } from "react";
import { Hex } from "@/types/catan";
import { hexToPixel } from "@/lib/hex-utils";
import { HEX_RESOURCE_COLORS, HEX_SIZE, HEX_TILE_IMAGES } from "@/lib/constants";
import { HEX_POLYGON_POINTS } from "@/lib/board/geometry";
import { clsx } from "clsx";

interface HexTileProps {
  hex: Hex;
  isSelectable?: boolean;
  onClick?: () => void;
}

// The source PNGs are pre-normalized (see scripts/normalize-tile-art) so every tile's
// painted hexagon exactly fills its canvas — the image can be placed straight onto the
// polygon's bounding box with no per-tile offset, and every tile lines up identically.
const IMAGE_WIDTH = Math.sqrt(3) * HEX_SIZE;
const IMAGE_HEIGHT = 2 * HEX_SIZE;
const IMAGE_X = -IMAGE_WIDTH / 2;
const IMAGE_Y = -IMAGE_HEIGHT / 2;

/**
 * One terrain tile on the board plane.
 *
 * The number token is deliberately not here: on a tilted board it would foreshorten with
 * the terrain and stop being legible, so it stands up in the billboard layer instead
 * (`docs/DESIGN.md` §14). `data-token` stays on this element, where the specs read it.
 */
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
        isSelectable && "cursor-pointer hover:brightness-125"
      )}
      onClick={isSelectable ? onClick : undefined}
      data-cy="hex"
      data-hex-id={hex.id}
      data-resource={hex.resource}
      data-token={hex.numberToken ?? undefined}
      data-image-failed={imageFailed || undefined}
      data-legal-target={isSelectable ? 'true' : undefined}
    >
      {!imageFailed && (
        <clipPath id={clipId}>
          <polygon points={HEX_POLYGON_POINTS} />
        </clipPath>
      )}

      <polygon
        points={HEX_POLYGON_POINTS}
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

      {/* Seam between neighbouring tiles: dark enough to separate them, light enough not
          to draw a grid over the terrain. */}
      <polygon
        points={HEX_POLYGON_POINTS}
        fill="none"
        stroke="rgba(28, 20, 10, 0.42)"
        strokeWidth="1.6"
        strokeLinejoin="round"
        className="pointer-events-none"
      />

      {/* A legal robber destination, marked in the same language as buildable nodes and
          edges so "you may click this" reads identically everywhere on the board. */}
      {isSelectable && (
        <polygon
          points={HEX_POLYGON_POINTS}
          fill="rgba(251, 191, 36, 0.16)"
          stroke="#fbbf24"
          strokeWidth="4"
          strokeLinejoin="round"
          className="legal-target-pulse pointer-events-none"
          data-cy="legal-hex-marker"
        />
      )}
    </g>
  );
}
