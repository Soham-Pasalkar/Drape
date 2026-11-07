/**
 * DRAPE Garment Rig — anchors, rest transforms and sleeve articulation.
 *
 * FRAMES
 *   garment-local (G): the GLB scene root's space (metres, +X = wearer's left, +Y up, +Z front).
 *   body-local    (B): see mhr-body-proxy.ts.
 *   camera / world (C): Three.js camera space (the scene has no other world frame).
 *
 * ANCHOR RELATIONSHIP
 *   A garment-local semantic anchor a_G (e.g. midpoint of the shoulder seams) must coincide
 *   with a body-local attachment anchor a_B (e.g. midpoint of the shoulder joints):
 *        T_GC · a_G = T_BC · a_B
 *   With a fit scale S applied about the garment anchor, the unique garment-root transform is
 *        T_GC = T_BC · Tr(a_B) · S · Tr(−a_G)
 *   The scene realises this as a hierarchy, which multiplies in exactly that order:
 *        bodyRoot (T_BC) → wrapper (position a_B, scale S) → gltf root (position −a_G)
 *   No other offsets are applied anywhere.
 */

import * as THREE from 'three';
import { GarmentMetadata } from './types';

// ---------------------------------------------------------------------------------------
// Anchor composition
// ---------------------------------------------------------------------------------------

export function composeGarmentRootMatrix(
  bodyToCamera: THREE.Matrix4,
  bodyAnchor: THREE.Vector3,
  fitScale: THREE.Vector3,
  garmentAnchor: THREE.Vector3,
  out = new THREE.Matrix4()
): THREE.Matrix4 {
  const trB = new THREE.Matrix4().makeTranslation(bodyAnchor.x, bodyAnchor.y, bodyAnchor.z);
  const sc = new THREE.Matrix4().makeScale(fitScale.x, fitScale.y, fitScale.z);
  const trG = new THREE.Matrix4().makeTranslation(-garmentAnchor.x, -garmentAnchor.y, -garmentAnchor.z);
  return out.copy(bodyToCamera).multiply(trB).multiply(sc).multiply(trG);
}

// ---------------------------------------------------------------------------------------
// Semantic anchor from geometry
// ---------------------------------------------------------------------------------------

export interface SemanticAnchorResult {
  anchor: THREE.Vector3;
  neckline?: THREE.Vector3;
  source: 'geometry' | 'metadata';
  /** |geometry − metadata| in metres (NaN when geometry could not be evaluated). */
  metadataDeltaM: number;
  /** Feature points the anchor was derived from (garment-local), for diagnostics. */
  featurePoints: THREE.Vector3[];
}

/** Collects all mesh vertices in garment-local space (root must have identity parent). */
function collectVertices(root: THREE.Object3D, filter?: (m: THREE.Mesh) => boolean): THREE.Vector3[] {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const out: THREE.Vector3[] = [];
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || (filter && !filter(m))) return;
    const toRoot = new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld);
    const pos = m.geometry.getAttribute('position');
    for (let i = 0; i < pos.count; i++) {
      out.push(new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)).applyMatrix4(toRoot));
    }
  });
  return out;
}

/**
 * Derives the garment-local semantic anchor from the actual GLB geometry:
 *  - shoulder_center: midpoint of the two shoulder seam points = the most lateral vertices of
 *    the main body mesh within its top 6 % of height.
 *  - waist_center / neckline_center: centroid of the top opening ring (vertices within 5 mm of
 *    the garment's highest point).
 * Falls back to metadata.modelAnchor only if geometry yields no candidates.
 */
