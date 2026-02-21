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

function getAdjacentNodeIds(targetNodeId: string, allNodes: GameNode[]): string[] {
  const targetNode = allNodes.find(n => n.id === targetNodeId);
  if (!targetNode) return [];

  const distances = allNodes
    .filter(n => n.id !== targetNodeId)
    .map(n => ({
      id: n.id,
      dist: Math.hypot(n.pixelPos.x - targetNode.pixelPos.x, n.pixelPos.y - targetNode.pixelPos.y)
    }))
    .sort((a, b) => a.dist - b.dist);

  if (distances.length === 0) return [];
  const threshold = distances[0].dist + 2; 

  return distances.filter(d => d.dist <= threshold).map(d => d.id);
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

      if (total === 7) {
        return { ...state, diceRoll: 7, gameLog: ["7 rolled! Robber active.", ...state.gameLog] };
      }

      const producingHexes = state.hexes.filter(h => h.numberToken === total);
      let newPlayers = state.players.map(p => ({ ...p, resources: { ...p.resources } }));

      producingHexes.forEach(hex => {
        if (hex.resource === 'desert') return;
        const resKey = hex.resource;

        Object.values(state.settlements).forEach(settlement => {
          const node = state.nodes.find(n => n.id === settlement.nodeId);
          
          if (node && node.hexIds?.includes(hex.id)) {
            const amount = settlement.isCity ? 2 : 1;
            newPlayers[settlement.playerId].resources[resKey] += amount;
          }
        });
      });

      return {
        ...state,
        diceRoll: total,
        players: newPlayers,
        gameLog: [`Rolled a ${total}. Resources distributed.`, ...state.gameLog]
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
      if (state.settlements[nodeId]) return state;

      const neighbors = getAdjacentNodeIds(nodeId, state.nodes);
      if (neighbors.some(id => state.settlements[id])) {
        return { ...state, gameLog: ["Too close to another settlement!", ...state.gameLog] };
      }

      const isInitial = Object.values(state.settlements).filter(s => s.playerId === playerId).length < 2;
      if (!isInitial && !isNodeConnectedToPlayerRoad(nodeId, state.roads, playerId)) {
        return { ...state, gameLog: ["Must connect to a road!", ...state.gameLog] };
      }

      const player = state.players[playerId];
      if (!isInitial && (player.resources.wood < 1 || player.resources.brick < 1 || player.resources.wheat < 1 || player.resources.sheep < 1)) {
        return { ...state, gameLog: ["Not enough resources!", ...state.gameLog] };
      }

      return {
        ...state,
        settlements: { ...state.settlements, [nodeId]: { nodeId, playerId, isCity: false } },
        players: state.players.map(p => p.id === playerId ? {
          ...p,
          score: p.score + 1,
          resources: isInitial ? p.resources : { 
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

      const touchesPiece = (state.settlements[nodeId1]?.playerId === playerId) || 
                           (state.settlements[nodeId2]?.playerId === playerId) ||
                           isNodeConnectedToPlayerRoad(nodeId1, state.roads, playerId) || 
                           isNodeConnectedToPlayerRoad(nodeId2, state.roads, playerId);

      if (!touchesPiece) return { ...state, gameLog: ["Road must connect!", ...state.gameLog] };

      const isInitial = Object.values(state.roads).filter(r => r.playerId === playerId).length < 2;
      const player = state.players[playerId];
      if (!isInitial && (player.resources.wood < 1 || player.resources.brick < 1)) {
        return { ...state, gameLog: ["Not enough resources!", ...state.gameLog] };
      }

      return {
        ...state,
        roads: { ...state.roads, [roadId]: { id: roadId, playerId, nodes: [nodeId1, nodeId2] } },
        players: state.players.map(p => p.id === playerId ? {
          ...p,
          resources: isInitial ? p.resources : { ...p.resources, wood: p.resources.wood - 1, brick: p.resources.brick - 1 }
        } : p),
        gameLog: [`Player ${playerId + 1} built a road.`, ...state.gameLog]
      };
    }

    default: return state;
  }
}