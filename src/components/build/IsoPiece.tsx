import type { ReactNode } from "react";

/**
 * Game pieces drawn in isometric projection over the flat board.
 *
 * The geometry is the Horizon Settlers piece spec: board units (HEX_SIZE = 50), one fixed
 * light, each face the base colour mixed toward white or black. The same bodies are used
 * on the board (`PieceLayer`) and as build-panel thumbnails, so the shape in the panel is
 * the shape that lands on the board.
 */

type Pt = [number, number];

/** screen = ((x - y) * 0.866, (x + y) * 0.5 - z) */
const P = (x: number, y: number, z: number): Pt => [(x - y) * 0.866, (x + y) * 0.5 - z];
const pts = (arr: Pt[]) => arr.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');

const FACE = { top: 0.3, left: -0.16, right: -0.46 };
const OUTLINE = 'rgba(4,10,20,0.65)';

/** Mix toward white (amt > 0) or black (amt < 0). */
export function shade(hex: string, amt: number): string {
  const n = hex.replace('#', '');
  const c = [0, 2, 4].map(i => parseInt(n.slice(i, i + 2), 16));
  const out = c.map(v =>
    Math.max(0, Math.min(255, Math.round(amt > 0 ? v + (255 - v) * amt : v * (1 + amt))))
  );
  return '#' + out.map(v => v.toString(16).padStart(2, '0')).join('');
}

const face = (points: Pt[], color: string, amt: number, key: string) => (
  <polygon
    key={key}
    points={pts(points)}
    fill={shade(color, amt)}
    stroke={OUTLINE}
    strokeWidth={1}
    strokeLinejoin="round"
  />
);

function box(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, color: string, key: string) {
  const A = P(x0, y0, z1), B = P(x1, y0, z1), C = P(x1, y1, z1), D = P(x0, y1, z1);
  const Bb = P(x1, y0, z0), Cb = P(x1, y1, z0), Db = P(x0, y1, z0);
  return [
    face([D, Db, Cb, C], color, FACE.left, key + 'l'),
    face([C, Cb, Bb, B], color, FACE.right, key + 'r'),
    face([A, B, C, D], color, FACE.top, key + 't'),
  ];
}

/** A gabled house: walls to z 9, ridge at z 21 along y, overhanging eaves, a door. */
export function settlementBody(color: string): ReactNode[] {
  const s = 7, wall = 9, ridge = 21, o = 2.2, eave = 8;
  const gable = [P(-s, s, wall), P(s, s, wall), P(0, s, ridge)];
  const Rb = P(0, -s - o, ridge), Rf = P(0, s + o, ridge);
  const roofR = [Rb, Rf, P(s + o, s + o, eave), P(s + o, -s - o, eave)];
  const roofL = [Rb, Rf, P(-s - o, s + o, eave), P(-s - o, -s - o, eave)];
  return [
    ...box(-s, s, -s, s, 0, wall, color, 'w'),
    face(gable, color, -0.04, 'gable'),
    face(roofL, color, 0.34, 'roofL'),
    face(roofR, color, -0.14, 'roofR'),
    <polygon
      key="door"
      points={pts([P(-2.4, s, 0), P(-2.4, s, 5.6), P(0, s, 6.8), P(2.4, s, 5.6), P(2.4, s, 0)])}
      fill={shade(color, -0.6)}
      opacity={0.9}
    />,
  ];
}

/** Merlons around the top of a box, back to front so near ones overlap far ones. */
function crenels(x0: number, x1: number, y0: number, y1: number, z: number, hh: number, color: string, key: string) {
  const m = 3, step = 5.4;
  const along = (from: number, to: number): [number, number][] => {
    const n = Math.max(1, Math.round((to - from) / step));
    const start = from + ((to - from) - (n * step - (step - m))) / 2;
    return Array.from({ length: n }, (_, i) => [start + i * step, start + i * step + m]);
  };
  const items: [number, number, number, number, string][] = [];
  along(x0, x1).forEach(([a, b], i) => {
    items.push([a, b, y0, y0 + m, 'n' + i]);
    items.push([a, b, y1 - m, y1, 's' + i]);
  });
  along(y0, y1).forEach(([a, b], i) => {
    items.push([x0, x0 + m, a, b, 'w' + i]);
    items.push([x1 - m, x1, a, b, 'e' + i]);
  });
  items.sort((p, q) => (p[0] + p[2]) - (q[0] + q[2]));
  return items.flatMap(([ax, bx, ay, by, k]) => box(ax, bx, ay, by, z, z + hh, color, key + k));
}

