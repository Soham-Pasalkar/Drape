/**
 * DRAPE Garment Ease & Physical Fit Subsystem
 *
 * Implements:
 * 1. Pattern Circumference vs. Body Circumference Ease Formulation: e = Cg - Cb
 * 2. Positive Ease Elliptical Radial Offset Root-Finder (Ramanujan-based 1D Solver)
 * 3. Negative Ease Strain Estimation: ε = (Cb * (1 + tcontact)) / Cg - 1
 * 4. Fabric Stretch Limits & "Too Small" Guardrails
 */

import {
  GarmentMetadata,
  BodyMeasurements,
  GarmentEase,
} from './types';
import { PersonalizedBodyShapeEstimator } from './personalized-body-shape';

export class GarmentEaseEngine {
  /**
   * Evaluates garment ease, fabric strain, and fit assessment.
   */
  evaluateFit(
    garment: GarmentMetadata,
    measurements: BodyMeasurements
  ): GarmentEase {
    const dims = garment.dimensions;
    const fabric = garment.fabric;

    let chestEaseCm: number | undefined;
    let waistEaseCm: number | undefined;
    let hipEaseCm: number | undefined;

    let maxStrain = 0.0;
    let isTooSmall = false;

    // 1. Evaluate Chest Ease for tops and dresses
    if (dims.chestCm) {
      chestEaseCm = dims.chestCm - measurements.chestCircumferenceCm;
      if (chestEaseCm < 0) {
        // Negative ease strain: ε = (Cb * (1 + tcontact)) / Cg - 1
        const tContact = 0.02; // 2% contact ease
        const strain = (measurements.chestCircumferenceCm * (1.0 + tContact)) / dims.chestCm - 1.0;
        maxStrain = Math.max(maxStrain, strain * 100.0);
      }
    }

    // 2. Evaluate Waist Ease for skirts, dresses, and tops
    if (dims.waistCm) {
      waistEaseCm = dims.waistCm - measurements.waistCircumferenceCm;
      if (waistEaseCm < 0) {
        const strain = (measurements.waistCircumferenceCm * 1.02) / dims.waistCm - 1.0;
        maxStrain = Math.max(maxStrain, strain * 100.0);
      }
    }

    // 3. Evaluate Hip Ease for skirts and dresses
    if (dims.hipsCm) {
      hipEaseCm = dims.hipsCm - measurements.hipCircumferenceCm;
      if (hipEaseCm < 0) {
        const strain = (measurements.hipCircumferenceCm * 1.02) / dims.hipsCm - 1.0;
        maxStrain = Math.max(maxStrain, strain * 100.0);
      }
    }

    // Check against fabric stretch limit
    const stretchLimit = fabric.stretchLimitPercent || 15.0;
    if (maxStrain > stretchLimit) {
      isTooSmall = true;
    }

    // Determine descriptive fit assessment
    let fitAssessment: 'relaxed' | 'tailored' | 'snug' | 'strained' | 'too_small';
    if (isTooSmall) {
      fitAssessment = 'too_small';
    } else if (maxStrain > stretchLimit * 0.75) {
      fitAssessment = 'strained';
    } else if (maxStrain > 0) {
      fitAssessment = 'snug';
    } else if ((chestEaseCm ?? 10) > 12 || (waistEaseCm ?? 10) > 10) {
      fitAssessment = 'relaxed';
    } else {
      fitAssessment = 'tailored';
    }

    return {
      chestEaseCm: chestEaseCm !== undefined ? Math.round(chestEaseCm * 10) / 10 : undefined,
      waistEaseCm: waistEaseCm !== undefined ? Math.round(waistEaseCm * 10) / 10 : undefined,
      hipEaseCm: hipEaseCm !== undefined ? Math.round(hipEaseCm * 10) / 10 : undefined,
      estimatedStrainPercent: Math.round(maxStrain * 10) / 10,
      isTooSmall,
      fitAssessment,
    };
  }

  /**
   * Positive Ease 1D Root-Finder:
   * Solves for radial offset δ (in meters) such that an elliptical cross-section
   * with baseline semi-axes (a, b) expanded to (a + δ, b + δ) matches pattern perimeter Cg.
   *
   * Uses Newton-Raphson with bisection safety fallback.
   */
  solveRadialOffsetForEase(
    semiMajorA: number,
    semiMinorB: number,
    targetCircumferenceM: number
  ): number {
    const C_target = targetCircumferenceM;
    const C_base = PersonalizedBodyShapeEstimator.computeRamanujanCircumference(
      semiMajorA,
      semiMinorB
    );

    if (C_target <= C_base) {
      return 0.005; // Minimum 5mm skin clearance
    }

    // Initial bracket: [low = 0, high = (C_target - C_base) / (2 * π)]
    let low = 0.0;
    let high = (C_target - C_base) / (2.0 * Math.PI) * 1.5;
    let delta = (low + high) / 2.0;

    // Iterative root finding
    for (let iter = 0; iter < 12; iter++) {
      const C_current = PersonalizedBodyShapeEstimator.computeRamanujanCircumference(
        semiMajorA + delta,
        semiMinorB + delta
      );

      const error = C_current - C_target;
      if (Math.abs(error) < 0.0005) {
        // Converged to within 0.5mm
        break;
      }

      if (error < 0) {
        low = delta;
      } else {
        high = delta;
      }

      delta = (low + high) / 2.0;
    }

    return Math.max(0.005, delta);
  }
}

