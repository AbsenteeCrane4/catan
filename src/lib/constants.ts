// lib/constants.ts
import { ResourceType, PlayerColor, HexResource } from "@/types/catan";

export const HEX_SIZE = 50;
export const HEX_WIDTH = Math.sqrt(3) * HEX_SIZE;
export const HEX_HEIGHT = 2 * HEX_SIZE;

export const RESOURCE_COLORS: Record<HexResource, string> = {
  wood: '#228B22',   
  brick: '#B22222', 
  sheep: '#7CFC00', 
  wheat: '#FFD700', 
  ore: '#708090',   
  desert: '#F4A460', 
};

export const RESOURCE_TYPES: ResourceType[] = ['wood', 'brick', 'sheep', 'wheat', 'ore'];

export const PLAYER_COLORS: PlayerColor[] = ['red', 'blue', 'white', 'orange', 'green', 'brown', 'purple', 'gray'];