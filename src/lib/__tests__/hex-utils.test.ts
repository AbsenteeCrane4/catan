import { describe, it, expect } from 'vitest';
import { generateBoard, getNodesForBoard, hexToPixel } from '@/lib/hex-utils';

describe('Hex Math & Board Generation', () => {
  it('generates the correct number of hexes for various radii', () => {
    // Formula for hexes in a grid: 3n^2 - 3n + 1 (where n is diameter, or 1 + 3r(r+1))
    // For radius 1: 1 + 3(1)(2) = 7 hexes
    expect(generateBoard(1)).toHaveLength(7);
    // For radius 2: 1 + 3(2)(3) = 19 hexes
    expect(generateBoard(2)).toHaveLength(19);
  });

  it('ensures exactly one desert exists with no token', () => {
    const hexes = generateBoard(2);
    const deserts = hexes.filter(h => h.resource === 'desert');
    expect(deserts).toHaveLength(1);
    expect(deserts[0].numberToken).toBeNull();
  });

  it('maps nodes to unique pixel positions without duplicates', () => {
    const hexes = generateBoard(1);
    const nodes = getNodesForBoard(hexes);
    
    const ids = nodes.map(n => n.id);
    const uniqueIds = new Set(ids);
    
    // For a radius 1 board, there should be exactly 24 unique intersections
    expect(ids.length).toBe(uniqueIds.size);
    expect(nodes.length).toBe(24);
    // Check for our new naming convention
    expect(nodes[0].id).toContain('node-');
  });

  it('assigns exactly 3 neighbors to internal nodes', () => {
    const hexes = generateBoard(2);
    const nodes = getNodesForBoard(hexes);
    
    const centralNode = nodes.find(n => n.hexIds.length === 3);
    
    expect(centralNode).toBeDefined();
    expect(centralNode?.neighbors).toHaveLength(3);
  });

  it('calculates pixel coordinates correctly for pointy-top hexes', () => {
    const pos = hexToPixel(0, 0);
    expect(pos.x).toBe(0);
    expect(pos.y).toBe(0);

    const pos1 = hexToPixel(1, 0);
    // Based on Math.sqrt(3) * HEX_SIZE (50)
    expect(pos1.x).toBeCloseTo(86.6, 1);
    expect(pos1.y).toBe(0);
  });
});