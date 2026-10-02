import type { CSSProperties, ReactNode } from "react";
import { clsx } from "clsx";
import type { ResourceType } from "@/types/catan";
import { HEX_TILE_IMAGES, RESOURCE_LABELS } from "@/lib/constants";

/**
 * The tile illustrations are hexagons with transparent corners, so the art is zoomed past
 * the hexagon's inscribed rectangle and the face is painted edge to edge.
 */
export const tileArtStyle = (resource: ResourceType): CSSProperties => ({
  backgroundImage: `url(${HEX_TILE_IMAGES[resource]})`,
  backgroundSize: '175% auto',
  backgroundPosition: 'center 45%',
  backgroundRepeat: 'no-repeat',
});

/** A cost chip: one unit of a resource, drawn as a crop of its tile art. */
export function ResourceChip({
  resource,
  size = 24,
  className,
}: {
  resource: ResourceType;
  size?: number;
  className?: string;
}) {
  return (
    <span
      data-cy="resource-icon"
      data-resource={resource}
      title={RESOURCE_LABELS[resource]}
      className={clsx(
        "inline-block shrink-0 rounded-[5px] border border-[rgba(110,160,220,0.3)] shadow-[0_2px_5px_rgba(0,0,0,0.4)]",
        className
      )}
      style={{ width: size, height: size, ...tileArtStyle(resource) }}
    />
  );
}

/** Title row of a floating HUD panel: accent icon, tracked uppercase label, trailing slot. */
export function PanelHeader({
  icon,
  title,
  children,
  className,
}: {
  icon: ReactNode;
  title: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "flex items-center gap-[11px] border-b border-[rgba(110,160,220,0.16)] px-4 py-[14px]",
        className
      )}
    >
      <span className="flex shrink-0 text-hs-accent">{icon}</span>
      <h2 className="flex-1 text-[14px] font-bold uppercase tracking-[0.13em] text-hs-text">{title}</h2>
      {children}
    </div>
  );
}

/** Small section label inside a panel ("YOU GIVE", "RESPONSES"). */
export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-hs-mute">{children}</span>
  );
}