export function computeSemanticAnchor(root: THREE.Object3D, metadata: GarmentMetadata): SemanticAnchorResult {
  const meta = new THREE.Vector3(metadata.modelAnchor.x, metadata.modelAnchor.y, metadata.modelAnchor.z);
  const mainName = metadata.construction?.simulationMesh;
  let main = collectVertices(root, (m) => !mainName || m.name === mainName);
  if (main.length === 0) main = collectVertices(root);
  if (main.length === 0) {
    return { anchor: meta, source: 'metadata', metadataDeltaM: NaN, featurePoints: [] };
  }

  let minY = Infinity;
  let maxY = -Infinity;
  for (const v of main) {
    minY = Math.min(minY, v.y);
    maxY = Math.max(maxY, v.y);
  }

  let anchor: THREE.Vector3;
  let features: THREE.Vector3[];
  let neckline: THREE.Vector3 | undefined;
  if (metadata.modelAnchor.type === 'shoulder_center') {
    const band = main.filter((v) => v.y >= maxY - 0.06 * (maxY - minY));
    let left = band[0];
    let right = band[0];
    for (const v of band) {
      if (v.x > left.x) left = v;
      if (v.x < right.x) right = v;
    }
    anchor = left.clone().add(right).multiplyScalar(0.5);
    features = [left.clone(), right.clone()];

    // Front collar neckline reference from geometry: front-center dip of collar opening.
    // In DRAPE assets, the collar rim opening has UV v ≈ 0, z > 0, |x| < 0.04 m.
    const foundNeckline: THREE.Vector3[] = [];
    root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh || m.name.includes('sleeve') || m.name.includes('cuff')) return;
      const posAttr = m.geometry.getAttribute('position');
      const uvAttr = m.geometry.getAttribute('uv');
      if (!posAttr) return;
      const mat = m.matrixWorld;
      for (let i = 0; i < posAttr.count; i++) {
        const x = posAttr.getX(i);
        const y = posAttr.getY(i);
        const z = posAttr.getZ(i);
        const v = uvAttr ? uvAttr.getY(i) : 0;
        if (uvAttr && v < 0.02 && z > 0 && Math.abs(x) < 0.04) {
          const pt = new THREE.Vector3(x, y, z).applyMatrix4(mat);
          if (!foundNeckline[0] || pt.y < foundNeckline[0].y) foundNeckline[0] = pt;
        }
      }
    });
    if (foundNeckline.length > 0) {
      neckline = foundNeckline[0].clone();
    } else {
      // Fallback if UVs not present: top 15% of garment height, front-center
      const collarFront = main.filter((v) => Math.abs(v.x) < 0.03 && v.z > 0 && v.y >= maxY - 0.15 * (maxY - minY));
      if (collarFront.length > 0) {
        let lowest = collarFront[0];
        for (const v of collarFront) {
          if (v.y < lowest.y) lowest = v;
        }
        neckline = lowest.clone();
      }
    }
  } else {
    // Top opening of the whole garment (waistband / neckline ring).
    const all = collectVertices(root);
    let top = -Infinity;
    for (const v of all) top = Math.max(top, v.y);
    const ring = all.filter((v) => v.y >= top - 0.005);
    anchor = ring.reduce((acc, v) => acc.add(v), new THREE.Vector3()).divideScalar(ring.length);
    features = ring.slice(0, 8);
  }
  return { anchor, neckline, source: 'geometry', metadataDeltaM: anchor.distanceTo(meta), featurePoints: features };
}

/**
 * Smoothly lifts the collar dip vertices of the torso mesh upward (+Y) by `offset` metres.
 * Applied in garment-local geometry space to collar vertices (|x| < 0.10 m, z > 0, v < 0.15).
 * Does not disturb the shoulder seams (|x| > 0.18 m) or any other garment anchor.
 */
