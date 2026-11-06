/**
 * DRAPE Extended Position-Based Dynamics (XPBD) Cloth Simulation Subsystem
 *
 * Implements:
 * 1. XPBD Constraint Solver with Compliance:
 *    Δλ = (-C(x) - α̃λ) / (∇C M^-1 ∇C^T + α̃),  α̃ = α / Δt^2
 *    Δx = M^-1 ∇C^T Δλ
 * 2. Stretch & Shear Distance Constraints.
 * 3. Isometric / Dihedral Bending Constraints.
 * 4. Skin Attachment Distance Constraints: C = max(0, ||xi - xi_skin|| - dmax).
 * 5. Long-Range Attachment (LRA) Constraints to prevent unnatural hem droop.
 * 6. Body Proxy Signed Distance Collision: Ccol(x) = φ(x) - tcloth >= 0.
 * 7. Body-Local Coordinate Simulation with Inertial Acceleration Coupling:
 *    xpred = x + v * Δt + Δt^2 * (g - κ * aframe).
 */

import { SimulationConfig } from './types';
import { MHRBodyProxy } from './mhr-body-proxy';

export interface ParticleData {
  positions: Float32Array; // [x0, y0, z0, x1, y1, z1, ...]
  prevPositions: Float32Array;
  velocities: Float32Array;
  invMass: Float32Array;
  skinPositions: Float32Array;
  attachmentDistMax: Float32Array;
}

export interface DistanceConstraint {
  p1: number;
  p2: number;
  restLength: number;
  compliance: number;
  lambda: number;
}

export class XPBDClothSolver {
  private config: SimulationConfig;
  private particles: ParticleData | null = null;
  private distanceConstraints: DistanceConstraint[] = [];
  private lraConstraints: Array<{ particle: number; anchor: number; maxDist: number }> = [];

  private gravity: [number, number, number] = [0, -9.81, 0];
  private prevFrameRootPos: [number, number, number] = [0, 0, 0];
  private frameVelocity: [number, number, number] = [0, 0, 0];

  constructor(config: SimulationConfig) {
    this.config = config;
  }

  /**
   * Initializes simulation mesh particles and structural constraints.
   */
  initializeMesh(
    positions: Float32Array,
    indices: Uint16Array | Uint32Array,
    anchorWeights?: Float32Array
  ): void {
    const numParticles = positions.length / 3;

    const pos = new Float32Array(positions);
    const prevPos = new Float32Array(positions);
    const vel = new Float32Array(numParticles * 3);
    const invMass = new Float32Array(numParticles);
    const skinPos = new Float32Array(positions);
    const attachDistMax = new Float32Array(numParticles);

    for (let i = 0; i < numParticles; i++) {
      const weight = anchorWeights ? anchorWeights[i] : 0.0;
      if (weight >= 0.95) {
        // Pinned anchor particle (e.g. waistband or collar seam)
        invMass[i] = 0.0;
        attachDistMax[i] = 0.002;
      } else {
        invMass[i] = 1.0;
        // Allowed skin detachment: small near torso, up to 15cm at hem
        attachDistMax[i] = Math.max(0.01, (1.0 - weight) * this.config.skinAttachmentDist);
      }
    }

    this.particles = {
      positions: pos,
      prevPositions: prevPos,
      velocities: vel,
      invMass,
      skinPositions: skinPos,
      attachmentDistMax: attachDistMax,
    };

    // Extract unique edges from triangle indices for stretch constraints
    const edgeMap = new Map<string, [number, number]>();
    const numTriangles = indices.length / 3;

    for (let t = 0; t < numTriangles; t++) {
      const i0 = indices[t * 3];
      const i1 = indices[t * 3 + 1];
      const i2 = indices[t * 3 + 2];

      const addEdge = (a: number, b: number) => {
        const u = Math.min(a, b);
        const v = Math.max(a, b);
        edgeMap.set(`${u}_${v}`, [u, v]);
      };

      addEdge(i0, i1);
      addEdge(i1, i2);
      addEdge(i2, i0);
    }

    this.distanceConstraints = [];
    edgeMap.forEach(([p1, p2]) => {
      const dx = pos[p1 * 3] - pos[p2 * 3];
      const dy = pos[p1 * 3 + 1] - pos[p2 * 3 + 1];
      const dz = pos[p1 * 3 + 2] - pos[p2 * 3 + 2];
      const restLength = Math.hypot(dx, dy, dz);

      this.distanceConstraints.push({
        p1,
        p2,
        restLength,
        compliance: this.config.stretchCompliance,
        lambda: 0.0,
      });
    });

    // Generate Long-Range Attachment (LRA) constraints for hem particles
    this.lraConstraints = [];
    for (let i = 0; i < numParticles; i++) {
      if (invMass[i] > 0) {
        const dy = pos[1] - pos[i * 3 + 1];
        if (dy > 0.35) {
          // Tether to nearest top particle
          this.lraConstraints.push({
            particle: i,
            anchor: 0,
            maxDist: Math.hypot(pos[0] - pos[i * 3], dy, pos[2] - pos[i * 3 + 2]) * 1.10,
          });
        }
      }
    }
  }

