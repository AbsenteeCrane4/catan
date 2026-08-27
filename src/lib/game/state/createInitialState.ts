import { GameState, BoardKind, PlayerColor } from "@/types/catan";
import { createDevCardDeck, generateBoard, generateHarbours, getNodesForBoard } from "@/lib/hex-utils";
import { DEFAULT_SEATS } from "@/lib/constants";
import { boardKindForPlayerCount } from "@/types/lobby";

export interface SeatConfig {
  name: string;
  color: PlayerColor;
}

export interface NewGameOptions {
  /** 2-6 seats, already compacted and ordered — index becomes Player.id. */
  players: SeatConfig[];
  /** Defaults to the kind implied by the player count (5+ => expansion). */
  boardKind?: BoardKind;
}

export function createInitialState(options?: NewGameOptions): GameState;
/** @deprecated Legacy numeric-radius form, retained only while the lobby migration lands. */
export function createInitialState(radius: number): GameState;
export function createInitialState(arg?: NewGameOptions | number): GameState {
  const options: NewGameOptions =
    arg === undefined || typeof arg === 'number' ? { players: DEFAULT_SEATS } : arg;

  const seats = options.players;
  const boardKind = options.boardKind ?? boardKindForPlayerCount(seats.length);

  // TODO(stage 2): select the hex/token/port pools from BOARD_PRESETS[boardKind].
  // Until the expansion preset exists every game is built on the base board.
  const hexes = generateBoard(2);
  const nodes = getNodesForBoard(hexes);
  const harbours = generateHarbours(nodes);
  const devCardDeck = createDevCardDeck();

  return {
    boardKind,
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
    // INVARIANT: players[i].id === i — the reducer indexes players[playerId] everywhere.
    players: seats.map((seat, i) => ({
      id: i,
      name: seat.name,
      color: seat.color,
      resources: { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 }, // Start at 0!
      longestRoadLength: 0,
      largestArmy: false,
      knightsPlayed: 0,
      devCards: { playable: [], boughtThisTurn: [], played: [] },
      victoryPoints: 0,
      harbours: [] // Initialize empty harbours for each player
    })),
    currentPlayerIndex: 0,
    diceRoll: null,
    gameLog: [`Game started. ${seats[0]?.name ?? 'Player 1'}, place your first settlement.`],
    isGameOver: false,
    winnerId: null,
    phase: 'setup1',
    setupActionRequired: 'settlement',
  };
}