export function applyNecklineOffset(
  root: THREE.Object3D,
  offset: number,
  simulationMeshName?: string
): number {
  if (!offset || Math.abs(offset) < 1e-5) return 0;
  let modifiedCount = 0;
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    if (simulationMeshName && m.name !== simulationMeshName && !m.name.includes('torso') && !m.name.includes('dress')) return;
    const pos = m.geometry.getAttribute('position');
    const uv = m.geometry.getAttribute('uv');
    if (!pos || !uv) return;

    const collarHalfWidth = 0.09;
    const maxV = 0.08;
    for (let i = 0; i < pos.count; i++) {
      const v = uv.getY(i);
      const x = pos.getX(i);
      const z = pos.getZ(i);
      if (v < maxV && Math.abs(x) < collarHalfWidth && z > 0) {
        const factorX = 1 - Math.abs(x) / collarHalfWidth;
        const factorV = 1 - v / maxV;
        pos.setY(i, pos.getY(i) + offset * factorX * factorV);
        modifiedCount++;
      }
    }
    if (modifiedCount > 0) {
      pos.needsUpdate = true;
      m.geometry.computeVertexNormals();
      m.geometry.computeBoundingBox();
      m.geometry.computeBoundingSphere();
    }
  });
  return modifiedCount;
}

// ---------------------------------------------------------------------------------------
// Rest transforms
// ---------------------------------------------------------------------------------------

export interface RestTransform {
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  scale: THREE.Vector3;
  matrix: THREE.Matrix4;
  parentName: string | null;
}

export function captureRestTransforms(root: THREE.Object3D): Map<THREE.Object3D, RestTransform> {
  const map = new Map<THREE.Object3D, RestTransform>();
  root.traverse((o) => {
    o.updateMatrix();
    map.set(o, {
      position: o.position.clone(),
      quaternion: o.quaternion.clone(),
      scale: o.scale.clone(),
      matrix: o.matrix.clone(),
      parentName: o.parent ? o.parent.name : null,
    });
  });
  return map;
}

// ---------------------------------------------------------------------------------------
// Sleeve articulation
// ---------------------------------------------------------------------------------------

export interface SleeveDescriptor {
  node: THREE.Object3D;
  side: 'left' | 'right';
  rest: RestTransform;
  /** Sleeve axis (seam → cuff) in the node's own local space, from its geometry. */
  axisLocal: THREE.Vector3;
  /** Rest axis in the parent (garment-local) frame: q_rest · axisLocal. */
  restAxisParent: THREE.Vector3;
  lengthM: number;
  openingRadiusM: number;
  /**
   * Minimum frontal-plane abduction (radians) so the sleeve's inner wall does not enter the
   * torso: asin(r / L) for opening radius r and sleeve length L.
   */
  minAbductionRad: number;
  /** Rotation garment-root → sleeve parent (inverse applied to garment-local directions). */
  rootToParent: THREE.Quaternion;
  /** Armhole seam pivot point in the node's own local space. */
  pivotLocal: THREE.Vector3;
}

/** Determines a sleeve's seam→cuff axis, pivot point and dimensions from geometry. */
export function describeSleeve(
  node: THREE.Mesh,
  side: 'left' | 'right',
  rest: RestTransform,
  rootToParent: THREE.Quaternion = new THREE.Quaternion()
): SleeveDescriptor {
  const geom = node.geometry;
  const pos = geom.getAttribute('position');
  const uv = geom.getAttribute('uv');

  let axisLocal: THREE.Vector3;
  let pivotLocal: THREE.Vector3;
  let lengthM: number;
  let openingRadiusM: number;

  const seamPts: THREE.Vector3[] = [];
  const cuffPts: THREE.Vector3[] = [];

  if (pos && uv) {
    for (let i = 0; i < pos.count; i++) {
      const p = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i));
      const v = uv.getY(i);
      if (v < 0.05) seamPts.push(p);
      if (v > 0.95) cuffPts.push(p);
    }
  }

  if (seamPts.length >= 4 && cuffPts.length >= 4) {
    const seamCenter = seamPts.reduce((acc, p) => acc.add(p), new THREE.Vector3()).divideScalar(seamPts.length);
    const cuffCenter = cuffPts.reduce((acc, p) => acc.add(p), new THREE.Vector3()).divideScalar(cuffPts.length);
    axisLocal = cuffCenter.clone().sub(seamCenter).normalize();
    lengthM = seamCenter.distanceTo(cuffCenter);
    pivotLocal = seamCenter;
    let maxR = 0;
    for (const p of seamPts) maxR = Math.max(maxR, p.distanceTo(seamCenter));
    openingRadiusM = maxR > 0 ? maxR : 0.05;
  } else {
    geom.computeBoundingBox();
    const box = geom.boundingBox!;
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const dims = [size.x, size.y, size.z];
    const axisIdx = dims.indexOf(Math.max(...dims));
    axisLocal = new THREE.Vector3();
    axisLocal.setComponent(axisIdx, Math.sign(center.getComponent(axisIdx)) || (side === 'left' ? 1 : -1));
    lengthM = dims[axisIdx];
    openingRadiusM = Math.max(...dims.filter((_, i) => i !== axisIdx)) / 2;
    pivotLocal = center.clone();
    pivotLocal.x = side === 'left' ? box.min.x : box.max.x;
  }

  const restAxisParent = axisLocal.clone().applyQuaternion(rest.quaternion).normalize();
  return {
    node,
    side,
    rest,
    axisLocal,
    restAxisParent,
    lengthM,
    openingRadiusM,
    minAbductionRad: Math.asin(Math.min(1, openingRadiusM / Math.max(lengthM, 1e-6))),
    rootToParent: rootToParent.clone().invert(),
    pivotLocal,
  };
}

