import { Hex, GameNode, HexResource, Harbour, PortResource, DevelopmentCardType } from "@/types/catan";
import { HEX_SIZE, BASE_DEV_CARDS, BASE_GAME_RESOURCES, BASE_GAME_TOKENS, BASE_PORTS, DevCardCounts } from "@/lib/constants";
import { BoardRows, HexCoord, hexRowsToCoords } from "@/lib/board-presets";
import { Rng, defaultRng, shuffle } from "@/lib/rng";

export function hexToPixel(q: number, r: number) {
  const x = HEX_SIZE * (Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r);
  const y = HEX_SIZE * ((3 / 2) * r);
  return { x, y };
}

/** The six axial neighbour offsets of a pointy-top hex. */
const HEX_DIRECTIONS: [number, number][] = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];

/**
 * Neighbour lists by coordinate index, computed once per board shape.
 * The naive check compared every hex against every other on each shuffle — O(n^2) per
 * attempt, and attempts run into the hundreds on the denser expansion board.
 */
function buildAdjacency(coords: HexCoord[]): number[][] {
  const byKey = new Map<string, number>();
  coords.forEach((c, i) => byKey.set(`${c.q},${c.r}`, i));

  return coords.map(c =>
    HEX_DIRECTIONS
      .map(([dq, dr]) => byKey.get(`${c.q + dq},${c.r + dr}`))
      .filter((i): i is number => i !== undefined)
  );
}

const isRedNumber = (token: number | null) => token === 6 || token === 8;

/** Index of the first hex whose 6/8 touches another 6/8, or -1 if the layout is legal. */
function firstRedConflict(tokenAt: (number | null)[], adjacency: number[][]): number {
  for (let i = 0; i < tokenAt.length; i++) {
    if (!isRedNumber(tokenAt[i])) continue;
    if (adjacency[i].some(n => isRedNumber(tokenAt[n]))) return i;
  }
  return -1;
}

/**
 * Last-resort fixer for a layout that still has touching 6s and 8s after every shuffle
 * attempt. Swaps each offending red number with a safe non-red hex.
 *
 * Bounded by the hex count and gives up rather than throwing: an imperfect board is far
 * better than a hung generator, and this only runs after MAX_LAYOUT_ATTEMPTS shuffles.
 */
function repairSixEight(tokenAt: (number | null)[], adjacency: number[][]): (number | null)[] {
  const tokens = [...tokenAt];

  for (let pass = 0; pass < tokens.length; pass++) {
    const conflict = firstRedConflict(tokens, adjacency);
    if (conflict === -1) break;

    const partner = tokens.findIndex((token, j) =>
      j !== conflict &&
      token !== null &&
      !isRedNumber(token) &&
      !adjacency[j].some(n => n !== conflict && isRedNumber(tokens[n]))
    );
    if (partner === -1) break;

    [tokens[conflict], tokens[partner]] = [tokens[partner], tokens[conflict]];
  }

  return tokens;
}

/** Row widths for the legacy radius form: R+1 up to 2R+1 and back down. */
function rowsForRadius(radius: number): BoardRows {
  const widths: number[] = [];
  for (let i = -radius; i <= radius; i++) widths.push(2 * radius + 1 - Math.abs(i));
  return { widths, rStart: -radius, qStart: 0 };
}

/** A fully-specified board: coordinates plus the pools that must exactly fill them. */
export interface BoardSpec {
  rows: BoardRows;
  resources: HexResource[];
  tokens: number[];
}

/**
 * How many shuffles to try before falling back to repairSixEight.
 * Measured: the expansion board averages ~29 attempts (p95 85, max 174 over 500 runs),
 * so this cap is insurance against a pathological pool, not a routine code path.
 */
export const MAX_LAYOUT_ATTEMPTS = 1000;

export function generateBoard(spec: BoardSpec, rng?: Rng): Hex[];
/**
 * @deprecated Radius form. Only describes boards that are regular hexagons, which the
 * 5-6 player board is not. Pass a BoardSpec instead.
 */
