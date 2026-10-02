import { clsx } from "clsx";
import type { ResourceType } from "@/types/catan";
import { RESOURCE_CARD_BORDERS, RESOURCE_LABELS } from "@/lib/constants";
import { tileArtStyle } from "@/components/hud/primitives";

interface ResourceCardProps {
  resource: ResourceType;
  /** How many of this resource the player holds. Always >= 1; zero is not rendered. */
  count: number;
  /** True for one beat after the count went up, to animate the card. */
  justGained?: boolean;
}

/** Card size shared by every card in the hand bar; grows on tall screens. */
export const HAND_CARD_SIZE =
  "h-[112px] w-[79px] [@media(min-height:880px)]:h-[142px] [@media(min-height:880px)]:w-[100px]";

/**
 * One resource type in the player's hand: a single card carrying the count, not `count`
 * separate cards.
 *
 * The face is the resource's tile illustration, full-bleed, with no label and no scrim —
 * the art is the card. The source images are pointy-top hexes on transparency, so the art
 * is zoomed past the hexagon's corners (see `tileArtStyle`).
 */
export function ResourceCard({ resource, count, justGained = false }: ResourceCardProps) {
  return (
    <div
      data-cy="hand-resource-card"
      data-resource={resource}
      data-count={count}
      title={`${RESOURCE_LABELS[resource]} ×${count}`}
      className={clsx(
        "relative shrink-0 overflow-hidden rounded-lg border-2 bg-[#0d1b2e] shadow-[0_10px_24px_rgba(2,8,18,0.5)]",
        "transition-transform duration-150 hover:-translate-y-1.5",
        HAND_CARD_SIZE,
        justGained && "animate-card-gain"
      )}
      style={{ borderColor: RESOURCE_CARD_BORDERS[resource] }}
    >
      <span className="absolute inset-0" style={tileArtStyle(resource)} aria-hidden />
      <span className="sr-only">{RESOURCE_LABELS[resource]}</span>

      <span
        data-cy="hand-resource-count"
        className="absolute right-1.5 bottom-[5px] flex h-[22px] min-w-[22px] items-center justify-center rounded-[5px] bg-[rgba(6,14,28,0.5)] px-[5px] text-[15px] font-extrabold text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.9)]"
      >
        {count}
      </span>
    </div>
  );
}
