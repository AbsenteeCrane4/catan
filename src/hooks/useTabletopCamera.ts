'use client';

import { useCallback, useEffect, useRef } from 'react';

/**
 * The tabletop camera.
 *
 * Camera state is presentation state (`docs/DESIGN.md` §32): it never enters `GameState`,
 * never produces socket traffic, and — the part that constrains the implementation — never
 * enters React state either. Every frame writes a transform straight onto two DOM nodes,
 * so dragging the board around a live multiplayer game rerenders nothing.
 *
 * The projection is CSS 3D rather than a hand-rolled one so the browser does the
 * perspective divide *and* the inverse hit-testing: a click on a settlement node still
 * lands on the same `<g>` it did when the board was flat, which is why every board
 * `data-cy` selector survives the redesign unchanged.
 */

export const CAMERA = {
  /**
   * `rotateX` in degrees. The board's elevation above the table is `90 - pitch`, so the
   * 43° start is a 47° downward view — inside the 45–50° the design asks for, tuned by
   * eye against the reference image.
   */
  pitch: { min: 28, max: 55, start: 43 },
  /** `rotateZ`. Deliberately narrow: a tabletop turns a little, it does not spin. */
  yaw: { min: -32, max: 32, start: 0 },
  zoom: { min: 0.62, max: 2.4, start: 1 },
  /** Perspective distance as a multiple of the board's on-screen width. */
  perspective: 2.1,
  /** How far the board centre may travel from the viewport centre, as a fraction of it. */
  panLimit: 0.42,
} as const;

/** Per-channel easing. Pan tracks the pointer closely; orbit and zoom glide. */
const EASE = { pan: 0.45, zoom: 0.2, orbit: 0.2 };

/** A drag beyond this many pixels is a camera move, and must not also be a click. */
const DRAG_SLOP = 4;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const rad = (deg: number) => (deg * Math.PI) / 180;

interface Pose {
  pitch: number;
  yaw: number;
  zoom: number;
  panX: number;
  panY: number;
}

const startPose = (): Pose => ({
  pitch: CAMERA.pitch.start,
  yaw: CAMERA.yaw.start,
  zoom: CAMERA.zoom.start,
  panX: 0,
  panY: 0,
});

interface TabletopCameraOptions {
  /** Board bounding box in board units — the size the world element is laid out at. */
  boardWidth: number;
  boardHeight: number;
}

