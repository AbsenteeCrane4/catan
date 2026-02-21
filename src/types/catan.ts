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
  resources: {
    wood: number;
    brick: number;
    sheep: number;
    wheat: number;
    ore: number;
  };
  score: number;
}

export interface GameState {
  boardRadius: number;
  hexes: Hex[];
  players: Player[];
  currentPlayerIndex: number;
  diceRoll: number | null;
  gameLog: string[];
  settlements: Record<string, Settlement>;
  nodes: GameNode[];
  roads: Record<string, Road>;
  isGameOver: boolean;
  winnerId: number | null;
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

export type GameAction = 
  | { type: 'SYNC_STATE'; payload: GameState }
  | { type: 'BUILD_SETTLEMENT'; payload: { nodeId: string; playerId: number } }
  | { type: 'BUILD_ROAD'; payload: { nodeId1: string; nodeId2: string; playerId: number } }
  | { type: 'ROLL_DICE' }
  | { type: 'SET_RADIUS'; payload: number }
  | { type: 'END_TURN' };