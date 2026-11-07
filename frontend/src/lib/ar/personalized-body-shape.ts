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
}