/**
 * Clamps a garment-local arm direction so its frontal-plane abduction is ≥ minAbduction.
 * Abduction ψ = atan2(lateral, −y) where lateral = +x for the left side, −x for the right.
 * The forward (z) component is preserved.
 */
export function clampAbduction(dir: THREE.Vector3, side: 'left' | 'right', minAbduction: number, out = new THREE.Vector3()): THREE.Vector3 {
  const sgn = side === 'left' ? 1 : -1;
  const lateral = dir.x * sgn;
  const down = -dir.y;
  const r = Math.hypot(lateral, down);
  const psi = Math.atan2(lateral, down);
  out.copy(dir);
  if (r > 1e-6 && psi < minAbduction && psi > -Math.PI / 2) {
    out.x = sgn * r * Math.sin(minAbduction);
    out.y = -r * Math.cos(minAbduction);
  }
  return out.normalize();
}

/**
 * Articulates sleeves by composing a swing rotation with the preserved rest transform:
 *   q_local = q_swing · q_rest,  position = p_rest + pivotInParent - q_swing · pivotInParent,  scale = s_rest
 * where q_swing rotates the rest axis onto the observed upper-arm direction, both expressed
 * in the sleeve's parent (garment-local) frame. Rotation is about the physical armhole seam pivot.
 */
export class SleeveRig {
  readonly sleeves: SleeveDescriptor[];
  private smoothed: Map<SleeveDescriptor, THREE.Vector3> = new Map();
  private lastTarget: Map<SleeveDescriptor, THREE.Vector3> = new Map();
  private untrackedS: Map<SleeveDescriptor, number> = new Map();
  /**
   * Exponential smoothing time constant for sleeve direction (s).
   * Default 0.03 s (30 ms) delivers ~90 ms 95% convergence time under arm movement
   * (vs 240 ms with previous 80 ms tau), eliminating perceived articulation lag.
   */
  tauS = 0.03;
  /** Hold duration during brief occlusion / tracking drop before easing to rest. */
  static readonly HOLD_TIMEOUT_S = 0.12;

  private readonly _target = new THREE.Vector3();
  private readonly _swing = new THREE.Quaternion();

  constructor(sleeves: SleeveDescriptor[], tauS = 0.03) {
    this.sleeves = sleeves;
    this.tauS = tauS;
    for (const s of sleeves) {
      this.smoothed.set(s, s.restAxisParent.clone());
      this.lastTarget.set(s, s.restAxisParent.clone());
      this.untrackedS.set(s, 999);
    }
  }

