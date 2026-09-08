'use client';

import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Hex } from '@/types/catan';
import { BoardView, islandPath } from '@/lib/board/geometry';
import { PieceScene, ScenePiece, createPieceScene } from '@/lib/board/pieceScene';
import { BOARD_BACKGROUND_IMAGE } from '@/lib/constants';
import { CAMERA, useTabletopCamera } from '@/hooks/useTabletopCamera';
import { Compass, Minus, Plus } from 'lucide-react';
import { clsx } from 'clsx';

/**
 * The tabletop: a flat board on an ocean, seen from an elevated angle, with the game
 * pieces standing on it as real 3D objects.
 *
 * The split is the one `docs/threejs-example.jpeg` describes and `docs/renderer-spike.md`
 * records. The **board is 2D** — SVG terrain on a CSS-transformed plane, where every
 * click target is still a DOM node and every board `data-cy` still resolves. The
 * **pieces are three.js**, drawn on one transparent canvas laid over it, lit and casting
 * real shadows down onto the board.
 *
 * Two kinds of thing still live in the DOM plane:
 *
 * - **Ground layers** lie on the board and foreshorten with it: terrain, harbours,
 *   legal-target markers, click targets.
 * - **Billboards** stand up out of it: the number tokens, which have to stay square to
 *   the player to stay readable.
 */

interface TabletopProps {
  view: BoardView;
  hexes: readonly Hex[];
  /** Flat layers on the board plane, drawn in order from the surface upwards. */
  ground: ReactNode;
  /** Upright DOM elements that belong to the board itself, such as the number tokens. */
  billboards: ReactNode;
  /** The game pieces, rendered by three.js over everything else. */
  meshes: readonly ScenePiece[];
  /**
   * Drawn in place of `meshes` when WebGL is unavailable. Without it, a machine that
   * cannot open a 3D context would show a board with no pieces on it — not a degraded
   * game so much as an unplayable one.
   */
  fallbackPieces: ReactNode;
}

export function Tabletop({
  view,
  hexes,
  ground,
  billboards,
  meshes,
  fallbackPieces,
}: TabletopProps) {
  const { sceneRef, worldRef, reset, zoomBy, onFrame } = useTabletopCamera({
    boardWidth: view.w,
    boardHeight: view.h,
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fallbackRef = useRef<HTMLDivElement | null>(null);
  const pieceScene = useRef<PieceScene | null>(null);
  const latestMeshes = useRef(meshes);

  useEffect(() => {
    const canvas = canvasRef.current;
    const fallback = fallbackRef.current;
    if (!canvas) return;

    const scene = createPieceScene(canvas, view);
    // No context available: leave the DOM fallback showing and do nothing else.
    if (!scene) return;

    pieceScene.current = scene;
    canvas.dataset.webgl = 'on';
    // Hidden on the element rather than through React state. Whether the browser has
    // WebGL is not knowable when the server renders, so this has to be a capability
    // check after mount, and a state update here would be a hydration mismatch.
    if (fallback) fallback.hidden = true;

    const stopTracking = onFrame(frame => scene.setCamera(frame));
    scene.setPieces(latestMeshes.current);

    return () => {
      stopTracking();
      scene.dispose();
      pieceScene.current = null;
      delete canvas.dataset.webgl;
      if (fallback) fallback.hidden = false;
    };
  }, [view, onFrame]);

  useEffect(() => {
    latestMeshes.current = meshes;
    pieceScene.current?.setPieces(meshes);
  }, [meshes]);

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
          {/* The board is flat, so this is a contact shadow on the water rather than the
              underside of a slab. */}
          <WorldLayer z={-2} className="opacity-70">
            <svg viewBox={box} className="h-full w-full overflow-visible" aria-hidden>
              <path
                d={surface}
                fill="#031020"
                transform="translate(4, 14)"
                style={{ filter: 'blur(13px)' }}
              />
            </svg>
          </WorldLayer>

          {/* Shallows, then surf breaking on the coast. */}
          <WorldLayer z={-1}>
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

          {ground}

          <div className="absolute inset-0 [transform-style:preserve-3d]" data-cy="piece-layer">
            {billboards}
            <div
              ref={fallbackRef}
              data-cy="piece-fallback"
              className="absolute inset-0 [transform-style:preserve-3d]"
            >
              {fallbackPieces}
            </div>
          </div>
        </div>
      </div>

      {/* The 3D pieces. Inert to the pointer: every click still lands on the board's own
          DOM targets underneath, which is what keeps the interaction — and every spec —
          identical to the board without it. */}
      <canvas
        ref={canvasRef}
        data-cy="piece-canvas"
        className="pointer-events-none absolute inset-0 h-full w-full"
      />

      <CameraControls onReset={reset} onZoom={zoomBy} />
    </div>
  );
}

/** A flat layer on the board plane, lifted `z` board units along the board's own normal. */
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
 * An upright element anchored to a board coordinate.
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
