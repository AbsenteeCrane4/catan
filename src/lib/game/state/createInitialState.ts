import { GameState } from "@/types/catan";
import { createDevCardDeck, generateBoard, generateHarbours, getNodesForBoard } from "@/lib/hex-utils";
import { PLAYER_COLORS } from "@/lib/constants";

export const createInitialState = (radius = 2): GameState => {
  const hexes = generateBoard(radius);
  const nodes = getNodesForBoard(hexes);
  const harbours = generateHarbours(nodes);
  const devCardDeck = createDevCardDeck()
  return {
    boardRadius: radius,
    hexes: hexes,
    robberHexId: hexes.find(h => h.resource === 'desert')?.id || '', // Place robber on desert
    pendingRobberAction: null,
    nodes: nodes,
    settlements: {},
    roads: {},
    longestRoad: { playerId: null, length: 4 }, // Start with 4 so players can beat it with a 5-road longest road
    devCardDeck: devCardDeck,
    hasPlayedDevCardThisTurn: false,
    harbours: harbours,
    currentTradeOffer: null,
    players: Array.from({ length: 4 }).map((_, i) => ({
      id: i,
      color: PLAYER_COLORS[i % PLAYER_COLORS.length],
      resources: { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 }, // Start at 0!
      longestRoadLength: 0,
      largestArmy: false,
      knightsPlayed: 0,
      devCards: {playable: [], boughtThisTurn: [], played: []},
      victoryPoints: 0,
      harbours: [] // Initialize empty harbours for each player
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