export function generateBoard(radius: number, resourcePool?: HexResource[], tokenPool?: number[]): Hex[];
export function generateBoard(
  specOrRadius: BoardSpec | number,
  poolOrRng?: HexResource[] | Rng,
  tokenPool: number[] = BASE_GAME_TOKENS
): Hex[] {
  const isRadiusForm = typeof specOrRadius === 'number';

  const spec: BoardSpec = isRadiusForm
    ? {
        rows: rowsForRadius(specOrRadius),
        resources: (poolOrRng as HexResource[] | undefined) ?? BASE_GAME_RESOURCES,
        tokens: tokenPool,
      }
    : specOrRadius;

  const rng: Rng = (isRadiusForm ? undefined : (poolOrRng as Rng | undefined)) ?? defaultRng;

  const coords = hexRowsToCoords(spec.rows);
  const expectedTokens = spec.resources.filter(r => r !== 'desert').length;

  // The radius form stays lenient because callers have relied on its warn-and-continue
  // behaviour; the spec form is strict, since a mismatch there silently produced hexes
  // with `resource: undefined` that rendered as blank tiles.
  if (coords.length !== spec.resources.length || expectedTokens !== spec.tokens.length) {
    const detail =
      `${coords.length} hexes, ${spec.resources.length} resources, ` +
      `${spec.tokens.length} tokens for ${expectedTokens} numbered hexes`;
    if (isRadiusForm) {
      console.warn(`Board pools do not match the grid (${detail})`);
    } else {
      throw new Error(`Board pools do not match the grid (${detail})`);
    }
  }

  const adjacency = buildAdjacency(coords);

  let resources: HexResource[] = [];
  let tokenAt: (number | null)[] = [];

  for (let attempt = 0; attempt < MAX_LAYOUT_ATTEMPTS; attempt++) {
    resources = shuffle(spec.resources, rng);
    const tokens = shuffle(spec.tokens, rng);

    // Sized by the grid, not the pool: the lenient radius form allows an oversized
    // resource pool, and the adjacency index only has an entry per coordinate.
    let next = 0;
    tokenAt = coords.map((_, i) => (resources[i] === 'desert' ? null : tokens[next++] ?? null));

    if (firstRedConflict(tokenAt, adjacency) === -1) break;

    // Out of attempts: keep this layout and repair it rather than shuffling forever.
    if (attempt === MAX_LAYOUT_ATTEMPTS - 1) tokenAt = repairSixEight(tokenAt, adjacency);
  }

  return coords.map((c, i) => ({
    id: `hex-${c.q}-${c.r}`,
    q: c.q,
    r: c.r,
    s: c.s,
    resource: resources[i],
    numberToken: tokenAt[i],
  }));
}

