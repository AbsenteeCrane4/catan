import { generateBoard, getNodesForBoard } from './hex-utils';
import { PLAYER_COLORS } from './constants';
import { GameAction, GameState } from '@/types/catan';

export const createInitialState = (radius = 2): GameState => {
  const hexes = generateBoard(radius);
  return {
    boardRadius: radius,
    hexes: hexes,
    nodes: getNodesForBoard(hexes),
    settlements: {},
    roads: {},
    players: Array.from({ length: 4 }).map((_, i) => ({
      id: i,
      color: PLAYER_COLORS[i % PLAYER_COLORS.length],
      resources: { wood: 4, brick: 4, sheep: 2, wheat: 2, ore: 0},
      score: 0,
    })),
    currentPlayerIndex: 0,
    diceRoll: null,
    gameLog: ['Game started.'],
    // These two lines satisfy the 'missing properties' error
    isGameOver: false,
    winnerId: null,
  };
};

export function catanReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SYNC_STATE':
      return action.payload;

    case 'BUILD_SETTLEMENT': {
      const { nodeId, playerId } = action.payload;
      const player = state.players[playerId];

      if (state.settlements[nodeId]) return state;

      if (player.resources.wood < 1 || player.resources.brick < 1) return state;

      return {
        ...state,
        settlements: {
          ...state.settlements,
          [nodeId]: { nodeId, playerId, isCity: false }
        },
        players: state.players.map(p => p.id === playerId ? {
          ...p,
          score: p.score + 1,
          resources: { 
            ...p.resources, 
            wood: p.resources.wood - 1, 
            brick: p.resources.brick - 1 
            // deduct sheep and wheat in a full game
          }
        } : p)
      };
    }

    case 'BUILD_ROAD': {
      const { nodeId1, nodeId2, playerId } = action.payload;
      const player = state.players[playerId];
      const roadId = [nodeId1, nodeId2].sort().join('-');
      
      if (state.roads[roadId]) return state;

      if (player.resources.wood < 1 || player.resources.brick < 1) return state;

      return {
        ...state,
        roads: {
          ...state.roads,
          [roadId]: { id: roadId, playerId, nodes: [nodeId1, nodeId2] }
        },
        players: state.players.map(p => p.id === playerId ? {
          ...p,
          resources: { 
            ...p.resources, 
            wood: p.resources.wood - 1, 
            brick: p.resources.brick - 1 
          }
        } : p)
      };
    }

    case 'SET_RADIUS': {
      const radius = action.payload;
      const newHexes = generateBoard(radius);
      return {
        ...state,
        boardRadius: radius,
        hexes: newHexes,
        nodes: getNodesForBoard(newHexes),
        settlements: {},
        roads: {},
      };
    }

    default:
      return state;
  }
}