/**
 * Stage-1 diagnostic probes (temporary, debug-only).
 *
 * - Axes gizmo + asymmetric "F" block in GARMENT-LOCAL space at the semantic anchor:
 *   +X red, +Y green, +Z blue. The F's stem is on −X with arms toward +X, so in the
 *   UNMIRRORED image it reads "F"; inside the CSS-mirrored layer stack it must read
 *   reversed (like text on a shirt seen in a mirror).
 * - Debug materials: FrontSide-only, front-green/back-red (gl_FrontFacing), mid-grey.
 * - Orientation numbers: garment axes in camera space and in NDC, share of the torso's
 *   front-half triangles that rasterise counter-clockwise (= front faces visible).
 */

import * as THREE from 'three';

export type DebugMaterialMode = 'normal' | 'frontOnly' | 'faceColors' | 'midGrey';

export function createAxesGizmo(): THREE.Group {
  const g = new THREE.Group();
  g.name = 'debug_axes_gizmo';
  const L = 0.15;
  const mk = (dir: THREE.Vector3, color: number) => {
    const a = new THREE.ArrowHelper(dir, new THREE.Vector3(), L, color, 0.035, 0.02);
    a.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.Material | undefined;
      if (m) m.depthTest = false;
      o.renderOrder = 20;
    });
    return a;
  };
  g.add(mk(new THREE.Vector3(1, 0, 0), 0xff2020));
  g.add(mk(new THREE.Vector3(0, 1, 0), 0x20ff20));
  g.add(mk(new THREE.Vector3(0, 0, 1), 0x2060ff));
  // "F" in the XY plane, 3 cm in front (+Z) of the anchor, below the shoulder line.
  const mat = new THREE.MeshBasicMaterial({ color: 0xffd400, depthTest: false, side: THREE.DoubleSide });
  const box = (w: number, h: number, x: number, y: number) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.005), mat);
    m.position.set(x, y, 0.03);
    m.renderOrder = 20;
    g.add(m);
  };
  box(0.02, 0.12, -0.03, -0.12); // stem on −X
  box(0.07, 0.02, 0.005, -0.07); // top arm toward +X
  box(0.05, 0.02, -0.005, -0.12); // middle arm toward +X
  return g;
}

export function createFaceColorMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    vertexShader: 'void main(){ gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'void main(){ gl_FragColor = gl_FrontFacing ? vec4(0.0,1.0,0.0,1.0) : vec4(1.0,0.0,0.0,1.0); }',
  });
}

export function createMidGreyMaterial(): THREE.MeshStandardMaterial {
  // sRGB #808080 (linear 0.216): must read as neutral mid-grey, not white.
  return new THREE.MeshStandardMaterial({ color: 0x808080, roughness: 1, metalness: 0, side: THREE.DoubleSide });
}

export interface OrientationProbe {
  /** Garment axes in camera space (unit vectors). */
  xCam: [number, number, number];
  yCam: [number, number, number];
  zCam: [number, number, number];
  /** Direction of each axis on screen in NDC (unmirrored), normalised. */
  xNdc: [number, number];
  yNdc: [number, number];
  /** dot(garment +X on screen, right→left shoulder on screen); +1 = consistent. */
  xVsShoulders: number | null;
  /** % of front-half (local z>0) torso triangles that rasterise CCW (front-facing). */
  frontHalfFrontFacingPct: number | null;
}

const toNdc = (p: THREE.Vector3, cam: THREE.Camera) => p.clone().applyMatrix4(cam.matrixWorldInverse).applyMatrix4((cam as THREE.PerspectiveCamera).projectionMatrix);

export function computeOrientationProbe(
  anchorGroup: THREE.Object3D,
  anchorLocal: THREE.Vector3,
  camera: THREE.Camera,
  torso: THREE.Mesh | null,
  shoulderNdc?: { left: { x: number; y: number }; right: { x: number; y: number } } | null
): OrientationProbe {
  const m = anchorGroup.matrixWorld;
  const basis = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  m.extractBasis(basis[0], basis[1], basis[2]);
  basis.forEach((b) => b.normalize());
  const o = anchorLocal.clone().applyMatrix4(m);
  const o2 = toNdc(o, camera);
  const axisNdc = (b: THREE.Vector3): [number, number] => {
    const p = toNdc(o.clone().addScaledVector(b, 0.1), camera);
    const d = new THREE.Vector2(p.x - o2.x, p.y - o2.y).normalize();
    return [d.x, d.y];
  };
  const xNdc = axisNdc(basis[0]);
  const yNdc = axisNdc(basis[1]);
  let xVsShoulders: number | null = null;
  if (shoulderNdc) {
    const s = new THREE.Vector2(shoulderNdc.left.x - shoulderNdc.right.x, shoulderNdc.left.y - shoulderNdc.right.y).normalize();
    xVsShoulders = s.x * xNdc[0] + s.y * xNdc[1];
  }

  let pct: number | null = null;
  if (torso) {
    const pos = torso.geometry.getAttribute('position') as THREE.BufferAttribute;
    const idx = torso.geometry.getIndex();
    if (idx) {
      const mv = new THREE.Matrix4().multiplyMatrices(camera.matrixWorldInverse, torso.matrixWorld);
      const P = (camera as THREE.PerspectiveCamera).projectionMatrix;
      const v = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
      let front = 0, total = 0;
      for (let t = 0; t < idx.count; t += 3) {
        let zSum = 0;
        for (let k = 0; k < 3; k++) {
          const i = idx.getX(t + k);
          zSum += pos.getZ(i);
          v[k].set(pos.getX(i), pos.getY(i), pos.getZ(i)).applyMatrix4(mv).applyMatrix4(P);
        }
        if (zSum <= 0) continue; // back half of the garment
        total++;
        const area = (v[1].x - v[0].x) * (v[2].y - v[0].y) - (v[2].x - v[0].x) * (v[1].y - v[0].y);
        if (area > 0) front++;
      }
      pct = total ? (100 * front) / total : null;
    }
  }
  const t3 = (b: THREE.Vector3): [number, number, number] => [b.x, b.y, b.z];
  return { xCam: t3(basis[0]), yCam: t3(basis[1]), zCam: t3(basis[2]), xNdc, yNdc, xVsShoulders, frontHalfFrontFacingPct: pct };
}

/** Reads one pixel of the just-rendered frame at an NDC position (call right after render). */
export function readPixelAtNdc(renderer: THREE.WebGLRenderer, ndc: { x: number; y: number }): [number, number, number] | null {
  const gl = renderer.getContext();
  const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
  const x = Math.round(((ndc.x + 1) / 2) * w), y = Math.round(((ndc.y + 1) / 2) * h);
  if (x < 0 || y < 0 || x >= w || y >= h) return null;
  const px = new Uint8Array(4);
  gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
  return [px[0], px[1], px[2]];
}
