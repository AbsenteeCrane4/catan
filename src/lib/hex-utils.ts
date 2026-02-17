// lib/hex-utils.ts
import { Hex } from "@/types/catan";
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