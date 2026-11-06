/**
 * DRAPE Robust PnP — body-root pose from 2D landmarks.
 *
 * Solves for the rigid transform (R, t) mapping BODY-LOCAL model points Xᵢ (mhr-body-proxy.ts)
 * into Three.js camera space (camera at origin, +X right, +Y up, looking down −Z), minimising
 *
 *   Σᵢ ρ_Huber(‖π(R Xᵢ + t) − uᵢ‖ / σ_px)              reprojection, unmirrored image pixels
 *   + ‖log(R R_prior⁻¹)‖² / σ_rot²                      rotation prior (world landmarks)
 *   + (d − d_prior)² / σ_d²                              depth prior (distance estimator)
 *   + ‖t − t_prev‖² / σ_t² + ‖log(R R_prev⁻¹)‖² / σ_rt²  weak temporal prior
 *
 * with π(P) = (fx·X/d + cx, −fy·Y/d + cy), d = −Z. Optimisation is Levenberg–Marquardt on a
 * 6-vector (ω, δt), R ← exp(ω)·R, with iteratively-reweighted Huber weights.
 *
 * LIMITATIONS (stated, not hidden): with only the four torso landmarks the model is nearly
 * planar, so out-of-plane rotation is weakly observable from 2D alone; it is dominated by the
 * world-landmark rotation prior. Depth is fixed by the model's metric size, which rests on the
 * same shoulder-breadth assumption as the distance estimator (see distance-estimator.ts).
 */

import * as THREE from 'three';
import { CameraIntrinsics, LandmarkPoint } from './types';
import { worldLandmarkToCameraAxes } from './coordinates';

export interface PnPCorrespondence {
  name: string;
  model: THREE.Vector3; // body-local metres
  image: { x: number; y: number }; // unmirrored image pixels
  weight: number; // landmark confidence in [0,1]
}

export interface PnPPriors {
  rotation?: { q: THREE.Quaternion; sigmaRad: number };
  depth?: { distanceM: number; sigmaM: number };
}

export interface PnPResult {
  valid: boolean;
  reason?: string;
  rootPosition: [number, number, number];
  rootRotation: [number, number, number, number];
  /** RMS reprojection error over the used points (pixels, unweighted). */
  reprojectionError: number;
  perPointErrorPx: Record<string, number>;
  iterations: number;
  usedPoints: number;
}

export const PNP_CONFIG = {
  HUBER_DELTA_PX: 8,
  PIXEL_SIGMA: 3,
  MIN_WEIGHT: 0.5,
  MAX_ITERATIONS: 10,
  TEMPORAL_SIGMA_POS_M: 0.08,
  TEMPORAL_SIGMA_ROT_RAD: 0.35,
};

/** Axis-angle vector of q (shortest arc). */
export function quatLog(q: THREE.Quaternion, out = new THREE.Vector3()): THREE.Vector3 {
  let { x, y, z, w } = q;
  if (w < 0) { x = -x; y = -y; z = -z; w = -w; }
  const s = Math.sqrt(x * x + y * y + z * z);
  if (s < 1e-9) return out.set(2 * x, 2 * y, 2 * z);
  const angle = 2 * Math.atan2(s, w);
  return out.set((x / s) * angle, (y / s) * angle, (z / s) * angle);
}

export function quatExp(v: THREE.Vector3, out = new THREE.Quaternion()): THREE.Quaternion {
  const angle = v.length();
  if (angle < 1e-12) return out.set(v.x / 2, v.y / 2, v.z / 2, 1).normalize();
  return out.setFromAxisAngle(new THREE.Vector3(v.x / angle, v.y / angle, v.z / angle), angle);
}

/**
 * Torso orientation from MediaPipe world landmarks (hip-centred metres, image-aligned axes).
 * Body +X = wearer's left (left shoulder − right shoulder), +Y = hips→shoulders, +Z = X × Y
 * (out of the chest). Returns null for degenerate input.
 */
export function torsoRotationFromWorld(world: LandmarkPoint[]): THREE.Quaternion | null {
  const ls = world[11], rs = world[12], lh = world[23], rh = world[24];
  if (!ls || !rs || !lh || !rh) return null;
  const x = worldLandmarkToCameraAxes({ x: ls.x - rs.x, y: ls.y - rs.y, z: ls.z - rs.z });
  const up = worldLandmarkToCameraAxes({
    x: (ls.x + rs.x - lh.x - rh.x) / 2,
    y: (ls.y + rs.y - lh.y - rh.y) / 2,
    z: (ls.z + rs.z - lh.z - rh.z) / 2,
  });
  if (x.lengthSq() < 1e-6 || up.lengthSq() < 1e-6) return null;
  x.normalize();
  const z = new THREE.Vector3().crossVectors(x, up);
  if (z.lengthSq() < 1e-6) return null;
  z.normalize();
  const y = new THREE.Vector3().crossVectors(z, x).normalize();
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
}

