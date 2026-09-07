import type { ResourceType } from "@/types/catan";

/**
 * A resource as a flat icon, for the sizes where the painted card art stops working.
 *
 * The hand draws real illustrated cards, but a build cost is 16px across, and a crop of a
 * painting at that size is mud. These are the same five resources reduced to one
 * recognisable shape each, which is what `docs/DESIGN.md` §29 asks of an icon.
 */
const GLYPHS: Record<ResourceType, { ground: string; art: React.ReactNode }> = {
  wood: {
    ground: '#2f6f33',
    art: (
      <g>
        <rect x="2.5" y="9" width="19" height="7" rx="3.5" fill="#8a5a2b" />
        <ellipse cx="6" cy="12.5" rx="3" ry="3.5" fill="#c99a5b" />
        <ellipse cx="6" cy="12.5" rx="1.3" ry="1.6" fill="#8a5a2b" />
        <rect x="4" y="16.5" width="16" height="5" rx="2.5" fill="#6f4522" />
      </g>
    ),
  },
  brick: {
    ground: '#8d3b2a',
    art: (
      <g fill="#e8a087">
        <rect x="2.5" y="6" width="9" height="5" rx="1" />
        <rect x="12.5" y="6" width="9" height="5" rx="1" />
        <rect x="2.5" y="12" width="19" height="5" rx="1" />
        <rect x="7" y="18" width="10" height="4" rx="1" />
      </g>
    ),
  },
  sheep: {
    ground: '#78b846',
    art: (
      <g>
        <ellipse cx="11" cy="13" rx="8" ry="6.5" fill="#f8fafc" />
        <ellipse cx="6" cy="9" rx="3.5" ry="3" fill="#f8fafc" />
        <ellipse cx="17.5" cy="10" rx="4" ry="4.5" fill="#e2e8f0" />
        <circle cx="19" cy="9" r="1.1" fill="#334155" />
        <rect x="7" y="18" width="2.2" height="4" rx="1" fill="#475569" />
        <rect x="13" y="18" width="2.2" height="4" rx="1" fill="#475569" />
      </g>
    ),
  },
  wheat: {
    ground: '#d4a017',
    art: (
      <g>
        <path d="M12 22V7" stroke="#6b4a10" strokeWidth="2" strokeLinecap="round" />
        <g fill="#fde68a" stroke="#6b4a10" strokeWidth="0.8">
          <ellipse cx="12" cy="4.5" rx="2" ry="3" />
          <ellipse cx="7.5" cy="8.5" rx="2" ry="3" transform="rotate(-30 7.5 8.5)" />
          <ellipse cx="16.5" cy="8.5" rx="2" ry="3" transform="rotate(30 16.5 8.5)" />
          <ellipse cx="7.5" cy="13.5" rx="2" ry="3" transform="rotate(-30 7.5 13.5)" />
          <ellipse cx="16.5" cy="13.5" rx="2" ry="3" transform="rotate(30 16.5 13.5)" />
        </g>
      </g>
    ),
  },
  ore: {
    ground: '#5b6b7d',
    art: (
      <g>
        <path d="M12 3 L20 9 L17 20 L7 20 L4 9 Z" fill="#cbd5e1" />
        <path d="M12 3 L20 9 L12 12 Z" fill="#f1f5f9" />
        <path d="M4 9 L12 12 L7 20 Z" fill="#94a3b8" />
        <path d="M12 12 L17 20 L7 20 Z" fill="#e2e8f0" />
      </g>
    ),
  },
};

export function ResourceGlyph({ resource, className }: { resource: ResourceType; className?: string }) {
  const glyph = GLYPHS[resource];
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden focusable="false">
      <rect width="24" height="24" rx="4" fill={glyph.ground} />
      {glyph.art}
    </svg>
  );
}
