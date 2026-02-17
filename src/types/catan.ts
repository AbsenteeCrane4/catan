// types/catan.ts
export type ResourceType = 'wood' | 'brick' | 'sheep' | 'wheat' | 'ore' | 'desert';
export type PlayerColor = 'red' | 'blue' | 'white' | 'orange' | 'green' | 'brown' | 'purple' | 'gray';

export interface Hex {
  q: number;
  r: number;
  s: number;
  resource: ResourceType;
  numberToken: number | null; // 2-12
  id: string;
}

export interface Player {
  id: number;
  color: PlayerColor;
  resources: Record<ResourceType, number>;
  score: number;
}

export interface GameState {
  boardRadius: number;
  hexes: Hex[];
  players: Player[];
  currentPlayerIndex: number;
  diceRoll: number | null;
  gameLog: string[];
  winner: number | null;
}