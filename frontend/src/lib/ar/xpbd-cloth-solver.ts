/**
 * DRAPE XPBD Cloth Solver
 *
 * Extended Position-Based Dynamics (Macklin et al. 2016):
 *    Δλ = (−C − α̃λ) / (Σ wᵢ|∇Cᵢ|² + α̃),  α̃ = α / h²,   Δxᵢ = wᵢ ∇Cᵢ Δλ
 *
 * COORDINATE CONTRACT
 *   Particles live in SIMULATION SPACE = the local space of the render mesh they were built
 *   from (mesh-local). Nothing else is assumed. Per step the caller supplies:
 *     simToBody  — Matrix4 mapping simulation space → body-proxy local space
 *     gravity    — gravity expressed in simulation space (m/s² in sim units)
 *     frameAccel — acceleration of the simulation frame expressed in simulation space
 *   Collision: x_body = simToBody·x; evaluate the body SDF and outward normal in body space;
 *   the body-space correction Δ_body = n·(tolerance − φ) is mapped back with the inverse
 *   linear part, Δ_sim = L⁻¹·Δ_body (a displacement, so no translation; correct under
 *   non-uniform scale).
 *
 * CONSTRAINTS
 *   stretch   — every mesh edge, XPBD distance, compliance = config.stretchCompliance
 *   bending   — cross-edge distance between the two vertices opposite each interior edge,
 *               compliance = config.bendCompliance
 *   pinned    — anchorWeight ≥ 0.95 particles are kinematic at their skin target
 *   skin      — free particles stay within (1 − w)·skinAttachmentDist of their target
 *   LRA       — tether to the nearest pinned particle, max = rest distance·(1 + LRA_SLACK)
 *   collision — body SDF ≥ collisionTolerance
 *
 * TIME STEPPING
 *   Fixed step FIXED_DT with a bounded accumulator (≤ MAX_STEPS_PER_FRAME); excess time is
 *   dropped instead of spiralling. Each fixed step runs config.substeps XPBD substeps.
 *
 * MASS
 *   Particle mass = fabric areal density × one third of the incident triangle area, so the
 *   compliance values (m/N) have their physical meaning.
 */

import * as THREE from 'three';
import { SimulationConfig } from './types';
import { MHRBodyProxy, SignedDistanceResult } from './mhr-body-proxy';

export const XPBD_TIMESTEP = {
  FIXED_DT: 1 / 60,
  MAX_STEPS_PER_FRAME: 2,
  MAX_FRAME_DT: 0.1,
  MAX_VELOCITY: 5.0, // m/s
  LRA_SLACK: 0.05,
  PIN_THRESHOLD: 0.95,
  MIN_SKIN_RADIUS_M: 0.005,
};

export interface DistanceConstraint {
  p1: number;
  p2: number;
  restLength: number;
  compliance: number;
  lambda: number;
}

export interface XPBDStepContext {
  bodyProxy: MHRBodyProxy;
  simToBody: THREE.Matrix4;
  gravity: THREE.Vector3;
  frameAccel?: THREE.Vector3;
}

export interface XPBDStats {
  fixedStepsLastFrame: number;
  droppedTimeS: number;
  collisionsLastStep: number;
  maxPenetrationM: number;
  stepMs: number;
}

export class XPBDClothSolver {
  private config: SimulationConfig;
  private densityKgM2: number;

  private n = 0;
  private x = new Float32Array(0);
  private xPrev = new Float32Array(0);
  private v = new Float32Array(0);
  private invMass = new Float32Array(0);
  private skin = new Float32Array(0);
  private skinRadius = new Float32Array(0);

  private stretch: DistanceConstraint[] = [];
  private bending: DistanceConstraint[] = [];
  private lra: { particle: number; anchor: number; maxDist: number }[] = [];

  /**
   * Input-vertex → particle map. Coincident input vertices (UV-seam duplicates) are welded
   * into ONE particle; otherwise the two sides of a seam are unconstrained and the tube splits
   * open under dynamics. All public arrays stay indexed by input vertex.
   */
  private vertToParticle = new Int32Array(0);
  private firstVertexOf = new Int32Array(0);
  private expandedX = new Float32Array(0);
  private expandedSkin = new Float32Array(0);
  private gatherScratch = new Float32Array(0);

  private accumulator = 0;
  private readonly bodyToSimLinear = new THREE.Matrix3();
  private readonly sdf: SignedDistanceResult = { distance: 0, normal: new THREE.Vector3() };
  public stats: XPBDStats = { fixedStepsLastFrame: 0, droppedTimeS: 0, collisionsLastStep: 0, maxPenetrationM: 0, stepMs: 0 };

