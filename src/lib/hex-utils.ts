import { Hex, GameNode } from "@/types/catan";
import { RESOURCE_TYPES, HEX_SIZE } from "./constants";

export function hexToPixel(q: number, r: number) {
  const x = HEX_SIZE * (Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r);
  const y = HEX_SIZE * ((3 / 2) * r);
  return { x, y };
}

export function generateBoard(radius: number): Hex[] {
  const newHexes: Hex[] = [];
  for (let q = -radius; q <= radius; q++) {
    const r1 = Math.max(-radius, -q - radius);
    const r2 = Math.min(radius, -q + radius);
    for (let r = r1; r <= r2; r++) {
      const s = -q - r;
      const isDesert = q === 0 && r === 0;
      const resource = isDesert ? 'desert' : RESOURCE_TYPES[Math.floor(Math.random() * RESOURCE_TYPES.length)];
      let token = isDesert ? null : Math.floor(Math.random() * 10) + 2;
      if (token === 7) token = 8;

      newHexes.push({ q, r, s, resource, numberToken: token, id: `${q},${r},${s}` });
    }
  }
  return newHexes;
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