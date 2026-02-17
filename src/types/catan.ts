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
  settlements: Record<string, Settlement>; // Keyed by Node ID
  nodes: GameNode[]; // All valid intersections on the board
  roads: Record<string, Road>; // Track built roads
}

export interface GameNode {
  id: string; // "q1,r1|q2,r2|q3,r3" (sorted)
  hexCoords: { q: number; r: number }[];
  pixelPos: { x: number; y: number };
  neighbors: string[]; // List of Node IDs this node connects to
}

export interface Settlement {
  nodeId: string;
  playerId: number;
  isCity: boolean;
}

export interface Road {
  id: string; // "nodeId1|nodeId2" (sorted)
  playerId: number;
  nodes: [string, string]; // The two Node IDs this road connects
}