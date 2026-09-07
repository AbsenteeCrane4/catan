import { clsx } from "clsx";
import type { ResourceType } from "@/types/catan";
import { RESOURCE_LABELS } from "@/lib/constants";
import { ResourceGlyph } from "./ResourceGlyph";

interface ResourceIconProps {
  resource: ResourceType;
  /** Drawn as a small badge when more than one is needed. */
  count?: number;
  /** Dims the icon for a cost the player cannot currently meet. */
  muted?: boolean;
  className?: string;
}

/**
 * One resource at cost-line size: a flat glyph, not a crop of the card art.
 *
 * Drawn rather than loaded, so a cost never renders as an empty coloured square while an
 * image request is in flight — which is exactly what the painted version did here.
 */
export function ResourceIcon({ resource, count = 1, muted = false, className }: ResourceIconProps) {
  return (
    <span
      data-cy="resource-icon"
      data-resource={resource}
      data-count={count}
      title={count > 1 ? `${count} × ${RESOURCE_LABELS[resource]}` : RESOURCE_LABELS[resource]}
      className={clsx(
        // relative anchors the count badge below.
        "relative inline-block shrink-0 rounded align-middle ring-1 ring-inset ring-black/30",
        muted && "opacity-40 saturate-0",
        className ?? "h-5 w-5"
      )}
    >
      <ResourceGlyph resource={resource} className="h-full w-full rounded" />
      {count > 1 && (
        <span className="absolute -bottom-1 -right-1 rounded bg-slate-950 px-[3px] text-[8px] font-black leading-[1.3] text-white ring-1 ring-white/20">
          {count}
        </span>
      )}
    </span>
  );
}
