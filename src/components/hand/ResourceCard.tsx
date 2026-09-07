import Image from "next/image";
import { clsx } from "clsx";
import type { ResourceType } from "@/types/catan";
import { RESOURCE_CARD_IMAGES, RESOURCE_COLORS, RESOURCE_LABELS } from "@/lib/constants";

interface ResourceCardProps {
  resource: ResourceType;
  /** How many of this resource the player holds. Always >= 1; zero is not rendered. */
  count: number;
  /** True for one beat after the count went up, to animate the card. */
  justGained?: boolean;
}

/**
 * One resource type in the player's hand: a single card face carrying the count, not
 * `count` separate cards.
 *
 * The face crops into the middle of the hex terrain art rather than fitting it. Those
 * source images are pointy-top hexes on transparency, so anything that shows the whole
 * image puts two transparent wedges across the top of the card; scaling past the frame
 * keeps only the painted interior.
 */
export function ResourceCard({ resource, count, justGained = false }: ResourceCardProps) {
  const stackDepth = Math.min(count - 1, 2);

  return (
    <div
      data-cy="hand-resource-card"
      data-resource={resource}
      data-count={count}
      className="relative shrink-0"
      title={`${RESOURCE_LABELS[resource]} ×${count}`}
    >
      {/* Cards behind the face, so a stack reads as a stack before the badge is read. */}
      {Array.from({ length: stackDepth }).map((_, i) => (
        <div
          key={i}
          aria-hidden
          className="absolute inset-0 rounded-lg border border-amber-100/25 bg-slate-800 shadow-md"
          style={{ transform: `translate(${(i + 1) * 3}px, ${(i + 1) * -3}px) rotate(${(i + 1) * 2}deg)` }}
        />
      ))}

      <div
        className={clsx(
          "relative h-[92px] w-[64px] overflow-hidden rounded-lg border-2 border-amber-100/70",
          "shadow-[0_4px_10px_rgba(2,6,23,0.6)] transition-transform duration-150",
          "hover:-translate-y-1.5 xl:h-[106px] xl:w-[74px]",
          justGained && "animate-card-gain"
        )}
        style={{ backgroundColor: RESOURCE_COLORS[resource] }}
      >
        <Image
          src={RESOURCE_CARD_IMAGES[resource]}
          alt=""
          fill
          sizes="74px"
          className="scale-[1.6] object-cover object-center"
        />

        {/* Keeps the label readable over whatever part of the painting sits beneath it. */}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-slate-950/90 to-transparent" />

        <span className="absolute inset-x-0 bottom-1 text-center text-[9px] font-black uppercase tracking-wider text-amber-50 drop-shadow">
          {RESOURCE_LABELS[resource]}
        </span>

        <span
          data-cy="hand-resource-count"
          className="absolute -top-0.5 -right-0.5 min-w-[20px] rounded-bl-lg rounded-tr-md bg-slate-950/90 px-1.5 py-0.5 text-center text-[11px] font-black text-white ring-1 ring-inset ring-white/20"
        >
          {count}
        </span>
      </div>
    </div>
  );
}