/** A walled keep: curtain wall, two flanking towers, a tall central keep. */
export function cityBody(color: string): ReactNode[] {
  const B = 11;
  return [
    ...box(-B, B, -B, B, 0, 9, color, 'base'),
    <polygon
      key="gate"
      points={pts([P(-3, B, 0), P(-3, B, 5.4), P(0, B, 6.8), P(3, B, 5.4), P(3, B, 0)])}
      fill={shade(color, -0.62)}
      opacity={0.9}
    />,
    ...crenels(-B, B, -B, B, 9, 3.4, color, 'bc'),
    ...box(-B, -5, 5, B, 9, 20, color, 'towerL'),
    ...crenels(-B, -5, 5, B, 20, 3, color, 'tlc'),
    ...box(5, B, -B, -5, 9, 20, color, 'towerR'),
    ...crenels(5, B, -B, -5, 20, 3, color, 'trc'),
    ...box(-4.5, 4.5, -4.5, 4.5, 9, 30, color, 'keep'),
    ...crenels(-4.5, 4.5, -4.5, 4.5, 30, 3.2, color, 'kc'),
  ];
}

/**
 * A road: a bar along the edge's own angle, extruded downward in screen space — top face,
 * plus the side faces that face the viewer.
 */
export function roadBody(
  cx: number, cy: number, angle: number, len: number, wid: number, height: number, color: string
): ReactNode[] {
  const ca = Math.cos(angle), sa = Math.sin(angle);
  const corner = (u: number, v: number): Pt => [cx + u * ca - v * sa, cy + u * sa + v * ca];
  const top: Pt[] = [corner(-len / 2, -wid / 2), corner(len / 2, -wid / 2), corner(len / 2, wid / 2), corner(-len / 2, wid / 2)];
  const bot = top.map(([x, y]) => [x, y + height] as Pt);
  const sides: ReactNode[] = [];
  for (let i = 0; i < 4; i++) {
    const a = top[i], b = top[(i + 1) % 4];
    if ((a[1] + b[1]) / 2 <= cy) continue;
    sides.push(face([a, b, bot[(i + 1) % 4], bot[i]], color, FACE.right, 's' + i));
  }
  return [...sides, face(top, color, FACE.top, 'top')];
}

/** The robber: a neutral turned pawn with a contact shadow. */
export function robberBody(): ReactNode[] {
  const c = '#3a3a42';
  return [
    <ellipse key="sh" cx={3} cy={4} rx={13} ry={5.5} fill="#040a14" opacity={0.45} />,
    <path key="body" d="M -9 4 C -9 -2 -5 -4 -5 -10 L 5 -10 C 5 -4 9 -2 9 4 Z" fill={shade(c, -0.1)} stroke={OUTLINE} strokeWidth={1} />,
    <ellipse key="base" cx={0} cy={4} rx={9} ry={3.4} fill={shade(c, 0.18)} stroke={OUTLINE} strokeWidth={1} />,
    <circle key="head" cx={0} cy={-15} r={7.5} fill={shade(c, 0.2)} stroke={OUTLINE} strokeWidth={1} />,
    <circle key="gloss" cx={-2.6} cy={-17.6} r={2.4} fill="#ffffff" opacity={0.3} />,
  ];
}

const VIEWBOX = {
  settlement: '-17 -23 34 34',
  city: '-22 -41 44 55',
  road: '-26 -14 52 28',
} as const;

interface IsoPieceProps {
  kind: 'road' | 'settlement' | 'city';
  /** CSS hex colour, e.g. from PLAYER_PIECE_SHADES. */
  color: string;
  size: number;
}

export function IsoPiece({ kind, color, size }: IsoPieceProps) {
  const body =
    kind === 'settlement' ? settlementBody(color) : kind === 'city' ? cityBody(color) : roadBody(0, 0, 0, 40, 8, 5, color);
  return (
    <svg width={size} height={size} viewBox={VIEWBOX[kind]} style={{ overflow: 'visible' }} aria-hidden>
      {body}
    </svg>
  );
}