export function useTabletopCamera({ boardWidth, boardHeight }: TabletopCameraOptions) {
  const sceneRef = useRef<HTMLDivElement | null>(null);
  const worldRef = useRef<HTMLDivElement | null>(null);

  const target = useRef<Pose>(startPose());
  const current = useRef<Pose>(startPose());
  /** Scale that fits the whole board in the viewport; zoom multiplies it. */
  const fit = useRef(1);
  /** Static lift that re-centres the projected board in its region. */
  const offsetY = useRef(0);
  const frame = useRef(0);
  const dragged = useRef(false);
  /** Live pointers, so a second finger turns a drag into a pinch. */
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<'none' | 'pan' | 'orbit' | 'pinch'>('none');
  const pinchDistance = useRef(0);

  const write = useCallback(() => {
    const scene = sceneRef.current;
    const world = worldRef.current;
    if (!scene || !world) return;

    const { pitch, yaw, zoom, panX, panY } = current.current;
    const scale = fit.current * zoom;

    world.style.transform =
      `translate3d(${panX.toFixed(2)}px, ${(panY + offsetY.current).toFixed(2)}px, 0) ` +
      `scale(${scale.toFixed(4)}) rotateX(${pitch.toFixed(2)}deg) rotateZ(${yaw.toFixed(2)}deg)`;

    // Perspective tracks the board's on-screen size, so zooming magnifies the scene
    // instead of walking the camera into it and warping the far tiles.
    scene.style.perspective = `${Math.max(600, boardWidth * scale * CAMERA.perspective).toFixed(0)}px`;

    // The one transform that stands a piece up again. Every billboard reads this, so
    // the whole board's worth of pieces costs a single property write per frame.
    scene.style.setProperty(
      '--tt-billboard',
      `rotateZ(${(-yaw).toFixed(2)}deg) rotateX(${(-pitch).toFixed(2)}deg)`
    );
  }, [boardWidth]);

  /**
   * Runs the pose towards its target, then parks itself. No frame is scheduled while the
   * camera is at rest, so an idle board costs nothing.
   */
  const schedule = useCallback(() => {
    if (frame.current !== 0) return;

    // A function declaration rather than a const so the loop can schedule itself.
    function step() {
      frame.current = 0;
      const c = current.current;
      const t = target.current;

      c.panX += (t.panX - c.panX) * EASE.pan;
      c.panY += (t.panY - c.panY) * EASE.pan;
      c.zoom += (t.zoom - c.zoom) * EASE.zoom;
      c.yaw += (t.yaw - c.yaw) * EASE.orbit;
      c.pitch += (t.pitch - c.pitch) * EASE.orbit;

      const settled =
        Math.abs(t.panX - c.panX) < 0.05 &&
        Math.abs(t.panY - c.panY) < 0.05 &&
        Math.abs(t.zoom - c.zoom) < 0.0005 &&
        Math.abs(t.yaw - c.yaw) < 0.02 &&
        Math.abs(t.pitch - c.pitch) < 0.02;

      if (settled) Object.assign(c, t);
      write();
      if (!settled) frame.current = requestAnimationFrame(step);
    }

    frame.current = requestAnimationFrame(step);
  }, [write]);

  const clampPan = useCallback(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    // The board centre may never leave the viewport, so the board is always recoverable
    // even before the player reaches for Recenter.
    const limitX = scene.clientWidth * CAMERA.panLimit;
    const limitY = scene.clientHeight * CAMERA.panLimit;
    target.current.panX = clamp(target.current.panX, -limitX, limitX);
    target.current.panY = clamp(target.current.panY, -limitY, limitY);
  }, []);

  const measure = useCallback(() => {
    const scene = sceneRef.current;
    if (!scene || boardWidth <= 0 || boardHeight <= 0) return;

    const w = scene.clientWidth;
    const h = scene.clientHeight;
    if (w === 0 || h === 0) return;

    // How the tilted plane actually projects, rather than a guess at it. The near edge
    // is closer to the eye and so is magnified; the far edge shrinks. Because the
    // perspective distance is itself proportional to the scale, both factors are
    // independent of zoom, which is what makes zoom a clean magnification.
    const tilt = rad(CAMERA.pitch.start);
    const depth = boardWidth * CAMERA.perspective;
    const half = boardHeight / 2;
    const near = depth / (depth - half * Math.sin(tilt));
    const far = depth / (depth + half * Math.sin(tilt));

    const projectedWidth = boardWidth * near;
    const projectedHeight = Math.cos(tilt) * half * (near + far);

    fit.current = Math.min((w * 0.97) / projectedWidth, (h * 0.94) / projectedHeight);
    // The same asymmetry pushes the board's projected middle below the vanishing point,
    // so the board is lifted back to the centre of its region.
    offsetY.current = -fit.current * Math.cos(tilt) * half * (near - far) * 0.5;

    clampPan();
    schedule();
  }, [boardWidth, boardHeight, clampPan, schedule]);

  const reset = useCallback(() => {
    Object.assign(target.current, startPose());
    schedule();
  }, [schedule]);

  /** Zoom by `factor`, keeping the board point under (clientX, clientY) where it is. */
  const zoomAt = useCallback(
    (factor: number, clientX: number, clientY: number) => {
      const scene = sceneRef.current;
      if (!scene) return;

      const t = target.current;
      const next = clamp(t.zoom * factor, CAMERA.zoom.min, CAMERA.zoom.max);
      const ratio = next / t.zoom;
      if (ratio === 1) return;

      const box = scene.getBoundingClientRect();
      const mx = clientX - (box.left + box.width / 2);
      const my = clientY - (box.top + box.height / 2);

      t.panX = mx * (1 - ratio) + t.panX * ratio;
      t.panY = my * (1 - ratio) + t.panY * ratio;
      t.zoom = next;
      clampPan();
      schedule();
    },
    [clampPan, schedule]
  );

  // Native listeners rather than React props: the wheel handler has to be non-passive to
  // stop the page scrolling, and the click guard has to run in the capture phase before
  // any board handler sees it.
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const midpoint = () => {
      const pts = [...pointers.current.values()];
      const sum = pts.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
      return { x: sum.x / pts.length, y: sum.y / pts.length };
    };
    const spread = () => {
      const [a, b] = [...pointers.current.values()];
      return Math.hypot(a.x - b.x, a.y - b.y);
    };

    // Capture keeps a drag alive when the pointer leaves the board, but throws for a
    // pointer id the browser never issued — which is exactly what a synthetic event is.
    const capture = (id: number, on: boolean) => {
      try {
        if (on) scene.setPointerCapture(id);
        else scene.releasePointerCapture(id);
      } catch {
        // Nothing to recover: the drag still tracks through the listeners below.
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      // deltaMode 1 is lines, not pixels — Firefox reports wheel notches that way.
      const delta = e.deltaY * (e.deltaMode === 1 ? 16 : 1);
      zoomAt(Math.exp(-delta * 0.0016), e.clientX, e.clientY);
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0 && e.button !== 1 && e.button !== 2) return;
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      capture(e.pointerId, true);

      if (pointers.current.size === 2) {
        gesture.current = 'pinch';
        pinchDistance.current = spread();
        return;
      }
      // Right button, middle button or shift-drag orbits; a plain drag moves the board.
      gesture.current = e.button === 0 && !e.shiftKey ? 'pan' : 'orbit';
      dragged.current = false;
    };

    const onPointerMove = (e: PointerEvent) => {
      const previous = pointers.current.get(e.pointerId);
      if (!previous) return;
      const dx = e.clientX - previous.x;
      const dy = e.clientY - previous.y;
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (Math.abs(dx) > DRAG_SLOP || Math.abs(dy) > DRAG_SLOP) dragged.current = true;

      const t = target.current;
      if (gesture.current === 'pinch' && pointers.current.size === 2) {
        const next = spread();
        const centre = midpoint();
        if (pinchDistance.current > 0) zoomAt(next / pinchDistance.current, centre.x, centre.y);
        pinchDistance.current = next;
        return;
      }

      if (gesture.current === 'pan') {
        t.panX += dx;
        t.panY += dy;
        clampPan();
      } else if (gesture.current === 'orbit') {
        t.yaw = clamp(t.yaw + dx * 0.22, CAMERA.yaw.min, CAMERA.yaw.max);
        t.pitch = clamp(t.pitch + dy * 0.16, CAMERA.pitch.min, CAMERA.pitch.max);
      } else {
        return;
      }
      schedule();
    };

    const endPointer = (e: PointerEvent) => {
      pointers.current.delete(e.pointerId);
      capture(e.pointerId, false);
      if (pointers.current.size < 2) pinchDistance.current = 0;
      if (pointers.current.size === 0) gesture.current = 'none';
    };

    // A drag that moved the camera must not also place a settlement.
    const onClickCapture = (e: MouseEvent) => {
      if (!dragged.current) return;
      dragged.current = false;
      e.stopPropagation();
      e.preventDefault();
    };

    const onContextMenu = (e: MouseEvent) => e.preventDefault();

    scene.addEventListener('wheel', onWheel, { passive: false });
    scene.addEventListener('pointerdown', onPointerDown);
    scene.addEventListener('pointermove', onPointerMove);
    scene.addEventListener('pointerup', endPointer);
    scene.addEventListener('pointercancel', endPointer);
    scene.addEventListener('click', onClickCapture, true);
    scene.addEventListener('contextmenu', onContextMenu);

    return () => {
      scene.removeEventListener('wheel', onWheel);
      scene.removeEventListener('pointerdown', onPointerDown);
      scene.removeEventListener('pointermove', onPointerMove);
      scene.removeEventListener('pointerup', endPointer);
      scene.removeEventListener('pointercancel', endPointer);
      scene.removeEventListener('click', onClickCapture, true);
      scene.removeEventListener('contextmenu', onContextMenu);
    };
  }, [clampPan, schedule, zoomAt]);

  useEffect(() => {
    measure();
    // jsdom has no ResizeObserver; the board still renders, it just never re-fits.
    if (typeof ResizeObserver === 'undefined') return;
    const scene = sceneRef.current;
    if (!scene) return;

    const observer = new ResizeObserver(measure);
    observer.observe(scene);
    return () => observer.disconnect();
  }, [measure]);

  useEffect(
    () => () => {
      // Clearing the id matters as much as cancelling the frame: React remounts effects
      // in development, and a leftover id makes `schedule` believe a loop is already
      // running, so the camera would never write its first transform.
      cancelAnimationFrame(frame.current);
      frame.current = 0;
    },
    []
  );

  /** Zoom about the middle of the board, for the on-screen buttons and keyboard users. */
  const zoomBy = useCallback(
    (factor: number) => {
      const box = sceneRef.current?.getBoundingClientRect();
      if (!box) return;
      zoomAt(factor, box.left + box.width / 2, box.top + box.height / 2);
    },
    [zoomAt]
  );

  return { sceneRef, worldRef, reset, zoomBy };
}
