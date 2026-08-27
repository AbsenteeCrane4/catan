import { BoardKind, HexResource, PortResource } from "@/types/catan";
import {
  BASE_DEV_CARDS,
  BASE_GAME_RESOURCES,
  BASE_GAME_TOKENS,
  BASE_PORTS,
  DevCardCounts,
  EXPANSION_DEV_CARDS,
  EXPANSION_PORTS,
  EXPANSION_RESOURCES,
  EXPANSION_TOKENS,
} from "@/lib/constants";

export interface HexCoord {
  q: number;
  r: number;
  s: number;
}

/**
 * A hex board described by its row widths rather than a literal coordinate list.
 * `rStart` is the axial row of the first (top) row; `qStart` its leftmost column.
 */
export interface BoardRows {
  widths: number[];
  rStart: number;
  qStart: number;
}

/** Everything needed to generate one board, resolved from a BoardKind. */
export interface BoardPreset {
  rows: BoardRows;
  resources: HexResource[];
  tokens: number[];
  ports: PortResource[];
  devCards: DevCardCounts;
}

/**
 * Expands row widths into axial coordinates.
 *
 * Rows above the centre (r < 0) each shift one column left of the row below them;
 * rows from the centre down all share the same leftmost column. That single rule
 * reproduces the radius-2 board exactly, which is what the regression test asserts.
 */
export function hexRowsToCoords({ widths, rStart, qStart }: BoardRows): HexCoord[] {
  const coords: HexCoord[] = [];

  widths.forEach((width, row) => {
    const r = rStart + row;
    const rowStartQ = qStart - (Math.min(r, 0) - rStart);
    for (let i = 0; i < width; i++) {
      const q = rowStartQ + i;
      coords.push({ q, r, s: -q - r });
    }
  });

  return coords;
}

/** The classic 19-hex board — identical to the old generateBoard(2) coordinate set. */
export const BASE_ROWS: BoardRows = { widths: [3, 4, 5, 4, 3], rStart: -2, qStart: 0 };

/**
 * The 30-hex 5-6 player board. Its middle row has an even width, so the shape is
 * symmetric but sits half a hex left of the origin — nothing may assume it is centred.
 */
export const EXPANSION_ROWS: BoardRows = { widths: [3, 4, 5, 6, 5, 4, 3], rStart: -3, qStart: 0 };

export const BOARD_PRESETS: Record<BoardKind, BoardPreset> = {
  base: {
    rows: BASE_ROWS,
    resources: BASE_GAME_RESOURCES,
    tokens: BASE_GAME_TOKENS,
    ports: BASE_PORTS,
    devCards: BASE_DEV_CARDS,
  },
  expansion: {
    rows: EXPANSION_ROWS,
    resources: EXPANSION_RESOURCES,
    tokens: EXPANSION_TOKENS,
    ports: EXPANSION_PORTS,
    devCards: EXPANSION_DEV_CARDS,
  },
};
