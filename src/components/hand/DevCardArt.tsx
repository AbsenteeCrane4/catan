import type { DevelopmentCardType } from "@/types/catan";

/**
 * Card-face emblems for the five development cards.
 *
 * Terrain has painted art in `public/images/tiles`; development cards have none, so each
 * one gets a flat emblem drawn here instead of a generic icon, which is what makes a
 * Knight readable as a Knight at 40px on a card face.
 */
const ART: Record<DevelopmentCardType, { accent: string; ink: string; path: React.ReactNode }> = {
  knight: {
    accent: '#b91c1c',
    ink: '#fecaca',
    path: (
      <>
        <path d="M24 6c-7 0-12 5-12 12v6l-4 5 6 3v10h20V32l6-3-4-5v-6c0-7-5-12-12-12Z" />
        <path d="M18 20h5M25 20h5" stroke="#7f1d1d" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        <path d="M24 26v8" stroke="#7f1d1d" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      </>
    ),
  },
  victoryPoint: {
    accent: '#a16207',
    ink: '#fde68a',
    path: (
      <>
        <path d="M24 5 L29.5 17.5 L43 19.2 L33 28.4 L35.6 42 L24 35.4 L12.4 42 L15 28.4 L5 19.2 L18.5 17.5 Z" />
        <circle cx="24" cy="23" r="4.5" fill="#a16207" />
      </>
    ),
  },
  roadBuilding: {
    accent: '#c2410c',
    ink: '#fed7aa',
    path: (
      <>
        <rect x="4" y="27" width="19" height="7" rx="2" transform="rotate(-24 4 27)" />
        <rect x="25" y="18" width="19" height="7" rx="2" transform="rotate(24 25 18)" />
        <circle cx="24" cy="24.5" r="3.5" fill="#7c2d12" />
      </>
    ),
  },
  yearOfPlenty: {
    accent: '#15803d',
    ink: '#bbf7d0',
    path: (
      <>
        <path d="M24 40c0-9-5-15-13-17 0 9 5 15 13 17Z" />
        <path d="M24 40c0-9 5-15 13-17 0 9-5 15-13 17Z" />
        <path d="M24 42V20c0-6 3-11 8-14-2 6-3 10-3 14" stroke="#14532d" strokeWidth="3" strokeLinecap="round" fill="none" />
      </>
    ),
  },
  monopoly: {
    accent: '#6d28d9',
    ink: '#ddd6fe',
    path: (
      <>
        <path d="M24 14 8 24l16 10 16-10-16-10Z" />
        <path d="M24 4v6M12 9l3 5M36 9l-3 5" stroke="#4c1d95" strokeWidth="3" strokeLinecap="round" fill="none" />
        <path d="M8 30l16 10 16-10" stroke="#4c1d95" strokeWidth="3" strokeLinejoin="round" fill="none" />
      </>
    ),
  },
};

export const devCardAccent = (type: DevelopmentCardType) => ART[type].accent;

export function DevCardArt({ type, className }: { type: DevelopmentCardType; className?: string }) {
  const art = ART[type];
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden focusable="false" fill={art.ink}>
      {art.path}
    </svg>
  );
}
