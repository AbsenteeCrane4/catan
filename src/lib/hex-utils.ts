import { Hex, GameNode, HexResource } from "@/types/catan";
import { HEX_SIZE, BASE_GAME_RESOURCES, BASE_GAME_TOKENS } from "@/lib/constants";

export function hexToPixel(q: number, r: number) {
  const x = HEX_SIZE * (Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r);
  const y = HEX_SIZE * ((3 / 2) * r);
  return { x, y };
}

function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function areHexesAdjacent(h1: { q: number, r: number }, h2: { q: number, r: number }) {
  const dq = Math.abs(h1.q - h2.q);
  const dr = Math.abs(h1.r - h2.r);
  const ds = Math.abs((-h1.q - h1.r) - (-h2.q - h2.r));
  return (dq + dr + ds) === 2;
}

export function generateBoard(
  radius: number, 
  resourcePool: HexResource[] = BASE_GAME_RESOURCES, 
  tokenPool: number[] = BASE_GAME_TOKENS
): Hex[] {

  const coords: { q: number, r: number, s: number }[] = [];
  for (let q = -radius; q <= radius; q++) {
    for (let r = -radius; r <= radius; r++) {
      const s = -q - r;
      if (Math.abs(s) <= radius) {
        coords.push({ q, r, s });
      }
    }
  }

  if (coords.length !== resourcePool.length) {
    console.warn(`Grid size (${coords.length}) does not match resource pool size (${resourcePool.length})`);
  }

  let validTokens = false;
  let randomizedResources: HexResource[] = [];
  let randomizedTokens: number[] = [];

  while (!validTokens) {
    randomizedResources = shuffle(resourcePool);
    randomizedTokens = shuffle(tokenPool);
    validTokens = true;

    let tokenIndex = 0;
    const testBoard = coords.map((c, i) => {
      const res = randomizedResources[i];
      const token = res === 'desert' ? null : randomizedTokens[tokenIndex++];
      return { ...c, token };
    });

    for (let i = 0; i < testBoard.length; i++) {
      const h1 = testBoard[i];
      if (h1.token !== 6 && h1.token !== 8) continue;

      for (let j = i + 1; j < testBoard.length; j++) {
        const h2 = testBoard[j];
        if (h2.token !== 6 && h2.token !== 8) continue;

        if (areHexesAdjacent(h1, h2)) {
          validTokens = false;
          break;
        }
      }
      if (!validTokens) break;
    }
  }

  let tokenCounter = 0;
  return coords.map((c, i) => {
    const resource = randomizedResources[i];
    return {
      id: `hex-${c.q}-${c.r}`,
      q: c.q,
      r: c.r,
      s: c.s,
      resource,
      numberToken: resource === 'desert' ? null : randomizedTokens[tokenCounter++]
    };
  });
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