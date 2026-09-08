import * as THREE from 'three';

/**
 * The physical game pieces, as three.js geometry.
 *
 * The board itself stays 2D — see `docs/renderer-spike.md`. Only the things a player
 * would pick up are modelled: a settlement, a city, a road and the robber, built to the
 * shapes in `docs/threejs-example.jpeg`.
 *
 * Everything here is pure geometry in board units, the same units the reducer's node and
 * hex coordinates use, and nothing here touches WebGL — so it can be built and measured
 * in a test without a graphics context.
 */

/** Board units. A hex is 100 tall and 86.6 across, which is what these are sized against. */
export const PIECE_SIZE = {
  settlement: { width: 31, depth: 27, height: 31 },
  city: { width: 40, depth: 30, height: 50 },
  road: { width: 12, height: 9 },
  robber: { radius: 13, height: 50 },
} as const;

/**
 * Concatenates parts into one geometry, so a piece costs one draw call however many
 * blocks it is made of — a crenellated city is twenty.
 *
 * Written out rather than pulled from `three/examples`: it is a dozen lines, and the
 * examples directory is not part of three's published entry points.
 */
function merge(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const flat = parts.map(part => (part.index ? part.toNonIndexed() : part));
  const vertices = flat.reduce((total, part) => total + part.attributes.position.count, 0);

  const position = new Float32Array(vertices * 3);
  const normal = new Float32Array(vertices * 3);
  let offset = 0;

  for (const part of flat) {
    position.set(part.attributes.position.array as Float32Array, offset * 3);
    normal.set(part.attributes.normal.array as Float32Array, offset * 3);
    offset += part.attributes.position.count;
  }

  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(position, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(normal, 3));
  merged.computeBoundingBox();
  merged.computeBoundingSphere();
  return merged;
}

/** A block, positioned by its centre in x and y and by its underside in z. */
function block(w: number, d: number, h: number, x: number, y: number, z: number) {
  const geometry = new THREE.BoxGeometry(w, d, h);
  geometry.translate(x, y, z + h / 2);
  return geometry;
}

/**
 * A row of merlons along one edge of a wall — the detail that makes a city read as a
 * castle rather than as a taller house.
 */
function battlements(
  count: number,
  size: number,
  height: number,
  from: [number, number],
  to: [number, number],
  z: number
): THREE.BufferGeometry[] {
  return Array.from({ length: count }, (_, i) => {
    const t = count === 1 ? 0.5 : i / (count - 1);
    return block(size, size, height, from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t, z);
  });
}

/**
 * A settlement: a house with a gabled roof and a chimney.
 *
 * Stands on z = 0 with its footprint centred on the origin, so it can be dropped straight
 * onto a node position.
 */
export function settlementGeometry(): THREE.BufferGeometry {
  const { width, depth } = PIECE_SIZE.settlement;
  const wallHeight = 15;
  const roofHeight = 13;
  const eaves = 2;

  // Gable cross-section, extruded along the depth so the ridge runs front to back.
  const gable = new THREE.Shape();
  gable.moveTo(-width / 2 - eaves, 0);
  gable.lineTo(width / 2 + eaves, 0);
  gable.lineTo(0, roofHeight);
  gable.closePath();

  const roof = new THREE.ExtrudeGeometry(gable, { depth: depth + eaves * 2, bevelEnabled: false });
  // Extrusion runs along +z; stand it up so height becomes z and the extrusion becomes depth.
  roof.rotateX(Math.PI / 2);
  roof.translate(0, (depth + eaves * 2) / 2, wallHeight);

  return merge([
    block(width, depth, wallHeight, 0, 0, 0),
    roof,
    block(5, 5, 8, -width * 0.26, depth * 0.22, wallHeight + roofHeight * 0.45),
  ]);
}

/**
 * A city: a stepped keep with a corner tower, crenellated throughout.
 *
 * Deliberately a different silhouette from a settlement rather than a larger one, so the
 * two are told apart at a glance across the board.
 */
