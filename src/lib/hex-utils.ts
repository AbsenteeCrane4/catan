import { Hex, GameNode, HexResource } from "@/types/catan";
import { HEX_SIZE } from "./constants";

export function hexToPixel(q: number, r: number) {
  const x = HEX_SIZE * (Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r);
  const y = HEX_SIZE * ((3 / 2) * r);
  return { x, y };
}

// Standard Fisher-Yates shuffle
function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Mathematical check to see if two axial coordinates are touching
function areHexesAdjacent(h1: { q: number, r: number }, h2: { q: number, r: number }) {
  const dq = Math.abs(h1.q - h2.q);
  const dr = Math.abs(h1.r - h2.r);
  const ds = Math.abs((-h1.q - h1.r) - (-h2.q - h2.r));
  return (dq + dr + ds) === 2; // In axial math, adjacent hexes always have a distance sum of 2
}

export function generateBoard(): Hex[] {
  // 1. Generate the 19 Hex Coordinates (3-4-5-4-3 pattern)
  // This is a standard radius-2 hexagon grid centered at 0,0
  const coords: { q: number, r: number, s: number }[] = [];
  for (let q = -2; q <= 2; q++) {
    for (let r = -2; r <= 2; r++) {
      const s = -q - r;
      if (Math.abs(s) <= 2) {
        coords.push({ q, r, s });
      }
    }
  }

  // 2. Strict Catan Resource Counts
  const resources: HexResource[] = [
    'wood', 'wood', 'wood', 'wood',
    'sheep', 'sheep', 'sheep', 'sheep',
    'wheat', 'wheat', 'wheat', 'wheat',
    'brick', 'brick', 'brick',
    'ore', 'ore', 'ore',
    'desert'
  ];

  // 3. Strict Catan Token Distribution
  const tokens = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12];

  let validTokens = false;
  let randomizedResources: HexResource[] = [];
  let randomizedTokens: number[] = [];

  // 4. Shuffle until we get a valid board (no 6s and 8s touching)
  while (!validTokens) {
    randomizedResources = shuffle(resources);
    randomizedTokens = shuffle(tokens);
    validTokens = true;

    // Temporarily map tokens to coordinates to check the adjacency rule
    let tokenIndex = 0;
    const testBoard = coords.map((c, i) => {
      const res = randomizedResources[i];
      const token = res === 'desert' ? null : randomizedTokens[tokenIndex++];
      return { ...c, token };
    });

    // Check for adjacent 6s and 8s (Red numbers)
    for (let i = 0; i < testBoard.length; i++) {
      const h1 = testBoard[i];
      if (h1.token !== 6 && h1.token !== 8) continue;

      for (let j = i + 1; j < testBoard.length; j++) {
        const h2 = testBoard[j];
        if (h2.token !== 6 && h2.token !== 8) continue;

        if (areHexesAdjacent(h1, h2)) {
          validTokens = false; // Rule violation found, break and shuffle again
          break;
        }
      }
      if (!validTokens) break;
    }
  }

  // 5. Construct the final valid hex array
  let tokenCounter = 0;
  return coords.map((c, i) => {
    const resource = randomizedResources[i];
    return {
      id: `hex-${c.q}-${c.r}`,
      q: c.q,
      r: c.r,
      s: c.s,
      resource,
      // Desert gets no token (null or 0 depending on how you typed it)
      numberToken: resource === 'desert' ? null : randomizedTokens[tokenCounter++]
    };
  });
}

export function getNodesForBoard(hexes: Hex[]): GameNode[] {
  const nodeMap = new Map<string, GameNode>();

  hexes.forEach(hex => {
    for (let i = 0; i < 6; i++) {
      const angle_deg = 60 * i - 30;
      const angle_rad = (Math.PI / 180) * angle_deg;
      const hexPos = hexToPixel(hex.q, hex.r);
      const vx = hexPos.x + HEX_SIZE * Math.cos(angle_rad);
      const vy = hexPos.y + HEX_SIZE * Math.sin(angle_rad);
      const precisionKey = `${Math.round(vx)},${Math.round(vy)}`;

      const existingNode = nodeMap.get(precisionKey);

      if (!existingNode) {
        nodeMap.set(precisionKey, {
          id: precisionKey,
          pixelPos: { x: vx, y: vy },
          hexCoords: [{ q: hex.q, r: hex.r }],
          hexIds: [hex.id],
          neighbors: []
        });
      } else {
        if (!existingNode.hexIds.includes(hex.id)) {
          existingNode.hexIds.push(hex.id);
        }
        existingNode.hexCoords.push({ q: hex.q, r: hex.r });
      }
    }
  });

  const nodes = Array.from(nodeMap.values());
  const CONNECT_DIST = HEX_SIZE * 1.1; 
  const MIN_DIST = HEX_SIZE * 0.9;

  nodes.forEach(nodeA => {
    nodes.forEach(nodeB => {
      if (nodeA.id === nodeB.id) return;
      const dx = nodeA.pixelPos.x - nodeB.pixelPos.x;
      const dy = nodeA.pixelPos.y - nodeB.pixelPos.y;
      const dist = Math.sqrt(dx*dx + dy*dy);

      if (dist < CONNECT_DIST && dist > MIN_DIST) {
        if (!nodeA.neighbors.includes(nodeB.id)) {
          nodeA.neighbors.push(nodeB.id);
        }
      }
    });
  });

  return nodes;
}