  constructor(config: SimulationConfig, densityGsm = 200) {
    this.config = config;
    this.densityKgM2 = densityGsm / 1000;
  }

  get particleCount(): number {
    return this.n;
  }
  /** Number of input vertices (≥ particleCount; equal when nothing was welded). */
  get vertexCount(): number {
    return this.vertToParticle.length;
  }
  get stretchConstraintCount(): number {
    return this.stretch.length;
  }
  get bendingConstraintCount(): number {
    return this.bending.length;
  }
  get lraConstraintCount(): number {
    return this.lra.length;
  }
  get pinnedCount(): number {
    let c = 0;
    for (let i = 0; i < this.n; i++) if (this.invMass[i] === 0) c++;
    return c;
  }

  initializeMesh(positions: Float32Array, indices: ArrayLike<number>, anchorWeights?: Float32Array): void {
    const nIn = positions.length / 3;
    const keyToParticle = new Map<string, number>();
    const q = (v: number) => Math.round(v * 1e5);
    this.vertToParticle = new Int32Array(nIn);
    const first: number[] = [];
    for (let i = 0; i < nIn; i++) {
      const k = `${q(positions[i * 3])},${q(positions[i * 3 + 1])},${q(positions[i * 3 + 2])}`;
      let p = keyToParticle.get(k);
      if (p === undefined) {
        p = first.length;
        keyToParticle.set(k, p);
        first.push(i);
      }
      this.vertToParticle[i] = p;
    }
    this.firstVertexOf = Int32Array.from(first);
    const nP = first.length;
    const pPos = new Float32Array(nP * 3);
    const pW = new Float32Array(nP);
    for (let i = 0; i < nIn; i++) {
      const p = this.vertToParticle[i];
      pPos[p * 3] = positions[i * 3];
      pPos[p * 3 + 1] = positions[i * 3 + 1];
      pPos[p * 3 + 2] = positions[i * 3 + 2];
      pW[p] = Math.max(pW[p], anchorWeights ? anchorWeights[i] : 0);
    }
    const pIdx: number[] = [];
    for (let t = 0; t < indices.length; t += 3) {
      const a = this.vertToParticle[indices[t]], b = this.vertToParticle[indices[t + 1]], c = this.vertToParticle[indices[t + 2]];
      if (a !== b && b !== c && c !== a) pIdx.push(a, b, c);
    }
    this.expandedX = new Float32Array(nIn * 3);
    this.expandedSkin = new Float32Array(nIn * 3);
    this.gatherScratch = new Float32Array(nP * 3);
    this.initializeParticles(pPos, pIdx, pW);
  }

  /** Gathers an input-vertex-indexed array into particle order (first occurrence). */
  private gather(src: Float32Array, dst: Float32Array): void {
    for (let p = 0; p < this.n; p++) {
      const v = this.firstVertexOf[p] * 3;
      dst[p * 3] = src[v];
      dst[p * 3 + 1] = src[v + 1];
      dst[p * 3 + 2] = src[v + 2];
    }
  }

  private expand(src: Float32Array, dst: Float32Array): Float32Array {
    for (let i = 0; i < this.vertToParticle.length; i++) {
      const p = this.vertToParticle[i] * 3;
      dst[i * 3] = src[p];
      dst[i * 3 + 1] = src[p + 1];
      dst[i * 3 + 2] = src[p + 2];
    }
    return dst;
  }

