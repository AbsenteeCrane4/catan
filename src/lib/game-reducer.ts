import { GameState, GameAction } from "@/types/catan";
import { generateBoard, getNodesForBoard } from "./hex-utils";
import { PLAYER_COLORS } from "./constants";

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
    isGameOver: false,
    winnerId: null,
  };
};

function isNodeAdjacentToHex(nodeId: string, hexId: string): boolean {
  return nodeId.startsWith(hexId);
}

export function catanReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SYNC_STATE':
      return action.payload;

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
        gameLog: [`Board size changed to ${radius}. Resetting board.`, ...state.gameLog],
      };
    }

    case 'ROLL_DICE': {
      const die1 = Math.floor(Math.random() * 6) + 1;
      const die2 = Math.floor(Math.random() * 6) + 1;
      const total = die1 + die2;
      
      let newLog = [`Dice Rolled: ${total} (${die1}+${die2})`, ...state.gameLog];
      let updatedPlayers = [...state.players];

      if (total !== 7) {
        const activeHexes = state.hexes.filter(h => h.numberToken === total);

        activeHexes.forEach(hex => {
          Object.values(state.settlements).forEach(settlement => {
            if (isNodeAdjacentToHex(settlement.nodeId, hex.id)) {
              const amount = settlement.isCity ? 2 : 1;
              const playerIdx = updatedPlayers.findIndex(p => p.id === settlement.playerId);
              
              if (playerIdx !== -1 && hex.resource !== 'desert') {
                const resKey = hex.resource as keyof (typeof updatedPlayers[typeof playerIdx]['resources']);
                const currentCount = updatedPlayers[playerIdx].resources[resKey];

                updatedPlayers[playerIdx] = {
                  ...updatedPlayers[playerIdx],
                  resources: {
                    ...updatedPlayers[playerIdx].resources,
                    [resKey]: currentCount + amount
                  }
                };
                newLog = [`Player ${settlement.playerId + 1} collected ${amount} ${hex.resource}`, ...newLog];
              }
            }
          });
        });
      } else {
        newLog = ["7 rolled! The robber is hungry.", ...newLog];
      }

      return {
        ...state,
        diceRoll: total,
        players: updatedPlayers,
        gameLog: newLog.slice(0, 50),
      };
    }

    case 'END_TURN': {
      const nextPlayer = (state.currentPlayerIndex + 1) % state.players.length;
      return {
        ...state,
        currentPlayerIndex: nextPlayer,
        diceRoll: null,
        gameLog: [`--- Player ${nextPlayer + 1}'s Turn ---`, ...state.gameLog],
      };
    }

    case 'BUILD_SETTLEMENT': {
      const { nodeId, playerId } = action.payload;
      const player = state.players[playerId];
      
      if (state.settlements[nodeId]) return state;
      if (player.resources.wood < 1 || player.resources.brick < 1 || player.resources.wheat < 1 || player.resources.sheep < 1) {
         return { ...state, gameLog: ["Not enough resources to build settlement!", ...state.gameLog] };
      }

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
            brick: p.resources.brick - 1,
            wheat: p.resources.wheat - 1,
            sheep: p.resources.sheep - 1
          }
        } : p),
        gameLog: [`Player ${playerId + 1} built a settlement.`, ...state.gameLog]
      };
    }

    case 'BUILD_ROAD': {
      const { nodeId1, nodeId2, playerId } = action.payload;
      const player = state.players[playerId];
      const roadId = [nodeId1, nodeId2].sort().join('-');
      
      if (state.roads[roadId]) return state;
      if (player.resources.wood < 1 || player.resources.brick < 1) {
        return { ...state, gameLog: ["Not enough resources to build road!", ...state.gameLog] };
      }

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
        } : p),
        gameLog: [`Player ${playerId + 1} built a road.`, ...state.gameLog]
      };
    }

    default:
      return state;
  }
}