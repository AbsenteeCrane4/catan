'use client';

import { ReactNode, useMemo, useState } from 'react';
import { Hex } from '@/types/catan';
import { BoardView, islandPath } from '@/lib/board/geometry';
import { BOARD_BACKGROUND_IMAGE } from '@/lib/constants';
import { CAMERA, useTabletopCamera } from '@/hooks/useTabletopCamera';
import { Compass, Minus, Plus } from 'lucide-react';
import { clsx } from 'clsx';

/**
 * The tabletop the board sits on: ocean environment, the tilted board plane, the cliff
 * the island stands on, and the camera that moves all of it.
 *
 * The scene is a CSS 3D context. `.world` carries the camera transform and everything
 * inside it lives in board units, so a child positions itself with the same coordinates
 * the reducer uses. Two kinds of thing live in there:
 *
 * - **Ground layers** lie on the board plane and foreshorten with it: terrain, roads,
 *   harbours, legal-target markers, click targets.
 * - **Billboards** stand up out of it: pieces, the robber, number tokens. They cancel the
 *   camera rotation with a single inherited custom property, so a whole board's worth of
 *   them costs one style write per frame rather than one each.
 */

/**
 * How thick the island reads, as stacked silhouettes below the terrain.
 *
 * This is the whole reason the board looks like an object rather than a picture: the
 * layers are hidden behind the terrain when seen from straight on and fan out into a
 * cliff face as soon as the camera tilts.
 */
const CLIFF_LAYERS = 15;
const CLIFF_STEP = 4.6;
/** Each layer draws slightly smaller, so the rock tapers rather than dropping sheer. */
const CLIFF_TAPER = 0.45;

/** Sunlit sandstone at the waterline down to wet rock in the shadow beneath. */
const CLIFF_TOP = [0xa4, 0x8c, 0x66];
const CLIFF_BOTTOM = [0x0d, 0x11, 0x18];

const cliffShade = (t: number) =>
  '#' +
  CLIFF_TOP.map((from, i) =>
    Math.round(from + (CLIFF_BOTTOM[i] - from) * t)
      .toString(16)
      .padStart(2, '0')
  ).join('');

interface TabletopProps {
  view: BoardView;
  hexes: readonly Hex[];
  /** Flat layers on the board plane, drawn in order from the surface upwards. */
  ground: ReactNode;
  /** Upright pieces. Positioned with `Billboard`. */
  pieces: ReactNode;
}

export function Tabletop({ view, hexes, ground, pieces }: TabletopProps) {
  const { sceneRef, worldRef, reset, zoomBy } = useTabletopCamera({
    boardWidth: view.w,
    boardHeight: view.h,
  });

  // One path per depth, each slightly smaller, so the cliff tapers instead of dropping
  // as a straight extrusion. Recomputed only when the board itself changes.
  const cliffs = useMemo(
    () =>
      Array.from({ length: CLIFF_LAYERS }, (_, i) => ({
        z: -(i + 1) * CLIFF_STEP,
        path: islandPath(hexes, (i + 1) * CLIFF_TAPER),
        // Eased so the light falls off fast just under the shoreline, the way a real
        // cliff does, instead of fading linearly into the water.
        fill: cliffShade(Math.pow((i + 1) / CLIFF_LAYERS, 0.65)),
      })),
    [hexes]
  );

  const surface = useMemo(() => islandPath(hexes), [hexes]);
  const box = `${view.minX} ${view.minY} ${view.w} ${view.h}`;

  return (
    <div className="relative flex-1 overflow-hidden" data-cy="tabletop">
      <Ocean />

      <div
        ref={sceneRef}
        data-cy="tabletop-scene"
        className="absolute inset-0 cursor-grab touch-none select-none active:cursor-grabbing"
        style={{
          perspective: `${view.w * CAMERA.perspective}px`,
          // Seeded so the first painted frame is already tilted, before the camera runs.
          ['--tt-billboard' as string]: `rotateZ(0deg) rotateX(-${CAMERA.pitch.start}deg)`,
        }}
      >
        <div
          ref={worldRef}
          className="absolute left-1/2 top-1/2 [transform-style:preserve-3d]"
          style={{
            width: view.w,
            height: view.h,
            marginLeft: -view.w / 2,
            marginTop: -view.h / 2,
            transform: `scale(1) rotateX(${CAMERA.pitch.start}deg)`,
          }}
        >
          {/* Cast onto the water before anything else, so the island reads as sitting in
              the sea rather than printed on it. */}
          <WorldLayer z={-CLIFF_LAYERS * CLIFF_STEP - 14} className="opacity-85">
            <svg viewBox={box} className="h-full w-full overflow-visible" aria-hidden>
              <path
                d={surface}
                fill="#020c18"
                transform="translate(8, 26)"
                style={{ filter: 'blur(15px)' }}
              />
            </svg>
          </WorldLayer>

          {/* The waterline, at the foot of the cliff rather than up on the terrain:
              drawn any higher, the surf washes over the rock face in front of it. */}
          <WorldLayer z={-CLIFF_LAYERS * CLIFF_STEP + CLIFF_STEP}>
            <svg viewBox={box} className="h-full w-full overflow-visible" aria-hidden>
              <path
                d={surface}
                fill="none"
                stroke="rgba(60, 152, 192, 0.34)"
                strokeWidth="38"
                strokeLinejoin="round"
                style={{ filter: 'blur(17px)' }}
              />
              <path
                d={surface}
                fill="none"
                stroke="rgba(214, 240, 255, 0.38)"
                strokeWidth="9"
                strokeLinejoin="round"
                style={{ filter: 'blur(5px)' }}
              />
            </svg>
          </WorldLayer>

          {cliffs
            .slice()
            .reverse()
            .map(cliff => (
              <WorldLayer key={cliff.z} z={cliff.z}>
                <svg viewBox={box} className="h-full w-full overflow-visible" aria-hidden>
                  <path d={cliff.path} fill={cliff.fill} />
                </svg>
              </WorldLayer>
            ))}

          {ground}

          <div className="absolute inset-0 [transform-style:preserve-3d]" data-cy="piece-layer">
            {pieces}
          </div>
        </div>
      </div>

      <CameraControls onReset={reset} onZoom={zoomBy} />
    </div>
  );
}

