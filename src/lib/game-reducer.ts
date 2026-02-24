import { GameState, GameAction, GameNode, ResourceType } from "@/types/catan";
import { generateBoard, getNodesForBoard } from "@/lib/hex-utils";
import { PLAYER_COLORS } from "@/lib/constants";

export const createInitialState = (radius = 2): GameState => {
  const hexes = generateBoard(radius);
  return {
    boardRadius: radius,
    hexes: hexes,
    robberHexId: hexes.find(h => h.resource === 'desert')?.id || '', // Place robber on desert
    nodes: getNodesForBoard(hexes),
    settlements: {},
    roads: {},
    currentTradeOffer: null,
    players: Array.from({ length: 4 }).map((_, i) => ({
      id: i,
      color: PLAYER_COLORS[i % PLAYER_COLORS.length],
      resources: { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 }, // Start at 0!
      victoryPoints: 0,
    })),
    currentPlayerIndex: 0,
    diceRoll: null,
    gameLog: ['Game started. Player 1, place your first settlement.'],
    isGameOver: false,
    winnerId: null,
    phase: 'setup1',
    setupActionRequired: 'settlement',
  };
};

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
      return createInitialState(action.payload);
    }

    case 'UPGRADE_SETTLEMENT': {
      const { nodeId, playerId } = action.payload;
      
      if (state.phase !== 'main') return { ...state, gameLog: ["Cities can only be built during the main phase.", ...state.gameLog] };
      if (state.currentPlayerIndex !== playerId) return state; // Ignore out-of-turn clicks

      const settlement = state.settlements[nodeId];
      if (!settlement) return { ...state, gameLog: ["No settlement here to upgrade.", ...state.gameLog] };
      if (settlement.playerId !== playerId) return { ...state, gameLog: ["You can only upgrade your own settlements.", ...state.gameLog] };
      if (settlement.isCity) return { ...state, gameLog: ["This is already a city.", ...state.gameLog] };

      const player = state.players[playerId];
      
      // Rule: Costs 3 Ore and 2 Wheat
      if (player.resources.ore < 3 || player.resources.wheat < 2) {
        return { ...state, gameLog: ["Not enough resources for a city (Requires 3 Ore, 2 Wheat).", ...state.gameLog] };
      }

      // Deduct resources
      const newPlayers = [...state.players];
      newPlayers[playerId] = {
        ...player,
        resources: {
          ...player.resources,
          ore: player.resources.ore - 3,
          wheat: player.resources.wheat - 2
        },
        // A city is worth 2 VPs total (+1 from the existing settlement)
        victoryPoints: player.victoryPoints + 1 
      };

      return {
        ...state,
        players: newPlayers,
        settlements: {
          ...state.settlements,
          [nodeId]: { ...settlement, isCity: true }
        },
        gameLog: [`Player ${playerId + 1} upgraded a settlement to a City!`, ...state.gameLog]
      };
    }

    case 'ROLL_DICE': {
      if (state.phase !== 'main') {
        return { ...state, gameLog: ["Finish the setup phase before rolling!", ...state.gameLog] };
      }

      const die1 = Math.floor(Math.random() * 6) + 1;
      const die2 = Math.floor(Math.random() * 6) + 1;
      const total = die1 + die2;

      if (total === 7) return { ...state, diceRoll: 7, gameLog: ["7 rolled! Robber active.", ...state.gameLog] };

      const producingHexes = state.hexes.filter(h => h.numberToken === total);
      const newPlayers = state.players.map(p => ({ ...p, resources: { ...p.resources } }));

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

      return { ...state, diceRoll: total, players: newPlayers, gameLog: [`Rolled a ${total}.`, ...state.gameLog] };
    }

    case 'END_TURN': {
      if (state.phase !== 'main') {
        return { ...state, gameLog: ["Cannot end turn manually during setup!", ...state.gameLog] };
      }
      const nextPlayer = (state.currentPlayerIndex + 1) % state.players.length;
      return { ...state, currentPlayerIndex: nextPlayer, diceRoll: null, gameLog: [`--- Player ${nextPlayer + 1}'s Turn ---`, ...state.gameLog] };
    }

    case 'BUILD_SETTLEMENT': {
      const { nodeId, playerId } = action.payload;
      
      if (playerId !== state.currentPlayerIndex) return { ...state, gameLog: ["It's not your turn!", ...state.gameLog] };
      if (state.phase !== 'main' && state.setupActionRequired !== 'settlement') {
        return { ...state, gameLog: ["You must build a road right now!", ...state.gameLog] };
      }
      if (state.settlements[nodeId]) return state;

      const neighbors = getAdjacentNodeIds(nodeId, state.nodes);
      if (neighbors.some(id => state.settlements[id])) {
        return { ...state, gameLog: ["Too close to another settlement!", ...state.gameLog] };
      }

      const isInitial = state.phase !== 'main';
      if (!isInitial && !isNodeConnectedToPlayerRoad(nodeId, state.roads, playerId)) {
        return { ...state, gameLog: ["Must connect to a road!", ...state.gameLog] };
      }

      const player = state.players[playerId];
      if (!isInitial && (player.resources.wood < 1 || player.resources.brick < 1 || player.resources.wheat < 1 || player.resources.sheep < 1)) {
        return { ...state, gameLog: ["Not enough resources!", ...state.gameLog] };
      }

      // Clone players for updates
      const updatedPlayers = state.players.map(p => ({ ...p, resources: { ...p.resources } }));
      
      // Pay for settlement (if in main game)
      if (!isInitial) {
        updatedPlayers[playerId].resources.wood -= 1;
        updatedPlayers[playerId].resources.brick -= 1;
        updatedPlayers[playerId].resources.wheat -= 1;
        updatedPlayers[playerId].resources.sheep -= 1;
      }

      // Give starting resources if this is Setup Phase 2
      if (state.phase === 'setup2') {
        const node = state.nodes.find(n => n.id === nodeId);
        if (node) {
          node.hexIds.forEach(hexId => {
            const hex = state.hexes.find(h => h.id === hexId);
            if (hex && hex.resource !== 'desert') {
              updatedPlayers[playerId].resources[hex.resource] += 1;
            }
          });
        }
      }

      updatedPlayers[playerId].victoryPoints += 1;

      return {
        ...state,
        settlements: { ...state.settlements, [nodeId]: { nodeId, playerId, isCity: false } },
        players: updatedPlayers,
        setupActionRequired: isInitial ? 'road' : state.setupActionRequired,
        gameLog: [`Player ${playerId + 1} built a settlement.`, ...state.gameLog]
      };
    }

    case 'BUILD_ROAD': {
      const { nodeId1, nodeId2, playerId } = action.payload;
      
      if (playerId !== state.currentPlayerIndex) return { ...state, gameLog: ["It's not your turn!", ...state.gameLog] };
      if (state.phase !== 'main' && state.setupActionRequired !== 'road') {
        return { ...state, gameLog: ["You must build a settlement first!", ...state.gameLog] };
      }

      const roadId = [nodeId1, nodeId2].sort().join('-');
      if (state.roads[roadId]) return state;

      const touchesPiece = (state.settlements[nodeId1]?.playerId === playerId) || 
                           (state.settlements[nodeId2]?.playerId === playerId) ||
                           isNodeConnectedToPlayerRoad(nodeId1, state.roads, playerId) || 
                           isNodeConnectedToPlayerRoad(nodeId2, state.roads, playerId);

      if (!touchesPiece) return { ...state, gameLog: ["Road must connect!", ...state.gameLog] };

      const isInitial = state.phase !== 'main';
      const player = state.players[playerId];
      
      if (!isInitial && (player.resources.wood < 1 || player.resources.brick < 1)) {
        return { ...state, gameLog: ["Not enough resources!", ...state.gameLog] };
      }

      // Handle Snake Draft Turn Advance
      let nextPhase = state.phase;
      let nextPlayer = state.currentPlayerIndex;
      let nextAction = state.setupActionRequired;

      if (state.phase === 'setup1') {
        if (nextPlayer === state.players.length - 1) {
          nextPhase = 'setup2';
          nextAction = 'settlement';
          // Last player goes again, so index stays the same
        } else {
          nextPlayer++;
          nextAction = 'settlement';
        }
      } else if (state.phase === 'setup2') {
        if (nextPlayer === 0) {
          nextPhase = 'main';
          nextAction = 'none';
          // Game begins normally with Player 1
        } else {
          nextPlayer--;
          nextAction = 'settlement';
        }
      }

      return {
        ...state,
        phase: nextPhase,
        currentPlayerIndex: nextPlayer,
        setupActionRequired: nextAction,
        roads: { ...state.roads, [roadId]: { id: roadId, playerId, nodes: [nodeId1, nodeId2] } },
        players: state.players.map(p => p.id === playerId ? {
          ...p,
          resources: isInitial ? p.resources : { ...p.resources, wood: p.resources.wood - 1, brick: p.resources.brick - 1 }
        } : p),
        gameLog: [`Player ${playerId + 1} built a road.`, ...state.gameLog]
      };
    }

    case 'TRADE_WITH_BANK': {
      const { playerId, offerResource, requestResource } = action.payload;
      
      if (state.phase !== 'main') return state;
      if (playerId !== state.currentPlayerIndex) return state;

      const player = state.players[playerId];
      const cost = 4; // Standard 4:1 trade ratio
      if (player.resources[offerResource] < cost) {
        return { ...state, gameLog: [`Player ${playerId + 1} doesn't have enough ${offerResource}!`, ...state.gameLog] };
      }

      const updatedPlayers = [...state.players];
      updatedPlayers[playerId] = {
        ...player,
        resources: {
          ...player.resources,
          [offerResource]: player.resources[offerResource] - cost,
          [requestResource]: player.resources[requestResource] + 1
        }
      };

      return {
        ...state,
        players: updatedPlayers,
        gameLog: [`Player ${playerId + 1} traded 1 ${offerResource} for 1 ${requestResource}.`, ...state.gameLog]
      };
    }

    case 'PROPOSE_TRADE': {
      const { offer } = action.payload;
      const player = state.players[offer.initiatorId];

      if (state.phase !== 'main') return state;

      // Validate offer
      for (const [res, amount] of Object.entries(offer.offer)) {
        if (player.resources[res as ResourceType] < amount) {
          return { ...state, gameLog: [`Player ${offer.initiatorId + 1} doesn't have enough ${res} to offer!`, ...state.gameLog] };
        }
      }

      return { ...state, currentTradeOffer: offer, gameLog: [`Player ${offer.initiatorId + 1} proposed a trade.`, ...state.gameLog] };
    }

    case 'ACCEPT_TRADE': {
      const { acceptorId } = action.payload;
      const tradeOffer = state.currentTradeOffer;
      
      if (!tradeOffer) return { ...state, gameLog: ["No trade to accept!", ...state.gameLog] };

      const initiator = state.players[tradeOffer.initiatorId];
      const acceptor = state.players[acceptorId];

      // Validate acceptor has the requested resources
      for (const [res, amount] of Object.entries(tradeOffer.request)) {
        if (acceptor.resources[res as ResourceType] < amount) {
          return { ...state, gameLog: [`Player ${acceptorId + 1} doesn't have enough ${res} to accept!`, ...state.gameLog] };
        }
      }

      const updatedPlayers = [...state.players];

      const newInitiatorResources = { ...initiator.resources };
      const newAcceptorResources = { ...acceptor.resources };
      
      for (const [res, amount] of Object.entries(tradeOffer.offer)) {
        newInitiatorResources[res as ResourceType] -= amount;
        newAcceptorResources[res as ResourceType] += amount;
      }
      
      for (const [res, amount] of Object.entries(tradeOffer.request)) {
        newInitiatorResources[res as ResourceType] += amount;
        newAcceptorResources[res as ResourceType] -= amount;
      }

      // Update resources for both players in the trade
      updatedPlayers[tradeOffer.initiatorId] = { ...initiator, resources: newInitiatorResources };
      updatedPlayers[acceptorId] = { ...acceptor, resources: newAcceptorResources };

      return {
        ...state,
        players: updatedPlayers,
        currentTradeOffer: null,
        gameLog: [`Player ${acceptorId + 1} accepted the trade with Player ${tradeOffer.initiatorId + 1}.`, ...state.gameLog]
      };
    }

    case 'CANCEL_TRADE': {
      return { ...state, currentTradeOffer: null, gameLog: ["Trade offer cancelled.", ...state.gameLog] };
    }

    default: return state;
  }
}