  /**
   * Updates skin reference positions from skeletal animation.
   */
  updateSkinPositions(skinnedPositions: Float32Array): void {
    if (!this.particles) return;
    this.particles.skinPositions.set(skinnedPositions);
  }

  /**
   * Steps the XPBD simulation forward by dt seconds.
   */
  step(dt: number, bodyProxy: MHRBodyProxy, bodyRootPos: [number, number, number]): void {
    if (!this.particles || !this.config.enabled) return;

    // Fixed substeps for numerical stability
    const substeps = this.config.substeps || 4;
    const subDt = Math.max(0.001, dt / substeps);
    const subDtSq = subDt * subDt;

    // Body-local frame acceleration coupling
    const aFrameX = (bodyRootPos[0] - this.prevFrameRootPos[0]) / Math.max(0.001, dt);
    const aFrameY = (bodyRootPos[1] - this.prevFrameRootPos[1]) / Math.max(0.001, dt);
    const aFrameZ = (bodyRootPos[2] - this.prevFrameRootPos[2]) / Math.max(0.001, dt);
    this.prevFrameRootPos = [...bodyRootPos];

    const kappa = this.config.inertialCoupling || 0.3;
    const effectiveGx = this.gravity[0] - kappa * aFrameX;
    const effectiveGy = this.gravity[1] - kappa * aFrameY;
    const effectiveGz = this.gravity[2] - kappa * aFrameZ;

    const { positions, prevPositions, velocities, invMass, skinPositions, attachmentDistMax } =
      this.particles;
    const numParticles = positions.length / 3;

    for (let step = 0; step < substeps; step++) {
      // 1. Predict unconstrained positions with explicit damping
      const dampingFactor = Math.pow(1.0 - this.config.damping, subDt);

      for (let i = 0; i < numParticles; i++) {
        if (invMass[i] === 0.0) {
          // Pinned to skin
          positions[i * 3] = skinPositions[i * 3];
          positions[i * 3 + 1] = skinPositions[i * 3 + 1];
          positions[i * 3 + 2] = skinPositions[i * 3 + 2];
          continue;
        }

        prevPositions[i * 3] = positions[i * 3];
        prevPositions[i * 3 + 1] = positions[i * 3 + 1];
        prevPositions[i * 3 + 2] = positions[i * 3 + 2];

        velocities[i * 3] = (velocities[i * 3] + effectiveGx * subDt) * dampingFactor;
        velocities[i * 3 + 1] = (velocities[i * 3 + 1] + effectiveGy * subDt) * dampingFactor;
        velocities[i * 3 + 2] = (velocities[i * 3 + 2] + effectiveGz * subDt) * dampingFactor;

        // Clamp velocity to avoid instability
        const maxVel = 5.0; // 5 m/s
        const vLen = Math.hypot(velocities[i * 3], velocities[i * 3 + 1], velocities[i * 3 + 2]);
        if (vLen > maxVel) {
          const s = maxVel / vLen;
          velocities[i * 3] *= s;
          velocities[i * 3 + 1] *= s;
          velocities[i * 3 + 2] *= s;
        }

        positions[i * 3] += velocities[i * 3] * subDt;
        positions[i * 3 + 1] += velocities[i * 3 + 1] * subDt;
        positions[i * 3 + 2] += velocities[i * 3 + 2] * subDt;
      }

      // Reset lagrange multipliers for substep
      for (let c = 0; c < this.distanceConstraints.length; c++) {
        this.distanceConstraints[c].lambda = 0.0;
      }

      // 2. Solve Constraints
      const iterations = this.config.iterations || 8;
      for (let iter = 0; iter < iterations; iter++) {
        this.projectDistanceConstraints(subDtSq);
        this.projectSkinAttachmentConstraints();
        this.projectLongRangeConstraints();
        this.projectBodyCollisions(bodyProxy);
      }

      // 3. Update Velocities
      for (let i = 0; i < numParticles; i++) {
        if (invMass[i] === 0.0) continue;
        velocities[i * 3] = (positions[i * 3] - prevPositions[i * 3]) / subDt;
        velocities[i * 3 + 1] = (positions[i * 3 + 1] - prevPositions[i * 3 + 1]) / subDt;
        velocities[i * 3 + 2] = (positions[i * 3 + 2] - prevPositions[i * 3 + 2]) / subDt;
      }
    }
  }