  static fromGarment(root: THREE.Object3D, metadata: GarmentMetadata, rest: Map<THREE.Object3D, RestTransform>): SleeveRig {
    if (!metadata.construction || metadata.construction.sleeves === 'none') return new SleeveRig([]);
    const tau = metadata.fittingProfile?.sleeveSmoothingTauS ?? 0.03;
    const sleeves: SleeveDescriptor[] = [];
    root.updateMatrixWorld(true);
    const rootInv = new THREE.Matrix4().copy(root.matrixWorld).invert();
    root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const side = m.name === 'left_sleeve' ? 'left' : m.name === 'right_sleeve' ? 'right' : null;
      const r = rest.get(m);
      if (!side || !r) return;
      // Orientation of the sleeve's parent relative to the garment root.
      const parentRel = new THREE.Matrix4().multiplyMatrices(rootInv, m.parent ? m.parent.matrixWorld : root.matrixWorld);
      const q = new THREE.Quaternion();
      parentRel.decompose(new THREE.Vector3(), q, new THREE.Vector3());
      sleeves.push(describeSleeve(m, side, r, q));
    });
    return new SleeveRig(sleeves, tau);
  }

  /**
   * @param armDirGarment unit upper-arm directions in garment-root space (null = not tracked,
   *        the sleeve eases back to its rest axis). Converted to each sleeve's parent frame.
   */
  update(armDirGarment: { left: THREE.Vector3 | null; right: THREE.Vector3 | null }, dt: number): void {
    const alpha = 1 - Math.exp(-Math.max(0, dt) / this.tauS);
    for (const s of this.sleeves) {
      const obs = s.side === 'left' ? armDirGarment.left : armDirGarment.right;
      if (obs && Number.isFinite(obs.x) && Number.isFinite(obs.y) && Number.isFinite(obs.z)) {
        this.untrackedS.set(s, 0);
        this._target.copy(obs).applyQuaternion(s.rootToParent);
        clampAbduction(this._target, s.side, s.minAbductionRad, this._target);
        this.lastTarget.get(s)!.copy(this._target);
      } else {
        const elapsed = (this.untrackedS.get(s) ?? 0) + Math.max(0, dt);
        this.untrackedS.set(s, elapsed);
        if (elapsed < SleeveRig.HOLD_TIMEOUT_S) {
          // Briefly preserve the last reliable direction to prevent twitching during brief occlusion
          this._target.copy(this.lastTarget.get(s)!);
        } else {
          // Transition smoothly toward rest pose
          this._target.copy(s.restAxisParent);
        }
      }
      const cur = this.smoothed.get(s)!;
      cur.lerp(this._target, alpha).normalize();

      this._swing.setFromUnitVectors(s.restAxisParent, cur);
      s.node.quaternion.copy(this._swing).multiply(s.rest.quaternion);

      const pivotInParent = s.pivotLocal.clone().multiply(s.rest.scale).applyQuaternion(s.rest.quaternion);
      s.node.position.copy(s.rest.position).add(pivotInParent).sub(pivotInParent.clone().applyQuaternion(this._swing));
      s.node.scale.copy(s.rest.scale);
    }
  }

  /** Restores every sleeve's exact rest transform. */
  resetToRest(): void {
    for (const s of this.sleeves) {
      s.node.position.copy(s.rest.position);
      s.node.quaternion.copy(s.rest.quaternion);
      s.node.scale.copy(s.rest.scale);
      this.smoothed.get(s)!.copy(s.restAxisParent);
      this.lastTarget.get(s)!.copy(s.restAxisParent);
      this.untrackedS.set(s, 999);
    }
  }

  currentAxis(side: 'left' | 'right'): THREE.Vector3 | null {
    const s = this.sleeves.find((x) => x.side === side);
    return s ? this.smoothed.get(s)!.clone() : null;
  }
}

/** Body-local direction → garment-local direction under the wrapper scale S (no rotation). */
export function bodyDirToGarment(dirBody: THREE.Vector3, fitScale: THREE.Vector3, out = new THREE.Vector3()): THREE.Vector3 {
  return out.set(dirBody.x / fitScale.x, dirBody.y / fitScale.y, dirBody.z / fitScale.z).normalize();
}
