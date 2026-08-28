import { ResourceType, PlayerColor, HexResource, PortResource, DevelopmentCardType } from "@/types/catan";

export const HEX_SIZE = 50;
export const HEX_WIDTH = Math.sqrt(3) * HEX_SIZE;
export const HEX_HEIGHT = 2 * HEX_SIZE;

export const RESOURCE_COLORS: Record<ResourceType, string> = {
  wood: '#228B22',   
  brick: '#B22222', 
  sheep: '#7CFC00', 
  wheat: '#FFD700', 
  ore: '#708090',   
   
};

export const HEX_RESOURCE_COLORS: Record<HexResource, string> = {...RESOURCE_COLORS, desert: '#F4A460'}

/** Illustrated hex tile art in public/images/tiles, used in place of the flat colour fill. */
export const HEX_TILE_IMAGES: Record<HexResource, string> = {
  wood: '/images/tiles/wood.png',
  brick: '/images/tiles/brick.png',
  sheep: '/images/tiles/sheep.png',
  wheat: '/images/tiles/wheat.png',
  ore: '/images/tiles/ore.png',
  desert: '/images/tiles/desert.png',
};

export const BOARD_BACKGROUND_IMAGE = '/images/sea.png';

/**
 * Every tile PNG is a 1024x1024 canvas with the painted hexagon inset by roughly the
 * same margin (measured directly from the source files, they are not a perfect crop).
 * Used to scale/position each <image> so its hexagon lands exactly on the SVG polygon
 * instead of the image's own square canvas — otherwise tiles would show letterboxing
 * and the board would not read as seamless.
 */
export const TILE_IMAGE_SOURCE_SIZE = 1024;
export const TILE_IMAGE_HEX_BOUNDS = { minX: 58, maxX: 969, minY: 13, maxY: 1012 };

export const RESOURCE_TYPES: ResourceType[] = ['wood', 'brick', 'sheep', 'wheat', 'ore'];

export const PLAYER_COLORS: PlayerColor[] = ['red', 'blue', 'white', 'orange', 'green', 'brown', 'purple'];

/**
 * Tailwind background classes per player colour.
 * These MUST stay complete literal strings — Tailwind v4 cannot see `bg-${color}-700`.
 */
export const PLAYER_COLOR_CLASSES: Record<PlayerColor, string> = {
  red: 'bg-red-700',
  blue: 'bg-blue-700',
  white: 'bg-slate-200',
  orange: 'bg-amber-500',
  green: 'bg-emerald-600',
  brown: 'bg-amber-900',
  purple: 'bg-purple-700',
};

export const PLAYER_COLOR_LABELS: Record<PlayerColor, string> = {
  red: 'Red',
  blue: 'Blue',
  white: 'White',
  orange: 'Orange',
  green: 'Green',
  brown: 'Brown',
  purple: 'Purple',
};

/**
 * Seats used when no player configuration is supplied.
 * The `Player N` names are load-bearing: several existing tests assert on log strings
 * such as "Player 1 claimed the Longest Road". Do not reword them.
 */
export const DEFAULT_SEATS: { name: string; color: PlayerColor }[] = PLAYER_COLORS
  .slice(0, 4)
  .map((color, i) => ({ name: `Player ${i + 1}`, color }));

export const BASE_GAME_RESOURCES: HexResource[] = [
  'wood', 'wood', 'wood', 'wood',
  'sheep', 'sheep', 'sheep', 'sheep',
  'wheat', 'wheat', 'wheat', 'wheat',
  'brick', 'brick', 'brick',
  'ore', 'ore', 'ore',
  'desert'
];

export const BASE_GAME_TOKENS = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12];
export const BASE_PORTS: PortResource[] = ['3:1', '3:1', '3:1', '3:1', 'wood', 'brick', 'wheat', 'sheep', 'ore'];

/** How many of each development card a deck holds. */
export type DevCardCounts = Record<DevelopmentCardType, number>;

export const BASE_DEV_CARDS: DevCardCounts = {
  knight: 14,
  victoryPoint: 5,
  roadBuilding: 2,
  yearOfPlenty: 2,
  monopoly: 2,
};

/**
 * Pools for the official Catan 5-6 player extension.
 * 30 hexes, of which 2 are deserts, leaving 28 numbered hexes.
 */
export const EXPANSION_RESOURCES: HexResource[] = [
  'wood', 'wood', 'wood', 'wood', 'wood', 'wood',
  'sheep', 'sheep', 'sheep', 'sheep', 'sheep', 'sheep',
  'wheat', 'wheat', 'wheat', 'wheat', 'wheat', 'wheat',
  'brick', 'brick', 'brick', 'brick', 'brick',
  'ore', 'ore', 'ore', 'ore', 'ore',
  'desert', 'desert'
];

export const EXPANSION_TOKENS = [
  2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 6,
  8, 8, 8, 9, 9, 9, 10, 10, 10, 11, 11, 11, 12, 12
];

/**
 * 11 harbours: 5 generic plus 6 resource-specific.
 * The extension adds a SECOND wool harbour, which is why there are six specific ports
 * but only five resource types — the duplicate sheep entry is correct, not a typo.
 */
export const EXPANSION_PORTS: PortResource[] = [
  '3:1', '3:1', '3:1', '3:1', '3:1',
  'wood', 'brick', 'wheat', 'ore', 'sheep', 'sheep'
];

export const EXPANSION_DEV_CARDS: DevCardCounts = {
  knight: 20,
  victoryPoint: 6,
  roadBuilding: 3,
  yearOfPlenty: 3,
  monopoly: 2,
};