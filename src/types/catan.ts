export type ResourceType = 'wood' | 'brick' | 'sheep' | 'wheat' | 'ore';
export type HexResource = ResourceType | 'desert';
export type PortResource = ResourceType | '3:1';
export type PlayerColor = 'red' | 'blue' | 'brown' | 'orange' | 'green' | 'white' | 'purple';
export type GamePhase = 'setup1' | 'setup2' | 'main';
export type SetupAction = 'settlement' | 'road' | 'none';
export type DevelopmentCardType = 'Knight' | 'Victory Point' | 'Road Building' | 'Year of Plenty' | 'Monopoly';

export interface Hex {
  q: number;
  r: number;
  s: number;
  resource: HexResource;
  numberToken: number | null; // 2-12
  id: string;
}

export interface Player {
  id: number;
  color: PlayerColor;
  resources: Record<ResourceType, number>;
  victoryPoints: number;
  harbours?: Harbour[]; // Added harbours owned by the player
}

export interface GameState {
  boardRadius: number;
  hexes: Hex[];
  robberHexId: string;
  players: Player[];
  currentPlayerIndex: number;
  diceRoll: number | null;
  gameLog: string[];
  settlements: Record<string, Settlement>;
  nodes: GameNode[];
  harbours: Harbour[];
  roads: Record<string, Road>;
  longestRoadOwnerId: { playerId: number | null; length: number };
  isGameOver: boolean;
  winnerId: number | null;
  phase: GamePhase;
  setupActionRequired: SetupAction;
  currentTradeOffer: TradeOffer | null;
}

export interface GameNode {
  id: string; // "q1,r1|q2,r2|q3,r3" (sorted)
  hexIds: string[]; // The IDs of the 1-3 hexes this node touches
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

export interface TradeOffer {
  initiatorId: number;
  offer: Record<ResourceType, number>;
  request: Record<ResourceType, number>;
}

export interface Harbour {
  id: string;
  type: PortResource;
  nodeIds: [string, string]; // The two Node IDs this harbour touches
  x: number;
  y: number;
  angle: number;
}

export type GameAction = 
  | { type: 'SYNC_STATE'; payload: GameState }
  | { type: 'BUILD_SETTLEMENT'; payload: { nodeId: string; playerId: number } }
  | { type: 'UPGRADE_SETTLEMENT'; payload: { nodeId: string; playerId: number } }
  | { type: 'BUILD_ROAD'; payload: { nodeId1: string; nodeId2: string; playerId: number } }
  | { type: 'ROLL_DICE' }
  | { type: 'SET_RADIUS'; payload: number }
  | { type: 'TRADE_WITH_BANK'; payload: { playerId: number; offerResource: ResourceType; requestResource: ResourceType } }
  | { type: 'PROPOSE_TRADE'; payload: { offer: TradeOffer } }
  | { type: 'ACCEPT_TRADE'; payload: { acceptorId: number } }
  | { type: 'CANCEL_TRADE' }
  | { type: 'END_TURN' };