/** In-plane (roll-only) orientation from 2D shoulder pixels, used without world landmarks. */
export function torsoRotationFromImage(leftShoulderPx: { x: number; y: number }, rightShoulderPx: { x: number; y: number }): THREE.Quaternion {
  const x = new THREE.Vector3(leftShoulderPx.x - rightShoulderPx.x, -(leftShoulderPx.y - rightShoulderPx.y), 0);
  if (x.lengthSq() < 1e-9) return new THREE.Quaternion();
  x.normalize();
  const z = new THREE.Vector3(0, 0, 1);
  const y = new THREE.Vector3().crossVectors(z, x).normalize();
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
}

/** Solves A x = b (n×n, row-major arrays) with partial pivoting; returns null if singular. */
function solveLinear(A: number[][], b: number[]): number[] | null {
  const n = b.length;
  const M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-12) return null;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = c + 1; r < n; r++) {
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  const x = new Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let s = M[r][n];
    for (let k = r + 1; k < n; k++) s -= M[r][k] * x[k];
    x[r] = s / M[r][r];
  }
  return x;
}

export class RobustPnPSolver {
  private prevRotation = new THREE.Quaternion();
  private prevPosition = new THREE.Vector3(0, 0, -1.6);
  private hasPrevious = false;

  private readonly _P = new THREE.Vector3();
  private readonly _q = new THREE.Quaternion();
  private readonly _v = new THREE.Vector3();
  private readonly priorRotInv = new THREE.Quaternion();
  private readonly prevRotInv = new THREE.Quaternion();

  reset(): void {
    this.hasPrevious = false;
  }

  private project(K: Pick<CameraIntrinsics, 'fx' | 'fy' | 'cx' | 'cy'>, P: THREE.Vector3): [number, number] | null {
    const d = -P.z;
    if (d < 0.05) return null;
    return [(K.fx * P.x) / d + K.cx, (-K.fy * P.y) / d + K.cy];
  }

  /** Residual vector for pose (R, t). `huber` are per-point IRLS weights. */
  private residuals(
    R: THREE.Quaternion,
    t: THREE.Vector3,
    pts: PnPCorrespondence[],
    huber: number[],
    K: CameraIntrinsics,
    priors: PnPPriors
  ): number[] {
    const r: number[] = [];
    const sig = PNP_CONFIG.PIXEL_SIGMA;
    for (let i = 0; i < pts.length; i++) {
      this._P.copy(pts[i].model).applyQuaternion(R).add(t);
      const uv = this.project(K, this._P);
      const s = Math.sqrt(pts[i].weight * huber[i]) / sig;
      if (!uv) {
        r.push(1e3, 1e3);
      } else {
        r.push((uv[0] - pts[i].image.x) * s, (uv[1] - pts[i].image.y) * s);
      }
    }
    if (priors.rotation) {
      this._q.copy(R).multiply(this.priorRotInv);
      const w = quatLog(this._q, this._v).divideScalar(priors.rotation.sigmaRad);
      r.push(w.x, w.y, w.z);
    }
    if (priors.depth) {
      r.push((-t.z - priors.depth.distanceM) / priors.depth.sigmaM);
    }
    if (this.hasPrevious) {
      const dt = this._v.copy(t).sub(this.prevPosition).divideScalar(PNP_CONFIG.TEMPORAL_SIGMA_POS_M);
      r.push(dt.x, dt.y, dt.z);
      this._q.copy(R).multiply(this.prevRotInv);
      const w = quatLog(this._q, this._v).divideScalar(PNP_CONFIG.TEMPORAL_SIGMA_ROT_RAD);
      r.push(w.x, w.y, w.z);
    }
    return r;
  }

