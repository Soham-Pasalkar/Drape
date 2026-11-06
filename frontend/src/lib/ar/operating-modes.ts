/**
 * DRAPE Camera Operating Modes & Framing Subsystem
 *
 * Implements:
 * 1. Automatic mode transitions: Collar (<0.5m), Bust (0.6 - 1.4m), Full-Body (>1.6m)
 * 2. Landmark visibility and framing evaluation against active garment requirements
 * 3. Real-time customer guidance (Step Back, Move Closer, Center Body)
 */

import {
  OperatingMode,
  FramingGuidance,
  BodyKeypoints,
  GarmentCategory,
} from './types';

export interface FramingEvaluation {
  mode: OperatingMode;
  guidance: FramingGuidance;
  guidanceMessage: string;
  isEligibleForGarment: boolean;
  visibilityScores: {
    face: number;
    torso: number;
    hips: number;
    legs: number;
  };
}

export class OperatingModeManager {
  private currentMode: OperatingMode = 'bust';

  /**
   * Evaluates current body framing, distance, and garment requirements.
   */
  evaluate(
    keypoints: BodyKeypoints | null,
    distanceZ: number,
    garmentCategory: GarmentCategory
  ): FramingEvaluation {
    if (!keypoints) {
      return {
        mode: this.currentMode,
        guidance: 'center_body',
        guidanceMessage: 'Step into camera view to calibrate fit',
        isEligibleForGarment: false,
        visibilityScores: { face: 0, torso: 0, hips: 0, legs: 0 },
      };
    }

    const faceVis = keypoints.nose?.visibility ?? 0.8;
    const lsVis = keypoints.leftShoulder.visibility ?? 1.0;
    const rsVis = keypoints.rightShoulder.visibility ?? 1.0;
    const torsoVis = (lsVis + rsVis) / 2.0;

    const lhVis = keypoints.leftHip.visibility ?? 0.5;
    const rhVis = keypoints.rightHip.visibility ?? 0.5;
    const hipsVis = (lhVis + rhVis) / 2.0;

    const lkVis = keypoints.leftKnee?.visibility ?? 0.0;
    const rkVis = keypoints.rightKnee?.visibility ?? 0.0;
    const legsVis = (lkVis + rkVis) / 2.0;

    // Detect natural operating mode from distance and landmark visibility
    let detectedMode: OperatingMode;
    if (distanceZ < 0.55 && hipsVis < 0.3) {
      detectedMode = 'collar';
    } else if (distanceZ > 1.55 && legsVis > 0.4) {
      detectedMode = 'full-body';
    } else {
      detectedMode = 'bust';
    }

    this.currentMode = detectedMode;

    // Check boundary framing (is user clipped at top, bottom, or sides?)
    const minX = Math.min(keypoints.leftShoulder.x, keypoints.rightShoulder.x);
    const maxX = Math.max(keypoints.leftShoulder.x, keypoints.rightShoulder.x);
    const minY = Math.min(keypoints.leftShoulder.y, keypoints.rightShoulder.y);

    let guidance: FramingGuidance = 'good_framing';
    let guidanceMessage = 'Optimal studio framing';
    let isEligible = true;

    if (minX < 0.05 || maxX > 0.95 || minY < 0.03) {
      guidance = 'center_body';
      guidanceMessage = 'Center yourself within the camera frame';
    }

    // Evaluate garment-specific visibility requirements
    if (garmentCategory === 'skirts') {
      if (hipsVis < 0.5) {
        guidance = 'step_back';
        guidanceMessage = 'Step back ~1.8m so waist and hips are fully visible';
        isEligible = false;
      } else if (legsVis < 0.35) {
        guidance = 'step_back';
        guidanceMessage = 'Step back slightly to view full skirt drape and hemline';
        isEligible = true; // Still allow fitting with lower confidence
      }
    } else if (garmentCategory === 'dresses') {
      if (hipsVis < 0.4 || legsVis < 0.3) {
        guidance = 'step_back';
        guidanceMessage = 'Step back ~2.0m for full-length gown drape';
        isEligible = false;
      }
    } else {
      // Tops
      if (torsoVis < 0.5) {
        guidance = 'move_closer';
        guidanceMessage = 'Move closer for clear shoulder and chest tracking';
        isEligible = false;
      } else if (distanceZ < 0.50) {
        guidance = 'too_close';
        guidanceMessage = 'Step back slightly (~0.8m) to view full torso fit';
        isEligible = true;
      }
    }

    return {
      mode: detectedMode,
      guidance,
      guidanceMessage,
      isEligibleForGarment: isEligible,
      visibilityScores: {
        face: faceVis,
        torso: torsoVis,
        hips: hipsVis,
        legs: legsVis,
      },
    };
  }
}

