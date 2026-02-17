// lib/hex-utils.ts
import { GameNode, Hex } from "@/types/catan";
import { RESOURCE_TYPES, HEX_SIZE } from "./constants";

export function hexToPixel(q: number, r: number) {
  const x = HEX_SIZE * (Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r);
  const y = HEX_SIZE * ((3 / 2) * r);
  return { x, y };
}

export function generateBoard(radius: number): Hex[] {
  const newHexes: Hex[] = [];
  
  for (let q = -radius; q <= radius; q++) {
    let r1 = Math.max(-radius, -q - radius);
    let r2 = Math.min(radius, -q + radius);
    for (let r = r1; r <= r2; r++) {
      const s = -q - r;
      const isDesert = q === 0 && r === 0;
      
      const resource = isDesert 
        ? 'desert' 
        : RESOURCE_TYPES[Math.floor(Math.random() * RESOURCE_TYPES.length)];
      
      let token = null;
      if (!isDesert) {
        do {
          token = Math.floor(Math.random() * 11) + 2;
        } while (token === 7);
      }

      newHexes.push({ 
        q, r, s, 
        resource, 
        numberToken: token, 
        id: `${q},${r},${s}` 
      });
    }
  }
  return newHexes;
}


// lib/hex-utils.ts additions
export function getNodesForBoard(hexes: Hex[]): GameNode[] {
  const nodeMap = new Map<string, GameNode>();

  hexes.forEach(hex => {
    // For pointy-top, corners are at 30, 90, 150, 210, 270, 330 degrees
    // We'll define nodes by the 3 hexes that meet at each corner
    const corners = [
      { name: 'TOP', neighbors: [[0, -1], [1, -1]] },
      { name: 'TOP_RIGHT', neighbors: [[1, -1], [1, 0]] },
      { name: 'BOTTOM_RIGHT', neighbors: [[1, 0], [0, 1]] },
      { name: 'BOTTOM', neighbors: [[0, 1], [-1, 1]] },
      { name: 'BOTTOM_LEFT', neighbors: [[-1, 1], [-1, 0]] },
      { name: 'TOP_LEFT', neighbors: [[-1, 0], [0, -1]] },
    ];

    corners.forEach((corner, i) => {
      const neighborCoords = corner.neighbors.map(([dq, dr]) => ({
        q: hex.q + dq,
        r: hex.r + dr
      }));
      
      const allCoords = [{ q: hex.q, r: hex.r }, ...neighborCoords];
      // Create a unique, sorted ID for this intersection
      const id = allCoords
        .map(c => `${c.q},${c.r}`)
        .sort()
        .join('|');

      if (!nodeMap.has(id)) {
        // Calculate pixel position (Average of the 3 hex centers or use hex corner math)
        // Using hex corner math for precision:
        const angle_deg = 60 * i - 30; // Adjustment for pointy-top orientation
        const angle_rad = (Math.PI / 180) * angle_deg;
        const hexPos = hexToPixel(hex.q, hex.r);
        
        nodeMap.set(id, {
          id,
          hexCoords: allCoords,
          pixelPos: {
            x: hexPos.x + HEX_SIZE * Math.cos(angle_rad),
            y: hexPos.y + HEX_SIZE * Math.sin(angle_rad),
          }
        });
      }
    });
  });

  return Array.from(nodeMap.values());
}