  private initializeParticles(positions: Float32Array, indices: ArrayLike<number>, anchorWeights?: Float32Array): void {
    const n = positions.length / 3;
    this.n = n;
    this.x = new Float32Array(positions);
    this.xPrev = new Float32Array(positions);
    this.v = new Float32Array(n * 3);
    this.skin = new Float32Array(positions);
    this.skinRadius = new Float32Array(n);
    this.invMass = new Float32Array(n);
    this.accumulator = 0;

    // Lumped mass from triangle areas.
    const mass = new Float64Array(n);
    for (let t = 0; t < indices.length; t += 3) {
      const a = indices[t] * 3, b = indices[t + 1] * 3, c = indices[t + 2] * 3;
      const abx = positions[b] - positions[a], aby = positions[b + 1] - positions[a + 1], abz = positions[b + 2] - positions[a + 2];
      const acx = positions[c] - positions[a], acy = positions[c + 1] - positions[a + 1], acz = positions[c + 2] - positions[a + 2];
      const area = 0.5 * Math.hypot(aby * acz - abz * acy, abz * acx - abx * acz, abx * acy - aby * acx);
      const m = (this.densityKgM2 * area) / 3;
      mass[indices[t]] += m;
      mass[indices[t + 1]] += m;
      mass[indices[t + 2]] += m;
    }

    const pinned: number[] = [];
    for (let i = 0; i < n; i++) {
      const w = anchorWeights ? anchorWeights[i] : 0;
      if (w >= XPBD_TIMESTEP.PIN_THRESHOLD || mass[i] <= 0) {
        this.invMass[i] = 0;
        if (w >= XPBD_TIMESTEP.PIN_THRESHOLD) pinned.push(i);
      } else {
        this.invMass[i] = 1 / mass[i];
      }
      this.skinRadius[i] = Math.max(XPBD_TIMESTEP.MIN_SKIN_RADIUS_M, (1 - w) * this.config.skinAttachmentDist);
    }

    // Stretch: unique edges. Bending: opposite vertices across each shared edge.
    const edgeOpp = new Map<number, number[]>();
    const key = (a: number, b: number) => (a < b ? a * n + b : b * n + a);
    for (let t = 0; t < indices.length; t += 3) {
      const tri = [indices[t], indices[t + 1], indices[t + 2]];
      for (let e = 0; e < 3; e++) {
        const a = tri[e], b = tri[(e + 1) % 3], opp = tri[(e + 2) % 3];
        const k = key(a, b);
        const list = edgeOpp.get(k);
        if (list) list.push(opp);
        else edgeOpp.set(k, [opp]);
      }
    }
    const dist = (a: number, b: number) =>
      Math.hypot(positions[a * 3] - positions[b * 3], positions[a * 3 + 1] - positions[b * 3 + 1], positions[a * 3 + 2] - positions[b * 3 + 2]);

    this.stretch = [];
    this.bending = [];
    edgeOpp.forEach((opps, k) => {
      const a = Math.floor(k / n), b = k % n;
      this.stretch.push({ p1: a, p2: b, restLength: dist(a, b), compliance: this.config.stretchCompliance, lambda: 0 });
      if (opps.length === 2 && opps[0] !== opps[1]) {
        this.bending.push({ p1: opps[0], p2: opps[1], restLength: dist(opps[0], opps[1]), compliance: this.config.bendCompliance, lambda: 0 });
      }
    });

    // Long-range attachments to the nearest pinned particle.
    this.lra = [];
    if (pinned.length > 0) {
      for (let i = 0; i < n; i++) {
        if (this.invMass[i] === 0) continue;
        let best = -1;
        let bestD = Infinity;
        for (const p of pinned) {
          const d = dist(i, p);
          if (d < bestD) { bestD = d; best = p; }
        }
        this.lra.push({ particle: i, anchor: best, maxDist: bestD * (1 + XPBD_TIMESTEP.LRA_SLACK) });
      }
    }
  }

  /** Sets the kinematic target shape (e.g. the deformed rest pose), in simulation space. */
  updateSkinPositions(skinned: Float32Array): void {
    if (skinned.length !== this.expandedSkin.length) return;
    this.gather(skinned, this.skin);
  }

  /**
   * Re-derives stretch / bending rest lengths and LRA limits from `positions`. Used when the
   * garment's fitted shape changes: the fit (correspondence push-out) defines the cloth's rest
   * state, and dynamics are secondary motion about it. Without this the solver would fight
   * the fit permanently (fitted lengths ≠ asset lengths).
   */
  setRestShape(input: Float32Array): void {
    if (input.length !== this.expandedX.length) return;
    const positions = this.gatherScratch;
    this.gather(input, positions);
    const d = (a: number, b: number) =>
      Math.hypot(positions[a * 3] - positions[b * 3], positions[a * 3 + 1] - positions[b * 3 + 1], positions[a * 3 + 2] - positions[b * 3 + 2]);
    for (const c of this.stretch) c.restLength = d(c.p1, c.p2);
    for (const c of this.bending) c.restLength = d(c.p1, c.p2);
    for (const t of this.lra) t.maxDist = d(t.particle, t.anchor) * (1 + XPBD_TIMESTEP.LRA_SLACK);
  }

  /** Snaps particles to the skin targets and zeroes velocities (garment switch / tracking regain). */
  reset(): void {
    this.x.set(this.skin);
    this.xPrev.set(this.skin);
    this.v.fill(0);
    this.accumulator = 0;
  }