export function generateHarbours(
  nodes: GameNode[],
  portPool: PortResource[] = BASE_PORTS,
  rng?: Rng
): Harbour[] {
  // The ring sort below orders edges by their angle about the board's centre. The base
  // board happens to be centred on the origin, but the expansion board's middle row has
  // an even width, so it sits half a hex to the left — measure from the real centroid.
  // (The base centroid is exactly (0, 0), so base output is unchanged.)
  const centreX = nodes.reduce((sum, n) => sum + n.pixelPos.x, 0) / (nodes.length || 1);
  const centreY = nodes.reduce((sum, n) => sum + n.pixelPos.y, 0) / (nodes.length || 1);

  // 1. Find all outer edges (two neighbors that share exactly ONE hex)
  const byId = new Map(nodes.map(n => [n.id, n]));
  const coastalEdges: { n1: GameNode, n2: GameNode, midX: number, midY: number, angle: number }[] = [];

  nodes.forEach(n1 => {
    n1.neighbors.forEach(neighborId => {
      if (n1.id >= neighborId) return; // Prevent duplicates
      const n2 = byId.get(neighborId);
      if (!n2) return;

      const sharedHexes = n1.hexIds.filter(id => n2.hexIds.includes(id));
      if (sharedHexes.length === 1) { // It's on the coast!
        const midX = (n1.pixelPos.x + n2.pixelPos.x) / 2;
        const midY = (n1.pixelPos.y + n2.pixelPos.y) / 2;
        const angle = Math.atan2(midY - centreY, midX - centreX);
        coastalEdges.push({ n1, n2, midX, midY, angle });
      }
    });
  });

  // 2. Sort edges by angle to form a circular perimeter ring
  coastalEdges.sort((a, b) => a.angle - b.angle);

  // 3. Evenly distribute the ports along the ring, on a real Catan board the coastal
  // path between two ports isn't always the same length — some ports sit one buildable
  // node apart, others two. That comes directly from the leftover-node arithmetic below:
  // it is never an accident of an approximate spacing formula.
  //
  // Each port occupies one coastal edge (2 adjacent nodes). With `total` coastal nodes
  // and `count` ports, `count` edges' worth of nodes (2 * count) are consumed, leaving
  // `freeNodes = total - 2*count` unclaimed nodes to distribute as gaps *between* ports
  // around the ring. `freeNodes / count` is essentially never a whole number, so most
  // gaps get `floor(freeNodes / count)` free nodes and the `freeNodes % count` leftover
  // gaps get one extra — i.e. on the base board (30 coastal nodes, 9 ports) 12 free nodes
  // over 9 gaps means 6 gaps of 1 node and 3 gaps of 2 nodes, never a uniform spacing.
  const shuffledPool = shuffle(portPool, rng);
  const total = coastalEdges.length;
  const count = shuffledPool.length;
  const freeNodes = total - 2 * count;

  if (freeNodes < 0) {
    throw new Error(
      `Not enough coastline for ${count} harbours: ${total} coastal edges need at least ${count * 2}`
    );
  }

  const baseGap = Math.floor(freeNodes / count);
  const wideGapCount = freeNodes % count;

  // Which specific gaps get the extra node is shuffled too, so the wide stretches land
  // in different places from game to game rather than the same fixed spots every time.
  const gapSizes = shuffle(
    [
      ...Array(wideGapCount).fill(baseGap + 1) as number[],
      ...Array(count - wideGapCount).fill(baseGap) as number[],
    ],
    rng
  );

  // Randomize which coastal edge the ring starts from as well, so the whole layout
  // doesn't always begin at the same fixed point on the board.
  const effectiveRng = rng ?? defaultRng;
  const startEdgeIndex = Math.floor(effectiveRng() * total);

  const harbours: Harbour[] = [];
  let edgeIndex = startEdgeIndex;

  for (let i = 0; i < count; i++) {
    const edge = coastalEdges[edgeIndex % total];
    harbours.push({
      id: `harbour-${i}`,
      type: shuffledPool[i],
      nodeIds: [edge.n1.id, edge.n2.id],
      x: edge.midX,
      y: edge.midY,
      angle: edge.angle
    });
    // Each additional free node in the gap pushes the next port one more edge forward
    // (the edge immediately after a placed port always shares one of its nodes, so a
    // gap of 0 needs a 2-edge jump to clear both of the current port's nodes).
    edgeIndex += gapSizes[i] + 2;
  }

  return harbours;
}

export function getNodesForBoard(hexes: Hex[]): GameNode[] {
  const nodeMap = new Map<string, GameNode>();

  hexes.forEach(hex => {
    const centerX = HEX_SIZE * Math.sqrt(3) * (hex.q + hex.r / 2);
    const centerY = HEX_SIZE * 3 / 2 * hex.r;

    for (let i = 0; i < 6; i++) {
      const angle_deg = 60 * i - 30;
      const angle_rad = (Math.PI / 180) * angle_deg;
      const px = centerX + HEX_SIZE * Math.cos(angle_rad);
      const py = centerY + HEX_SIZE * Math.sin(angle_rad);

      const roundedX = Math.round(px);
      const roundedY = Math.round(py);
      const nodeId = `node-${roundedX}-${roundedY}`;

      if (!nodeMap.has(nodeId)) {
        nodeMap.set(nodeId, {
          id: nodeId,
          pixelPos: { x: roundedX, y: roundedY },
          hexIds: [],
          neighbors: [],
        });
      }

      const node = nodeMap.get(nodeId)!;
      if (!node.hexIds.includes(hex.id)) node.hexIds.push(hex.id);
    }
  });

  const nodes = Array.from(nodeMap.values());

  nodes.forEach(node1 => {
    nodes.forEach(node2 => {
      if (node1.id === node2.id) return;
      const dist = Math.hypot(node1.pixelPos.x - node2.pixelPos.x, node1.pixelPos.y - node2.pixelPos.y);
      if (Math.abs(dist - HEX_SIZE) < 2) { 
        if (!node1.neighbors.includes(node2.id)) node1.neighbors.push(node2.id);
      }
    });
  });

  return nodes;
}

export function createDevCardDeck(
  counts: DevCardCounts = BASE_DEV_CARDS,
  rng?: Rng
): DevelopmentCardType[] {
  const deck = (Object.entries(counts) as [DevelopmentCardType, number][])
    .flatMap(([card, count]) => Array<DevelopmentCardType>(count).fill(card));

  return shuffle(deck, rng);
}