export function cityGeometry(): THREE.BufferGeometry {
  const { width, depth } = PIECE_SIZE.city;
  const hallHeight = 18;
  const keepHeight = 29;
  const towerHeight = 42;

  const hallW = width;
  const keepW = width * 0.52;
  const towerW = 12;

  const merlon = 4;
  const merlonH = 5.5;

  return merge([
    // Great hall along the front, with battlements on its outer edge.
    block(hallW, depth, hallHeight, 0, 0, 0),
    ...battlements(5, merlon, merlonH, [-hallW / 2 + 2, -depth / 2 + 2], [hallW / 2 - 2, -depth / 2 + 2], hallHeight),
    ...battlements(3, merlon, merlonH, [-hallW / 2 + 2, depth / 2 - 2], [-hallW * 0.06, depth / 2 - 2], hallHeight),

    // Keep, set back and higher.
    block(keepW, depth * 0.66, keepHeight, -width * 0.18, depth * 0.14, 0),
    ...battlements(
      3,
      merlon,
      merlonH,
      [-width * 0.18 - keepW / 2 + 2, depth * 0.14],
      [-width * 0.18 + keepW / 2 - 2, depth * 0.14],
      keepHeight
    ),

    // Corner tower.
    block(towerW, towerW, towerHeight, width * 0.31, depth * 0.08, 0),
    ...battlements(
      2,
      merlon,
      merlonH,
      [width * 0.31 - towerW / 2 + 1.7, depth * 0.08],
      [width * 0.31 + towerW / 2 - 1.7, depth * 0.08],
      towerHeight
    ),

    // Gatehouse arch at the front, which gives the hall a readable scale.
    block(8, 3, 10, -width * 0.06, -depth / 2 - 0.8, 0),
  ]);
}

/**
 * A road: a plain bar, one board unit long and centred on the origin so it can be scaled
 * to whatever the edge measures and placed at the edge's midpoint. Lies along +x with its
 * underside on z = 0.
 */
export function roadGeometry(): THREE.BufferGeometry {
  const { width, height } = PIECE_SIZE.road;
  return merge([block(1, width, height, 0, 0, 0)]);
}

/**
 * The robber: a turned pawn, revolved from a profile the way the real piece is turned on
 * a lathe. Wide foot, tapered stem, collar, ball head.
 */
export function robberGeometry(): THREE.BufferGeometry {
  const { radius, height } = PIECE_SIZE.robber;

  const profile: [number, number][] = [
    [0, 0],
    [1, 0],
    [1, 0.045],
    [0.86, 0.085],
    [0.72, 0.125],
    [0.48, 0.2],
    [0.36, 0.34],
    [0.335, 0.47],
    [0.48, 0.53],
    [0.56, 0.565],
    [0.56, 0.595],
    [0.36, 0.635],
    [0.35, 0.67],
    [0.48, 0.715],
    [0.585, 0.79],
    [0.585, 0.87],
    [0.48, 0.945],
    [0.28, 0.99],
    [0, 1],
  ];

  const geometry = new THREE.LatheGeometry(
    profile.map(([r, z]) => new THREE.Vector2(r * radius, z * height)),
    36
  );
  // Lathe revolves around +y; stand it on the board so it revolves around +z instead.
  // `rotateX` carries the normals with it, and LatheGeometry's own normals handle the
  // poles where the profile closes on the axis — recomputing them here would replace
  // those with zero-length normals and render the tip and foot as black facets.
  geometry.rotateX(Math.PI / 2);
  geometry.computeBoundingBox();
  return geometry;
}

export type PieceKind = 'settlement' | 'city' | 'road' | 'robber';

/** One geometry per kind, built once and shared by every instance on the board. */
export function createPieceGeometries(): Record<PieceKind, THREE.BufferGeometry> {
  return {
    settlement: settlementGeometry(),
    city: cityGeometry(),
    road: roadGeometry(),
    robber: robberGeometry(),
  };
}