/**
 * A flat layer on the board plane, lifted `z` board units along the board's own normal.
 *
 * Separate layers are how thickness happens without a 3D engine: draw the same road
 * twice at different heights and the lower one becomes its side.
 */
export function WorldLayer({
  z = 0,
  interactive = false,
  className,
  children,
}: {
  z?: number;
  /** Only the layer holding the click targets takes pointer events; the rest are paint. */
  interactive?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={clsx(
        'absolute inset-0 [transform-style:preserve-3d]',
        !interactive && 'pointer-events-none',
        className
      )}
      style={{ transform: `translateZ(${z}px)` }}
    >
      {children}
    </div>
  );
}

/**
 * An upright piece anchored to a board coordinate.
 *
 * The wrapper is a zero-size point at the board position; `--tt-billboard` turns the
 * camera rotation back off inside it, so the child is drawn in screen space with its
 * own origin on the board.
 */
export function Billboard({
  view,
  x,
  y,
  z = 2,
  className,
  children,
  ...rest
}: {
  view: BoardView;
  x: number;
  y: number;
  z?: number;
  className?: string;
  children: ReactNode;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`absolute h-0 w-0 ${className ?? ''}`}
      style={{
        left: x - view.minX,
        top: y - view.minY,
        transform: `translateZ(${z}px) var(--tt-billboard)`,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}

/**
 * The environment around the board (`docs/DESIGN.md` §5).
 *
 * Deliberately flat and unlit compared with the island: deep water at the edges, a
 * lighter pool of light where the board sits, and the sea texture held well back so it
 * reads as depth rather than as a competing pattern.
 */
function Ocean() {
  const [textureFailed, setTextureFailed] = useState(false);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[#071528]" data-cy="board-background-fallback" />

      {!textureFailed && (
        // eslint-disable-next-line @next/next/no-img-element -- needs a plain onError fallback, not next/image's opaque loader
        <img
          src={BOARD_BACKGROUND_IMAGE}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-50 [filter:saturate(0.75)_brightness(0.62)_contrast(1.08)]"
          data-cy="board-background-image"
          data-image-src={BOARD_BACKGROUND_IMAGE}
          onError={() => setTextureFailed(true)}
        />
      )}

      {/* Light pool under the board, then deep water everywhere else. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 66% 62% at 50% 46%, rgba(64,164,204,0.40) 0%, rgba(18,74,124,0.22) 44%, rgba(5,20,42,0.70) 78%, rgba(2,10,24,0.93) 100%)',
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(to bottom, rgba(3,12,28,0.55) 0%, rgba(3,12,28,0) 32%)',
        }}
      />
    </div>
  );
}

function CameraControls({
  onReset,
  onZoom,
}: {
  onReset: () => void;
  onZoom: (factor: number) => void;
}) {
  const button =
    'grid h-8 w-8 place-items-center rounded-md border border-white/10 bg-slate-950/55 text-slate-300 backdrop-blur-sm transition-colors hover:border-white/25 hover:text-white';

  return (
    <>
      <div
        className="absolute bottom-4 right-4 z-10 flex flex-col gap-1.5"
        data-cy="camera-controls"
      >
        <button type="button" className={button} onClick={() => onZoom(1.25)} title="Zoom in" data-cy="camera-zoom-in">
          <Plus className="h-4 w-4" />
        </button>
        <button type="button" className={button} onClick={() => onZoom(0.8)} title="Zoom out" data-cy="camera-zoom-out">
          <Minus className="h-4 w-4" />
        </button>
        <button type="button" className={button} onClick={onReset} title="Recentre the board" data-cy="camera-reset-btn">
          <Compass className="h-4 w-4" />
        </button>
      </div>

      <p className="pointer-events-none absolute bottom-5 left-4 z-10 text-[10px] font-medium uppercase tracking-wider text-white/25">
        Drag to move · Scroll to zoom · Right-drag to turn
      </p>
    </>
  );
}