  /** Simulated positions indexed by INPUT vertex (welded duplicates share a value). */
  getSimulatedPositions(): Float32Array | null {
    return this.n > 0 ? this.expand(this.x, this.expandedX) : null;
  }
  /** Skin targets indexed by INPUT vertex. */
  getSkinPositions(): Float32Array {
    return this.expand(this.skin, this.expandedSkin);
  }

  /**
   * Advances by a variable frame time using fixed internal steps. Returns the number of fixed
   * steps taken.
   */
  step(frameDt: number, ctx: XPBDStepContext): number {
    if (this.n === 0 || !this.config.enabled) return 0;
    const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const dt = Math.min(Math.max(frameDt, 0), XPBD_TIMESTEP.MAX_FRAME_DT);
    this.accumulator += dt;

    // Body→sim inverse linear part for mapping body-space corrections.
    this.bodyToSimLinear.setFromMatrix4(ctx.simToBody).invert();

    let steps = 0;
    while (this.accumulator >= XPBD_TIMESTEP.FIXED_DT && steps < XPBD_TIMESTEP.MAX_STEPS_PER_FRAME) {
      this.fixedStep(XPBD_TIMESTEP.FIXED_DT, ctx);
      this.accumulator -= XPBD_TIMESTEP.FIXED_DT;
      steps++;
    }
    this.stats.droppedTimeS = 0;
    if (this.accumulator >= XPBD_TIMESTEP.FIXED_DT) {
      this.stats.droppedTimeS = this.accumulator;
      this.accumulator = 0;
    }
    this.stats.fixedStepsLastFrame = steps;
    this.stats.stepMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0;
    return steps;
  }

  private fixedStep(h: number, ctx: XPBDStepContext): void {
    const substeps = Math.max(1, this.config.substeps || 4);
    const iterations = Math.max(1, this.config.iterations || 4);
    const sh = h / substeps;
    const gx = ctx.gravity.x - (this.config.inertialCoupling ?? 0) * (ctx.frameAccel?.x ?? 0);
    const gy = ctx.gravity.y - (this.config.inertialCoupling ?? 0) * (ctx.frameAccel?.y ?? 0);
    const gz = ctx.gravity.z - (this.config.inertialCoupling ?? 0) * (ctx.frameAccel?.z ?? 0);
    // config.damping = fraction of velocity lost per 1/60 s.
    const damp = Math.pow(1 - Math.min(0.99, Math.max(0, this.config.damping)), sh * 60);
    const { x, xPrev, v, invMass, skin } = this;
    const n = this.n;

    for (let s = 0; s < substeps; s++) {
      for (let i = 0; i < n; i++) {
        const i3 = i * 3;
        if (invMass[i] === 0) {
          x[i3] = skin[i3]; x[i3 + 1] = skin[i3 + 1]; x[i3 + 2] = skin[i3 + 2];
          xPrev[i3] = x[i3]; xPrev[i3 + 1] = x[i3 + 1]; xPrev[i3 + 2] = x[i3 + 2];
          continue;
        }
        xPrev[i3] = x[i3]; xPrev[i3 + 1] = x[i3 + 1]; xPrev[i3 + 2] = x[i3 + 2];
        let vx = (v[i3] + gx * sh) * damp;
        let vy = (v[i3 + 1] + gy * sh) * damp;
        let vz = (v[i3 + 2] + gz * sh) * damp;
        const vl = Math.hypot(vx, vy, vz);
        if (vl > XPBD_TIMESTEP.MAX_VELOCITY) {
          const k = XPBD_TIMESTEP.MAX_VELOCITY / vl;
          vx *= k; vy *= k; vz *= k;
        }
        x[i3] += vx * sh; x[i3 + 1] += vy * sh; x[i3 + 2] += vz * sh;
      }

      for (const c of this.stretch) c.lambda = 0;
      for (const c of this.bending) c.lambda = 0;
      const shSq = sh * sh;
      for (let it = 0; it < iterations; it++) {
        this.solveDistance(this.stretch, shSq);
        this.solveDistance(this.bending, shSq);
        this.solveLRA();
        this.solveSkin();
      }
      // Collision last so the final positions are non-penetrating.
      this.solveCollisions(ctx);

      for (let i = 0; i < n; i++) {
        if (invMass[i] === 0) { v[i * 3] = 0; v[i * 3 + 1] = 0; v[i * 3 + 2] = 0; continue; }
        const i3 = i * 3;
        v[i3] = (x[i3] - xPrev[i3]) / sh;
        v[i3 + 1] = (x[i3 + 1] - xPrev[i3 + 1]) / sh;
        v[i3 + 2] = (x[i3 + 2] - xPrev[i3 + 2]) / sh;
      }
    }
  }

