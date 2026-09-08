import * as THREE from 'three';
import { BoardView, toSceneSpace } from './geometry';
import { PieceKind, createPieceGeometries } from './pieces3d';

/**
 * The three.js layer that draws the game pieces over the 2D board.
 *
 * The board stays exactly what it was — SVG terrain on a tilted plane, with every click
 * target still a DOM node. This adds one transparent canvas on top of it and lights the
 * pieces properly, which is the arrangement `docs/threejs-example.jpeg` describes.
 *
 * Everything hangs off matching the CSS camera exactly. The board is projected by the
 * browser's `perspective` and `rotate` on a DOM element; the same projection is rebuilt
 * here so a settlement lands on the node it belongs to at any pan, zoom or orbit. Getting
 * that wrong does not look slightly off, it looks like the pieces are floating, so the
 * correspondence is written out step by step below rather than tuned by eye.
 *
 * No React, and no state of its own beyond the meshes: the caller pushes a piece list and
 * a camera pose, and asks for a frame.
 */

export interface ScenePiece {
  /** Stable across renders, so a piece that was already there is not rebuilt. */
  id: string;
  kind: PieceKind;
  /** Board coordinates. For a road this is one end of the edge. */
  x: number;
  y: number;
  /** Roads only: the other end. */
  x2?: number;
  y2?: number;
  /** CSS colour for the piece body. */
  color: string;
  /** A placement preview rather than a placed piece. */
  ghost?: boolean;
}

/** The CSS camera, as the board's own transform describes it. */
export interface CameraFrame {
  /** `rotateX` in degrees, as applied to the board element. */
  pitch: number;
  /** `rotateZ` in degrees. */
  yaw: number;
  /** Board units to CSS pixels. */
  scale: number;
  panX: number;
  panY: number;
  /** The CSS `perspective` distance, in pixels. */
  perspective: number;
  width: number;
  height: number;
}

export interface PieceScene {
  setCamera(frame: CameraFrame): void;
  setPieces(pieces: readonly ScenePiece[]): void;
  requestRender(): void;
  dispose(): void;
}

/** How long a newly placed piece takes to settle onto the board. */
const DROP_MS = 340;
/** Board units a piece falls through as it lands. */
const DROP_HEIGHT = 34;

const radians = (degrees: number) => (degrees * Math.PI) / 180;