  solve(
    points: PnPCorrespondence[],
    K: CameraIntrinsics,
    priors: PnPPriors,
    initial?: { rotation: THREE.Quaternion; position: THREE.Vector3 }
  ): PnPResult {
    const pts = points.filter((p) => p.weight >= PNP_CONFIG.MIN_WEIGHT && Number.isFinite(p.image.x) && Number.isFinite(p.image.y));
    const invalid = (reason: string): PnPResult => ({
      valid: false,
      reason,
      rootPosition: [this.prevPosition.x, this.prevPosition.y, this.prevPosition.z],
      rootRotation: [this.prevRotation.x, this.prevRotation.y, this.prevRotation.z, this.prevRotation.w],
      reprojectionError: NaN,
      perPointErrorPx: {},
      iterations: 0,
      usedPoints: pts.length,
    });
    // Two shoulders are the minimum: with rotation + depth priors the pose is then determined.
    if (pts.length < 2) return invalid('insufficient_landmarks');
    const ls = pts.find((p) => p.name === 'left_shoulder');
    const rs = pts.find((p) => p.name === 'right_shoulder');
    if (!ls || !rs || Math.hypot(ls.image.x - rs.image.x, ls.image.y - rs.image.y) < 12) {
      return invalid('degenerate_shoulders');
    }

    // Initial guess: previous pose if available, else back-project the landmark centroid.
    const R = new THREE.Quaternion();
    const t = new THREE.Vector3();
    if (initial) {
      R.copy(initial.rotation);
      t.copy(initial.position);
    } else if (this.hasPrevious) {
      R.copy(this.prevRotation);
      t.copy(this.prevPosition);
    } else {
      R.copy(priors.rotation?.q ?? torsoRotationFromImage(ls.image, rs.image));
      const d = priors.depth?.distanceM ?? 1.6;
      let cu = 0, cv = 0;
      const mc = new THREE.Vector3();
      for (const p of pts) { cu += p.image.x; cv += p.image.y; mc.add(p.model); }
      cu /= pts.length; cv /= pts.length; mc.divideScalar(pts.length).applyQuaternion(R);
      t.set(((cu - K.cx) * d) / K.fx - mc.x, (-(cv - K.cy) * d) / K.fy - mc.y, -d - mc.z);
    }

    if (priors.rotation) this.priorRotInv.copy(priors.rotation.q).invert();
    this.prevRotInv.copy(this.prevRotation).invert();

    const huber = pts.map(() => 1);
    let mu = 1e-3;
    let iterations = 0;
    const eps = 1e-5;
    const Rt = new THREE.Quaternion();
    const tt = new THREE.Vector3();
    const omega = new THREE.Vector3();

    const updateHuber = () => {
      for (let i = 0; i < pts.length; i++) {
        this._P.copy(pts[i].model).applyQuaternion(R).add(t);
        const uv = this.project(K, this._P);
        const e = uv ? Math.hypot(uv[0] - pts[i].image.x, uv[1] - pts[i].image.y) : 1e3;
        huber[i] = e <= PNP_CONFIG.HUBER_DELTA_PX ? 1 : PNP_CONFIG.HUBER_DELTA_PX / e;
      }
    };
    const cost = (r: number[]) => r.reduce((s, v) => s + v * v, 0);
    const apply = (delta: number[], qOut: THREE.Quaternion, tOut: THREE.Vector3) => {
      quatExp(omega.set(delta[0], delta[1], delta[2]), qOut).multiply(R).normalize();
      tOut.set(t.x + delta[3], t.y + delta[4], t.z + delta[5]);
    };

    for (let it = 0; it < PNP_CONFIG.MAX_ITERATIONS; it++) {
      iterations++;
      updateHuber();
      const r0 = this.residuals(R, t, pts, huber, K, priors);
      const c0 = cost(r0);
      // Numerical Jacobian (m × 6).
      const J: number[][] = r0.map(() => new Array(6).fill(0));
      for (let k = 0; k < 6; k++) {
        const delta = [0, 0, 0, 0, 0, 0];
        delta[k] = eps;
        apply(delta, Rt, tt);
        const rk = this.residuals(Rt, tt, pts, huber, K, priors);
        for (let i = 0; i < r0.length; i++) J[i][k] = (rk[i] - r0[i]) / eps;
      }
      const JtJ: number[][] = Array.from({ length: 6 }, () => new Array(6).fill(0));
      const Jtr = new Array(6).fill(0);
      for (let i = 0; i < r0.length; i++) {
        for (let a = 0; a < 6; a++) {
          Jtr[a] += J[i][a] * r0[i];
          for (let b = 0; b < 6; b++) JtJ[a][b] += J[i][a] * J[i][b];
        }
      }
      let improved = false;
      for (let attempt = 0; attempt < 6; attempt++) {
        const A = JtJ.map((row, a) => row.map((v, b) => (a === b ? v * (1 + mu) + 1e-9 : v)));
        const delta = solveLinear(A, Jtr.map((v) => -v));
        if (!delta) { mu *= 10; continue; }
        apply(delta, Rt, tt);
        const c1 = cost(this.residuals(Rt, tt, pts, huber, K, priors));
        if (c1 < c0) {
          R.copy(Rt);
          t.copy(tt);
          mu = Math.max(1e-7, mu * 0.3);
          improved = true;
          if (Math.max(...delta.map(Math.abs)) < 1e-6) it = PNP_CONFIG.MAX_ITERATIONS;
          break;
        }
        mu *= 10;
      }
      if (!improved) break;
    }

    // Unweighted reprojection statistics.
    const perPoint: Record<string, number> = {};
    let sq = 0;
    for (const p of pts) {
      this._P.copy(p.model).applyQuaternion(R).add(t);
      const uv = this.project(K, this._P);
      const e = uv ? Math.hypot(uv[0] - p.image.x, uv[1] - p.image.y) : NaN;
      perPoint[p.name] = e;
      sq += e * e;
    }
    const rms = Math.sqrt(sq / pts.length);
    if (!Number.isFinite(rms) || -t.z < 0.1) return invalid('solver_diverged');

    this.prevRotation.copy(R);
    this.prevPosition.copy(t);
    this.hasPrevious = true;

    return {
      valid: true,
      rootPosition: [t.x, t.y, t.z],
      rootRotation: [R.x, R.y, R.z, R.w],
      reprojectionError: rms,
      perPointErrorPx: perPoint,
      iterations,
      usedPoints: pts.length,
    };
  }
}