  private solveDistance(constraints: DistanceConstraint[], shSq: number): void {
    const { x, invMass } = this;
    for (const c of constraints) {
      const w1 = invMass[c.p1], w2 = invMass[c.p2];
      const wSum = w1 + w2;
      if (wSum === 0) continue;
      const a = c.p1 * 3, b = c.p2 * 3;
      const dx = x[a] - x[b], dy = x[a + 1] - x[b + 1], dz = x[a + 2] - x[b + 2];
      const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (len < 1e-9) continue;
      const C = len - c.restLength;
      const alphaT = c.compliance / shSq;
      const dLambda = (-C - alphaT * c.lambda) / (wSum + alphaT);
      c.lambda += dLambda;
      const s = dLambda / len;
      x[a] += dx * s * w1; x[a + 1] += dy * s * w1; x[a + 2] += dz * s * w1;
      x[b] -= dx * s * w2; x[b + 1] -= dy * s * w2; x[b + 2] -= dz * s * w2;
    }
  }

  private solveLRA(): void {
    const { x } = this;
    const stiffness = Math.min(1, Math.max(0, this.config.lraStiffness ?? 1));
    for (const t of this.lra) {
      const p = t.particle * 3, a = t.anchor * 3;
      const dx = x[p] - x[a], dy = x[p + 1] - x[a + 1], dz = x[p + 2] - x[a + 2];
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (d > t.maxDist) {
        const k = (stiffness * (d - t.maxDist)) / d;
        x[p] -= dx * k; x[p + 1] -= dy * k; x[p + 2] -= dz * k;
      }
    }
  }

  private solveSkin(): void {
    const { x, skin, skinRadius, invMass } = this;
    for (let i = 0; i < this.n; i++) {
      if (invMass[i] === 0) continue;
      const i3 = i * 3;
      const dx = x[i3] - skin[i3], dy = x[i3 + 1] - skin[i3 + 1], dz = x[i3 + 2] - skin[i3 + 2];
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const r = skinRadius[i];
      if (d > r) {
        const k = r / d;
        x[i3] = skin[i3] + dx * k; x[i3 + 1] = skin[i3 + 1] + dy * k; x[i3 + 2] = skin[i3 + 2] + dz * k;
      }
    }
  }

  private solveCollisions(ctx: XPBDStepContext): void {
    const { x, invMass } = this;
    const e = ctx.simToBody.elements;
    const L = this.bodyToSimLinear.elements;
    const tol = this.config.collisionTolerance || 0.01;
    let collisions = 0;
    let maxPen = 0;
    for (let i = 0; i < this.n; i++) {
      if (invMass[i] === 0) continue;
      const i3 = i * 3;
      const sx = x[i3], sy = x[i3 + 1], sz = x[i3 + 2];
      const bx = e[0] * sx + e[4] * sy + e[8] * sz + e[12];
      const by = e[1] * sx + e[5] * sy + e[9] * sz + e[13];
      const bz = e[2] * sx + e[6] * sy + e[10] * sz + e[14];
      const r = ctx.bodyProxy.signedDistance(bx, by, bz, this.sdf);
      const pen = tol - r.distance;
      if (pen > 0 && Number.isFinite(pen)) {
        collisions++;
        if (pen > maxPen) maxPen = pen;
        const dbx = r.normal.x * pen, dby = r.normal.y * pen, dbz = r.normal.z * pen;
        x[i3] += L[0] * dbx + L[3] * dby + L[6] * dbz;
        x[i3 + 1] += L[1] * dbx + L[4] * dby + L[7] * dbz;
        x[i3 + 2] += L[2] * dbx + L[5] * dby + L[8] * dbz;
      }
    }
    this.stats.collisionsLastStep = collisions;
    this.stats.maxPenetrationM = maxPen;
  }

  /**
   * Max |C|/rest over stretch constraints (diagnostic of solver convergence). Edges shorter
   * than 3 mm (collar-dip slivers in the assets) are excluded from the metric only — they are
   * still constrained — because millimetre jitter dominates their relative strain.
   */
  maxStretchStrain(): number {
    let m = 0;
    for (const c of this.stretch) {
      if (c.restLength < 0.003) continue;
      const a = c.p1 * 3, b = c.p2 * 3;
      const len = Math.hypot(this.x[a] - this.x[b], this.x[a + 1] - this.x[b + 1], this.x[a + 2] - this.x[b + 2]);
      m = Math.max(m, Math.abs(len - c.restLength) / c.restLength);
    }
    return m;
  }
}
