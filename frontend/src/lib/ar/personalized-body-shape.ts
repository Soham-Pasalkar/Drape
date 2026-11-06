/**
 * DRAPE Personalized Body Shape Estimation Subsystem
 *
 * Implements:
 * 1. Anatomical Measurement Vector m = [height, shoulder, chest, waist, hip, torso, arm, inseam]
 * 2. Ramanujan's Ellipse Perimeter Formulation for Torso Sections:
 *    C ≈ π * [3(a+b) - sqrt((3a+b)(a+3b))]
 * 3. Regularized Linear Shape-Space Solver:
 *    β* = (A^T W^T W A + λ Σβ^-1)^-1 A^T W^T W (m - m̄)
 * 4. Measurement Confidence Matrix W and Anthropometric Prior Regularization
 */

import { BodyMeasurements } from './types';

export const BODY_MEASUREMENT_FACTORS = {
  BIACROMIAL_PER_LANDMARK: 1.15,
  CHEST_PER_BIACROMIAL: 0.92,
  CHEST_DEPTH_RATIO: 0.65,
  WAIST_PER_BIACROMIAL: 0.8,
  WAIST_DEPTH_RATIO: 0.68,
  HIP_PER_LANDMARK: 1.35,
  HIP_DEPTH_RATIO: 0.68,
  HEIGHT_PER_TORSO: 3.3,
  ARM_PER_TORSO: 1.12,
  INSEAM_PER_HEIGHT: 0.45,
};

export class PersonalizedBodyShapeEstimator {
  // Population mean measurement vector m̄ (in centimeters)
  private readonly meanMeasurements: number[] = [
    172.0, // Height
    44.0,  // Shoulder breadth
    96.0,  // Chest circumference
    78.0,  // Waist circumference
    98.0,  // Hip circumference
    52.0,  // Torso length (shoulder-to-hip)
    58.0,  // Arm length
    78.0,  // Inseam
  ];

  // Anthropometric variance prior Σβ (diagonal matrix)
  private readonly priorVariance: number[] = [
    64.0, 9.0, 36.0, 49.0, 36.0, 16.0, 16.0, 25.0
  ];

  // Measurement Jacobian A relating 10 PCA shape parameters β to measurement deltas
  // Size: 8 measurements x 10 PCA shape modes
  private readonly jacobianA: number[][] = [
    [1.0,  0.2, -0.1,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0], // Height
    [0.3,  0.8,  0.2, -0.1,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0], // Shoulder
    [0.2,  0.9,  0.7,  0.3,  0.1,  0.0,  0.0,  0.0,  0.0,  0.0], // Chest
    [0.1,  0.7,  0.9,  0.2, -0.1,  0.0,  0.0,  0.0,  0.0,  0.0], // Waist
    [0.2,  0.8,  0.8, -0.2,  0.2,  0.0,  0.0,  0.0,  0.0,  0.0], // Hip
    [0.5,  0.1,  0.2,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0], // Torso length
    [0.6, -0.1,  0.1,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0], // Arm length
    [0.7, -0.1, -0.1,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0], // Inseam
  ];

  /**
   * Ramanujan's Ellipse Circumference Approximation:
   * C ≈ π * [3(a+b) - sqrt((3a+b)(a+3b))]
   */
  static computeRamanujanCircumference(semiMajorA: number, semiMinorB: number): number {
    const a = Math.max(0.001, semiMajorA);
    const b = Math.max(0.001, semiMinorB);
    const term1 = 3.0 * (a + b);
    const term2 = Math.sqrt((3.0 * a + b) * (a + 3.0 * b));
    return Math.PI * (term1 - term2);
  }