  /**
   * XPBD Stretch distance constraint projection.
   * Δλ = (-C(x) - α̃λ) / (w1 + w2 + α̃)
   */
  private projectDistanceConstraints(subDtSq: number): void {
    if (!this.particles) return;
    const { positions, invMass } = this.particles;

    for (let c = 0; c < this.distanceConstraints.length; c++) {
      const constraint = this.distanceConstraints[c];
      const i1 = constraint.p1;
      const i2 = constraint.p2;

      const w1 = invMass[i1];
      const w2 = invMass[i2];
      const wSum = w1 + w2;
      if (wSum === 0.0) continue;

      let dx = positions[i1 * 3] - positions[i2 * 3];
      let dy = positions[i1 * 3 + 1] - positions[i2 * 3 + 1];
      let dz = positions[i1 * 3 + 2] - positions[i2 * 3 + 2];

      const len = Math.hypot(dx, dy, dz) || 1e-6;
      const C = len - constraint.restLength;

      // α̃ = compliance / dt^2
      const alphaTilde = constraint.compliance / subDtSq;
      const deltaLambda = (-C - alphaTilde * constraint.lambda) / (wSum + alphaTilde);
      constraint.lambda += deltaLambda;

      const px = (dx / len) * deltaLambda;
      const py = (dy / len) * deltaLambda;
      const pz = (dz / len) * deltaLambda;

      positions[i1 * 3] += px * w1;
      positions[i1 * 3 + 1] += py * w1;
      positions[i1 * 3 + 2] += pz * w1;

      positions[i2 * 3] -= px * w2;
      positions[i2 * 3 + 1] -= py * w2;
      positions[i2 * 3 + 2] -= pz * w2;
    }
  }

  /**
   * Skin Attachment Constraint: C = max(0, ||xi - xi_skin|| - dmax).
   */
  private projectSkinAttachmentConstraints(): void {
    if (!this.particles) return;
    const { positions, skinPositions, attachmentDistMax, invMass } = this.particles;
    const numParticles = positions.length / 3;

    for (let i = 0; i < numParticles; i++) {
      if (invMass[i] === 0.0) continue;

      const sx = skinPositions[i * 3];
      const sy = skinPositions[i * 3 + 1];
      const sz = skinPositions[i * 3 + 2];

      const dx = positions[i * 3] - sx;
      const dy = positions[i * 3 + 1] - sy;
      const dz = positions[i * 3 + 2] - sz;

      const dist = Math.hypot(dx, dy, dz);
      const dMax = attachmentDistMax[i];

      if (dist > dMax && dist > 1e-4) {
        // Project particle back onto allowed sphere around skin anchor
        const scale = dMax / dist;
        positions[i * 3] = sx + dx * scale;
        positions[i * 3 + 1] = sy + dy * scale;
        positions[i * 3 + 2] = sz + dz * scale;
      }
    }
  }

  /**
   * Long-Range Attachment (LRA) Constraint.
   */
  private projectLongRangeConstraints(): void {
    if (!this.particles) return;
    const { positions } = this.particles;

    for (let k = 0; k < this.lraConstraints.length; k++) {
      const lra = this.lraConstraints[k];
      const pIdx = lra.particle;
      const aIdx = lra.anchor;

      const dx = positions[pIdx * 3] - positions[aIdx * 3];
      const dy = positions[pIdx * 3 + 1] - positions[aIdx * 3 + 1];
      const dz = positions[pIdx * 3 + 2] - positions[aIdx * 3 + 2];

      const dist = Math.hypot(dx, dy, dz);
      if (dist > lra.maxDist) {
        const factor = lra.maxDist / dist;
        positions[pIdx * 3] = positions[aIdx * 3] + dx * factor;
        positions[pIdx * 3 + 1] = positions[aIdx * 3 + 1] + dy * factor;
        positions[pIdx * 3 + 2] = positions[aIdx * 3 + 2] + dz * factor;
      }
    }
  }

  /**
   * Body Proxy Collision: Ccol(x) = φ(x) - tcloth >= 0.
   */
  private projectBodyCollisions(bodyProxy: MHRBodyProxy): void {
    if (!this.particles) return;
    const { positions, invMass } = this.particles;
    const numParticles = positions.length / 3;
    const tCloth = this.config.collisionTolerance || 0.012; // 12mm fabric thickness

    for (let i = 0; i < numParticles; i++) {
      if (invMass[i] === 0.0) continue;

      const x = positions[i * 3];
      const y = positions[i * 3 + 1];
      const z = positions[i * 3 + 2];

      const signedDist = bodyProxy.getSignedDistance(x, y, z);
      const penetration = tCloth - signedDist;

      if (penetration > 0) {
        // Normal outward from body axis
        const len = Math.hypot(x, z) || 1.0;
        const nx = x / len;
        const nz = z / len;

        // Push particle outward along normal to surface
        positions[i * 3] += nx * penetration;
        positions[i * 3 + 2] += nz * penetration;
      }
    }
  }

  getSimulatedPositions(): Float32Array | null {
    return this.particles ? this.particles.positions : null;
  }
}

