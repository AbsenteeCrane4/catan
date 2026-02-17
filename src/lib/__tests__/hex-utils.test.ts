import { describe, it, expect } from 'vitest';
import { generateBoard, getNodesForBoard } from '../hex-utils';

describe('Hex Geometry Utilities', () => {
  it('should generate the correct number of hexes for radius 2', () => {
    // Formula for hexes in a grid: 3n^2 - 3n + 1 (where n is diameter, or 1 + 3r(r+1))
    // For radius 2: 1 + 3(2)(3) = 19 hexes
    const hexes = generateBoard(2);
    expect(hexes.length).toBe(19);
  });

  it('should generate a desert at the center (0,0,0)', () => {
    const hexes = generateBoard(2);
    const center = hexes.find(h => h.q === 0 && h.r === 0);
    expect(center?.resource).toBe('desert');
    expect(center?.numberToken).toBeNull();
  });

  it('should correctly identify neighbors for a node', () => {
    const hexes = generateBoard(1);
    const nodes = getNodesForBoard(hexes);
    
    // Every internal node in Catan has exactly 3 neighbors
    // We'll check a node near the center
    const centerNode = nodes.find(n => n.hexCoords.some(h => h.q === 0 && h.r === 0));
    expect(centerNode?.neighbors.length).toBeGreaterThanOrEqual(2);
    expect(centerNode?.neighbors.length).toBeLessThanOrEqual(3);
  });
});