  /**
   * Estimates body measurements from the scale-bearing body model.
   *
   * WHAT IS OBSERVED vs ASSUMED
   *   Observed (scale-free): ratios hip-span / shoulder-span and torso-length / shoulder-span,
   *   measured in yaw-corrected image pixels.
   *   Assumed: the absolute shoulder-landmark breadth B (from MediaPipe world landmarks or the
   *   population prior) unless the user supplied a known distance. Therefore every centimetre
   *   value below inherits B's uncertainty; with scaleSource = 'anthropometric_prior' they are
   *   indicative only and must not be presented as measurements.
   *
   * ANTHROPOMETRIC FACTORS (documented approximations)
   *   biacromial breadth  ≈ 1.15 × shoulder-landmark breadth (landmarks sit near joint centres)
   *   chest breadth       ≈ 0.92 × biacromial,  depth/breadth ≈ 0.65
   *   waist breadth       ≈ 0.80 × biacromial,  depth/breadth ≈ 0.68
   *   hip breadth         ≈ 1.35 × hip-landmark breadth (soft tissue lateral to the joints),
   *                         depth/breadth ≈ 0.68
   *   circumference       = Ramanujan ellipse perimeter
   */
  estimateFromBodyModel(model: {
    shoulderBreadthM: number;
    hipBreadthM: number;
    torsoLengthM: number;
    scaleSource: 'anthropometric_prior' | 'known_distance';
    shoulderVisibility: number;
    hipVisibility: number;
  }): BodyMeasurements & {
    semiAxes: { chest: { a: number; b: number }; waist: { a: number; b: number }; hips: { a: number; b: number } };
  } {
    const F = BODY_MEASUREMENT_FACTORS;
    const biacromial = model.shoulderBreadthM * F.BIACROMIAL_PER_LANDMARK;
    const chestA = (biacromial * F.CHEST_PER_BIACROMIAL) / 2;
    const waistA = (biacromial * F.WAIST_PER_BIACROMIAL) / 2;
    const hipA = (model.hipBreadthM * F.HIP_PER_LANDMARK) / 2;
    const chest = { a: chestA, b: chestA * F.CHEST_DEPTH_RATIO };
    const waist = { a: waistA, b: waistA * F.WAIST_DEPTH_RATIO };
    const hips = { a: hipA, b: hipA * F.HIP_DEPTH_RATIO };
    const C = PersonalizedBodyShapeEstimator.computeRamanujanCircumference;

    const chestCm = C(chest.a, chest.b) * 100;
    const waistCm = C(waist.a, waist.b) * 100;
    const hipCm = C(hips.a, hips.b) * 100;
    const torsoLengthCm = model.torsoLengthM * 100;

    // Relative scale uncertainty: ~12 % with the prior (adult biacromial CV), ~5 % with a known
    // distance (residual landmark and factor error).
    const relSigma = model.scaleSource === 'known_distance' ? 0.05 : 0.12;
    const scaleConf = model.scaleSource === 'known_distance' ? 0.85 : 0.35;
    const round1 = (v: number) => Math.round(v * 10) / 10;
    const round2 = (v: number) => Math.round(v * 100) / 100;

    return {
      heightCm: Math.round(torsoLengthCm * F.HEIGHT_PER_TORSO),
      shoulderBreadthCm: round1(biacromial * 100),
      chestCircumferenceCm: round1(chestCm),
      waistCircumferenceCm: round1(waistCm),
      hipCircumferenceCm: round1(hipCm),
      torsoLengthCm: round1(torsoLengthCm),
      armLengthCm: round1(torsoLengthCm * F.ARM_PER_TORSO),
      inseamCm: round1(torsoLengthCm * F.HEIGHT_PER_TORSO * F.INSEAM_PER_HEIGHT),
      confidence: {
        overall: round2(scaleConf * Math.min(model.shoulderVisibility, model.hipVisibility)),
        shoulders: round2(scaleConf * model.shoulderVisibility),
        chest: round2(scaleConf * model.shoulderVisibility * 0.85),
        waist: round2(scaleConf * ((model.shoulderVisibility + model.hipVisibility) / 2) * 0.8),
        hips: round2(scaleConf * model.hipVisibility * 0.85),
      },
      isEstimated: true,
      scaleSource: model.scaleSource,
      uncertaintyCm: round1(relSigma * chestCm),
      semiAxes: { chest, waist, hips },
    };
  }

  /**
   * Solves for regularized PCA body shape parameter vector β:
   * β* = (A^T W^T W A + λ Σβ^-1)^-1 A^T W^T W (m - m̄)
   */
  solveShapeParameters(measurements: BodyMeasurements, lambda = 0.5): number[] {
    const m = [
      measurements.heightCm,
      measurements.shoulderBreadthCm,
      measurements.chestCircumferenceCm,
      measurements.waistCircumferenceCm,
      measurements.hipCircumferenceCm,
      measurements.torsoLengthCm,
      measurements.armLengthCm,
      measurements.inseamCm,
    ];

    // Compute delta (m - m̄)
    const deltaM = m.map((val, i) => val - this.meanMeasurements[i]);

    // Diagonal confidence weights W
    const w = [
      0.6,
      measurements.confidence.shoulders,
      measurements.confidence.chest,
      measurements.confidence.waist,
      measurements.confidence.hips,
      0.8,
      0.6,
      0.5,
    ];

    const numParams = 10;
    const numMeas = 8;

    // Normal equations matrix M = A^T W^2 A + lambda * diag(1 / variance)
    const M: number[][] = Array.from({ length: numParams }, () => Array(numParams).fill(0));
    const rhs: number[] = Array(numParams).fill(0);

    for (let j = 0; j < numParams; j++) {
      for (let k = 0; k < numParams; k++) {
        let sum = 0;
        for (let i = 0; i < numMeas; i++) {
          sum += this.jacobianA[i][j] * (w[i] * w[i]) * this.jacobianA[i][k];
        }
        if (j === k) {
          sum += lambda * (1.0 / (this.priorVariance[j] || 10.0));
        }
        M[j][k] = sum;
      }

      let rhsSum = 0;
      for (let i = 0; i < numMeas; i++) {
        rhsSum += this.jacobianA[i][j] * (w[i] * w[i]) * deltaM[i];
      }
      rhs[j] = rhsSum;
    }

    // Solve M * beta = rhs using Gaussian elimination with partial pivoting
    return this.solveLinearSystem(M, rhs);
  }

  private solveLinearSystem(A: number[][], b: number[]): number[] {
    const n = b.length;
    const M = A.map((row) => [...row]);
    const x = [...b];

    for (let i = 0; i < n; i++) {
      // Find pivot
      let maxEl = Math.abs(M[i][i]);
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(M[k][i]) > maxEl) {
          maxEl = Math.abs(M[k][i]);
          maxRow = k;
        }
      }

      // Swap rows
      const tmpRow = M[maxRow];
      M[maxRow] = M[i];
      M[i] = tmpRow;

      const tmpB = x[maxRow];
      x[maxRow] = x[i];
      x[i] = tmpB;

      if (Math.abs(M[i][i]) < 1e-8) {
        continue;
      }

      // Eliminate below
      for (let k = i + 1; k < n; k++) {
        const c = -M[k][i] / M[i][i];
        for (let j = i; j < n; j++) {
          if (i === j) {
            M[k][j] = 0;
          } else {
            M[k][j] += c * M[i][j];
          }
        }
        x[k] += c * x[i];
      }
    }

    // Back-substitution
    const sol = Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
      let sum = x[i];
      for (let j = i + 1; j < n; j++) {
        sum -= M[i][j] * sol[j];
      }
      sol[i] = Math.abs(M[i][i]) > 1e-8 ? sum / M[i][i] : 0;
    }

    return sol;
  }
}

