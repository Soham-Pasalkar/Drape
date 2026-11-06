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

import { BodyKeypoints, BodyMeasurements, CameraIntrinsics } from './types';

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
   * Estimates 3D anthropometric measurements from 2D body keypoints and camera intrinsics.
   */
  estimateMeasurements(
    keypoints: BodyKeypoints,
    distanceZ: number,
    intrinsics: CameraIntrinsics
  ): BodyMeasurements {
    const { fx, fy, width, height, isCalibrated } = intrinsics;

    // 1. Apparent pixel spans with robust fallbacks
    const shoulderSpanPx = (keypoints.shoulderWidth ?? Math.hypot(keypoints.rightShoulder.x - keypoints.leftShoulder.x, keypoints.rightShoulder.y - keypoints.leftShoulder.y)) * width;
    const torsoSpanPx = (keypoints.torsoHeight ?? Math.abs(keypoints.leftHip.y - keypoints.leftShoulder.y)) * height;
    const hipSpanPx = (keypoints.hipWidth ?? (Math.hypot(keypoints.rightHip.x - keypoints.leftHip.x, keypoints.rightHip.y - keypoints.leftHip.y) || keypoints.shoulderWidth * 0.75)) * width;

    // 2. Perspective-correct physical spans (in meters)
    // t = (wPx / 2) / fx, radius = Z * t / sqrt(1 + t^2)
    // span = 2 * radius
    const computeSpanM = (wPx: number, f: number) => {
      const t = (wPx / 2.0) / f;
      return (2.0 * distanceZ * t) / Math.sqrt(1.0 + t * t);
    };

    // Note: Shoulder joint centres under-represent total acromial breadth by ~12-15% (tissue & deltoid cap)
    const rawShoulderBreadthM = computeSpanM(shoulderSpanPx, fx);
    const shoulderBreadthCm = (rawShoulderBreadthM * 1.15) * 100.0;

    const torsoLengthM = computeSpanM(torsoSpanPx, fy);
    const torsoLengthCm = torsoLengthM * 100.0;

    const hipWidthM = computeSpanM(hipSpanPx, fx);

    // 3. Torso circumference estimation using Ramanujan's elliptical approximation
    // Human torso depth-to-width ratios: Chest ~0.65, Waist ~0.68, Hips ~0.68
    const chestSemiMajor = (rawShoulderBreadthM * 0.92) / 2.0;
    const chestCircCm =
      PersonalizedBodyShapeEstimator.computeRamanujanCircumference(
        chestSemiMajor,
        chestSemiMajor * 0.65
      ) * 100.0;

    // Waist width is typically ~80% of shoulder span
    const waistSemiMajor = (rawShoulderBreadthM * 0.80) / 2.0;
    const waistCircCm =
      PersonalizedBodyShapeEstimator.computeRamanujanCircumference(
        waistSemiMajor,
        waistSemiMajor * 0.68
      ) * 100.0;

    const hipSemiMajor = hipWidthM / 2.0;
    const hipCircCm =
      PersonalizedBodyShapeEstimator.computeRamanujanCircumference(
        hipSemiMajor,
        hipSemiMajor * 0.68
      ) * 100.0;

    // Arm and height estimation from proportional anthropometry
    const armLengthCm = torsoLengthCm * 1.12;
    const estimatedHeightCm = torsoLengthCm * 3.30;
    const inseamCm = estimatedHeightCm * 0.45;

    const shoulderVis = ((keypoints.leftShoulder.visibility ?? 1) + (keypoints.rightShoulder.visibility ?? 1)) / 2;
    const hipVis = ((keypoints.leftHip.visibility ?? 1) + (keypoints.rightHip.visibility ?? 1)) / 2;

    const confidenceFactor = isCalibrated ? 0.95 : 0.70;

    return {
      heightCm: Math.round(estimatedHeightCm),
      shoulderBreadthCm: Math.round(shoulderBreadthCm * 10) / 10,
      chestCircumferenceCm: Math.round(chestCircCm * 10) / 10,
      waistCircumferenceCm: Math.round(waistCircCm * 10) / 10,
      hipCircumferenceCm: Math.round(hipCircCm * 10) / 10,
      torsoLengthCm: Math.round(torsoLengthCm * 10) / 10,
      armLengthCm: Math.round(armLengthCm * 10) / 10,
      inseamCm: Math.round(inseamCm * 10) / 10,
      confidence: {
        overall: Math.round(confidenceFactor * keypoints.confidence * 100) / 100,
        shoulders: Math.round(confidenceFactor * shoulderVis * 100) / 100,
        chest: Math.round(confidenceFactor * shoulderVis * 0.9 * 100) / 100,
        waist: Math.round(confidenceFactor * ((shoulderVis + hipVis) / 2) * 100) / 100,
        hips: Math.round(confidenceFactor * hipVis * 100) / 100,
      },
      isEstimated: !isCalibrated,
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

