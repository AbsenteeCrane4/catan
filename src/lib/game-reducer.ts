import { GameState, GameAction, GameNode } from "@/types/catan";
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

function getAdjacentNodeIds(targetNodeId: string, allNodes: GameNode[]): string[] {
  const targetNode = allNodes.find(n => n.id === targetNodeId);
  
  if (!targetNode || targetNode.pixelPos.x === undefined || targetNode.pixelPos.y === undefined) return [];

  const distances = allNodes
    .filter(n => n.id !== targetNodeId && n.pixelPos.x !== undefined && n.pixelPos.y !== undefined)
    .map(n => ({
      id: n.id,
      dist: Math.hypot(n.pixelPos.x - targetNode.pixelPos.x, n.pixelPos.y - targetNode.pixelPos.y)
    }))
    .sort((a, b) => a.dist - b.dist);

  if (distances.length === 0) return [];

  const edgeLength = distances[0].dist;
  const threshold = edgeLength + 2; 

  return distances
    .filter(d => d.dist <= threshold)
    .map(d => d.id);
}

function isNodeConnectedToPlayerRoad(nodeId: string, roads: Record<string, any>, playerId: number): boolean {
  return Object.values(roads).some(road => 
    road.playerId === playerId && (road.nodes[0] === nodeId || road.nodes[1] === nodeId)
  );
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
      const updatedPlayers = [...state.players];

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

      const neighbors = getAdjacentNodeIds(nodeId, state.nodes);
      const isTooClose = neighbors.some(neighborId => state.settlements[neighborId]);
      
      if (isTooClose) {
        return { ...state, gameLog: ["Distance Rule: Too close to another settlement!", ...state.gameLog] };
      }

      const hasConnectingRoad = isNodeConnectedToPlayerRoad(nodeId, state.roads, playerId);
      const isInitialPhase = Object.values(state.settlements).filter(s => s.playerId === playerId).length < 2;
      
      if (!hasConnectingRoad && !isInitialPhase) {
        return { ...state, gameLog: ["You must connect settlements to your roads!", ...state.gameLog] };
      }

      if (!isInitialPhase && (player.resources.wood < 1 || player.resources.brick < 1 || player.resources.wheat < 1 || player.resources.sheep < 1)) {
        return { ...state, gameLog: ["Not enough resources!", ...state.gameLog] };
      }

      return {
        ...state,
        settlements: { ...state.settlements, [nodeId]: { nodeId, playerId, isCity: false } },
        players: state.players.map(p => p.id === playerId ? {
          ...p,
          score: p.score + 1,
          resources: isInitialPhase ? p.resources : { 
            ...p.resources, 
            wood: p.resources.wood - 1, brick: p.resources.brick - 1,
            wheat: p.resources.wheat - 1, sheep: p.resources.sheep - 1 
          }
        } : p),
        gameLog: [`Player ${playerId + 1} built a settlement.`, ...state.gameLog]
      };
    }

    case 'BUILD_ROAD': {
      const { nodeId1, nodeId2, playerId } = action.payload;
      const roadId = [nodeId1, nodeId2].sort().join('-');
      
      if (state.roads[roadId]) return state;

      const touchesOwnedSettlement = 
        (state.settlements[nodeId1]?.playerId === playerId) || 
        (state.settlements[nodeId2]?.playerId === playerId);
      
      const touchesOwnedRoad = 
        isNodeConnectedToPlayerRoad(nodeId1, state.roads, playerId) || 
        isNodeConnectedToPlayerRoad(nodeId2, state.roads, playerId);

      if (!touchesOwnedSettlement && !touchesOwnedRoad) {
        return { ...state, gameLog: ["Roads must connect to your existing pieces!", ...state.gameLog] };
      }

      const player = state.players[playerId];
      const isInitialPhase = Object.values(state.roads).filter(r => r.playerId === playerId).length < 2;
      
      if (!isInitialPhase && (player.resources.wood < 1 || player.resources.brick < 1)) {
        return { ...state, gameLog: ["Not enough resources for a road!", ...state.gameLog] };
      }

      return {
        ...state,
        roads: { ...state.roads, [roadId]: { id: roadId, playerId, nodes: [nodeId1, nodeId2] } },
        players: state.players.map(p => p.id === playerId ? {
          ...p,
          resources: isInitialPhase ? p.resources : { ...p.resources, wood: p.resources.wood - 1, brick: p.resources.brick - 1 }
        } : p),
        gameLog: [`Player ${playerId + 1} built a road.`, ...state.gameLog]
      };
    }

    default:
      return state;
  }
}