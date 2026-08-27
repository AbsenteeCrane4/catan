import { ResourceType, PlayerColor, HexResource, PortResource } from "@/types/catan";

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