export function createPieceScene(
  canvas: HTMLCanvasElement,
  view: BoardView
): PieceScene | null {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  } catch {
    return null;
  }

  renderer.setClearAlpha(0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 1, 4000);
  camera.up.set(0, 1, 0);

  /**
   * Everything the board transform applies to. Its matrix is set by hand from the CSS
   * camera rather than from position/rotation/scale, so it cannot drift out of step.
   */
  const root = new THREE.Group();
  root.matrixAutoUpdate = false;
  scene.add(root);

  // Light comes from over the player's left shoulder, fixed to the board rather than to
  // the camera, so shadows fall the same way on the tiles however the board is turned.
  const key = new THREE.DirectionalLight(0xfff4e0, 2.8);
  key.position.set(-420, 620, 900);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  const reach = Math.max(view.w, view.h) * 0.62;
  key.shadow.camera.left = -reach;
  key.shadow.camera.right = reach;
  key.shadow.camera.top = reach;
  key.shadow.camera.bottom = -reach;
  key.shadow.camera.near = 200;
  key.shadow.camera.far = 2600;
  key.shadow.bias = -0.0016;
  key.shadow.normalBias = 0.6;
  root.add(key);
  root.add(key.target);

  const fill = new THREE.DirectionalLight(0xbcd6ff, 0.65);
  fill.position.set(500, -320, 520);
  root.add(fill);
  root.add(new THREE.HemisphereLight(0xdcefff, 0x6b5a44, 1.1));

  // Catches the pieces' shadows and nothing else, so the board's own artwork shows
  // through everywhere a piece is not standing.
  const shadowCatcher = new THREE.Mesh(
    new THREE.PlaneGeometry(view.w * 2.2, view.h * 2.2),
    new THREE.ShadowMaterial({ opacity: 0.4 })
  );
  shadowCatcher.receiveShadow = true;
  root.add(shadowCatcher);

  const geometries = createPieceGeometries();
  const materials = new Map<string, THREE.MeshStandardMaterial>();

  const materialFor = (color: string, ghost: boolean) => {
    const cacheKey = `${color}|${ghost}`;
    const cached = materials.get(cacheKey);
    if (cached) return cached;

    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      roughness: ghost ? 0.4 : 0.52,
      metalness: 0.03,
      transparent: ghost,
      opacity: ghost ? 0.55 : 1,
      depthWrite: !ghost,
      emissive: new THREE.Color(color),
      emissiveIntensity: ghost ? 0.35 : 0.06,
    });
    materials.set(cacheKey, material);
    return material;
  };

  interface Placed {
    mesh: THREE.Mesh;
    spec: ScenePiece;
    /** When the piece appeared, so it can be dropped into place. */
    placedAt: number;
  }

  const placed = new Map<string, Placed>();
  let sized = { width: 0, height: 0, ratio: 0 };
  let frame = 0;
  let disposed = false;

  const position = (entry: Placed, drop: number) => {
    const { mesh, spec } = entry;

    if (spec.kind === 'road' && spec.x2 !== undefined && spec.y2 !== undefined) {
      const [ax, ay] = toSceneSpace(view, spec.x, spec.y);
      const [bx, by] = toSceneSpace(view, spec.x2, spec.y2);
      mesh.position.set((ax + bx) / 2, (ay + by) / 2, drop);
      mesh.rotation.set(0, 0, Math.atan2(by - ay, bx - ax));
      // The bar is a unit long, so scaling x is what makes it span the edge. The gap is
      // deliberate: roads meeting at a node should read as separate pieces.
      mesh.scale.set(Math.hypot(bx - ax, by - ay) * 0.82, 1, 1);
      return;
    }

    const [x, y] = toSceneSpace(view, spec.x, spec.y);
    mesh.position.set(x, y, drop);
  };

  /** Eases a piece down over `DROP_MS`; returns true while it is still moving. */
  const animate = (now: number): boolean => {
    let moving = false;

    for (const entry of placed.values()) {
      const t = (now - entry.placedAt) / DROP_MS;
      if (t >= 1) {
        if (entry.mesh.position.z !== 0) position(entry, 0);
        continue;
      }
      moving = true;
      // Cubic ease-out: fast arrival, soft landing.
      const eased = 1 - Math.pow(1 - Math.max(t, 0), 3);
      position(entry, DROP_HEIGHT * (1 - eased));
    }

    return moving;
  };

  const draw = () => {
    frame = 0;
    if (disposed) return;
    const moving = animate(performance.now());
    renderer.render(scene, camera);
    if (moving) requestRender();
  };

  function requestRender() {
    if (disposed || frame !== 0) return;
    frame = requestAnimationFrame(draw);
  }

  return {
    setCamera(cameraFrame) {
      const { width, height, perspective, scale, panX, panY, pitch, yaw } = cameraFrame;
      if (width === 0 || height === 0) return;

      // Guarded: assigning canvas.width reallocates the drawing buffer, so calling this
      // every frame would throw away the context's backing store sixty times a second.
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      if (width !== sized.width || height !== sized.height || ratio !== sized.ratio) {
        sized = { width, height, ratio };
        renderer.setPixelRatio(ratio);
        renderer.setSize(width, height, false);
      }

      // A CSS `perspective` of P is a pinhole camera P pixels in front of the plane the
      // element is laid out on, so this is the fov that reproduces it exactly.
      camera.position.set(0, 0, perspective);
      camera.lookAt(0, 0, 0);
      camera.fov = (2 * Math.atan(height / 2 / perspective) * 180) / Math.PI;
      camera.aspect = width / height;
      camera.near = Math.max(1, perspective * 0.02);
      camera.far = perspective * 3;
      camera.updateProjectionMatrix();

      // The board's own transform, rebuilt. The rotations are negated because CSS
      // measures y downwards and three.js measures it up.
      const matrix = new THREE.Matrix4().makeTranslation(panX, -panY, 0);
      matrix.multiply(new THREE.Matrix4().makeScale(scale, scale, scale));
      matrix.multiply(new THREE.Matrix4().makeRotationX(-radians(pitch)));
      matrix.multiply(new THREE.Matrix4().makeRotationZ(-radians(yaw)));

      root.matrix.copy(matrix);
      root.matrixWorldNeedsUpdate = true;
      requestRender();
    },

    setPieces(pieces) {
      const now = performance.now();
      const seen = new Set<string>();

      for (const spec of pieces) {
        seen.add(spec.id);
        const existing = placed.get(spec.id);

        if (existing && existing.spec.kind === spec.kind) {
          existing.spec = spec;
          existing.mesh.material = materialFor(spec.color, !!spec.ghost);
          existing.mesh.castShadow = !spec.ghost;
          position(existing, existing.mesh.position.z);
          continue;
        }

        if (existing) root.remove(existing.mesh);

        const mesh = new THREE.Mesh(geometries[spec.kind], materialFor(spec.color, !!spec.ghost));
        mesh.castShadow = !spec.ghost;
        mesh.receiveShadow = false;
        // A ghost draws over whatever it is previewing rather than fighting it.
        mesh.renderOrder = spec.ghost ? 1 : 0;

        const entry: Placed = { mesh, spec, placedAt: spec.ghost ? now - DROP_MS : now };
        position(entry, spec.ghost ? 0 : DROP_HEIGHT);
        placed.set(spec.id, entry);
        root.add(mesh);
      }

      for (const [id, entry] of placed) {
        if (seen.has(id)) continue;
        root.remove(entry.mesh);
        placed.delete(id);
      }

      requestRender();
    },

    requestRender,

    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      for (const entry of placed.values()) root.remove(entry.mesh);
      placed.clear();
      for (const geometry of Object.values(geometries)) geometry.dispose();
      for (const material of materials.values()) material.dispose();
      shadowCatcher.geometry.dispose();
      (shadowCatcher.material as THREE.Material).dispose();
      renderer.dispose();
    },
  };
}
