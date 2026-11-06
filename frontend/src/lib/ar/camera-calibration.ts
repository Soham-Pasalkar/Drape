/**
 * DRAPE Camera Calibration & Metric Projection Subsystem
 *
 * Implements:
 * 1. Pinhole Camera Model K = [[fx, 0, cx], [0, fy, cy], [0, 0, 1]]
 * 2. ISO ID-1 Reference Card Metric Scale Calibration (85.60 x 53.98 mm)
 * 3. Population Prior Fallback Calibration
 * 4. Relative Camera Distance Tracking Z(t) = Z0 * s0 / s(t) with Yaw Correction
 * 5. Perspective-Correct Body Radius Reconstruction: r = Z * t / sqrt(1 + t^2)
 * 6. Direct Three.js Off-Axis Projection Matrix Construction with Horizontal Mirroring
 */

import * as THREE from 'three';
import { CameraIntrinsics } from './types';

// Standard ISO/IEC 7810 ID-1 card dimensions in millimeters
export const ISO_ID1_CARD = {
  WIDTH_MM: 85.60,
  HEIGHT_MM: 53.98,
  ASPECT: 85.60 / 53.98, // ~1.5857
};

export class CameraCalibrationManager {
  private intrinsics: CameraIntrinsics;
  private referenceDistanceZ: number = 1.6; // Initial reference distance in meters
  private referenceShoulderScale: number | null = null;
  private smoothedDistanceZ: number = 1.6;

  constructor(initialWidth = 1280, initialHeight = 720) {
    this.intrinsics = this.createPopulationPrior(initialWidth, initialHeight);
  }

  /**
   * Generates a population prior for standard laptop/mobile front webcams.
   * Typical webcam horizontal field of view is approximately 65°–70°.
   */
  createPopulationPrior(width: number, height: number): CameraIntrinsics {
    const fovDegrees = 65.0;
    const fovRad = (fovDegrees * Math.PI) / 180.0;
    // fx = (width / 2) / tan(hfov / 2)
    const fx = (width / 2.0) / Math.tan(fovRad / 2.0);
    const fy = fx; // Assume square pixels
    const cx = width / 2.0;
    const cy = height / 2.0;

    return {
      fx,
      fy,
      cx,
      cy,
      width,
      height,
      isCalibrated: false,
      calibrationMethod: 'prior',
      confidence: 0.65,
    };
  }

  getIntrinsics(): CameraIntrinsics {
    return { ...this.intrinsics };
  }

  setIntrinsics(updated: Partial<CameraIntrinsics>): void {
    this.intrinsics = { ...this.intrinsics, ...updated };
  }

  /**
   * Calibrates focal length using an observed ISO ID-1 Reference Card
   * held at a known distance Z (default 0.50m for arm-length card calibration).
   *
   * fx = (observedWidthPx * distanceM) / cardWidthM
   */
  calibrateWithReferenceCard(
    observedWidthPx: number,
    observedHeightPx: number,
    distanceM = 0.50
  ): CameraIntrinsics {
    const cardWidthM = ISO_ID1_CARD.WIDTH_MM / 1000.0;
    const cardHeightM = ISO_ID1_CARD.HEIGHT_MM / 1000.0;

    const fx = (observedWidthPx * distanceM) / cardWidthM;
    const fy = (observedHeightPx * distanceM) / cardHeightM;
    const cx = this.intrinsics.width / 2.0;
    const cy = this.intrinsics.height / 2.0;

    // Verify aspect ratio sanity (within 10% of ISO ID-1 ratio)
    const observedAspect = observedWidthPx / observedHeightPx;
    const ratioDelta = Math.abs(observedAspect - ISO_ID1_CARD.ASPECT);
    const confidence = ratioDelta < 0.15 ? 0.95 : 0.75;

    this.intrinsics = {
      fx,
      fy,
      cx,
      cy,
      width: this.intrinsics.width,
      height: this.intrinsics.height,
      isCalibrated: true,
      calibrationMethod: 'card',
      confidence,
    };

    return this.getIntrinsics();
  }

  /**
   * Updates stream resolution while re-scaling focal length and principal point.
   */
  updateResolution(width: number, height: number): void {
    if (this.intrinsics.width === width && this.intrinsics.height === height) return;

    const scaleX = width / this.intrinsics.width;
    const scaleY = height / this.intrinsics.height;

    this.intrinsics.fx *= scaleX;
    this.intrinsics.fy *= scaleY;
    this.intrinsics.cx = width / 2.0;
    this.intrinsics.cy = height / 2.0;
    this.intrinsics.width = width;
    this.intrinsics.height = height;
  }

  /**
   * Establishes reference shoulder scale at the calibrated/initial distance.
   */
  setReferencePose(shoulderSpanPx: number, bodyYawRad = 0, distanceZ = 1.6): void {
    const cosYaw = Math.max(Math.cos(bodyYawRad), 0.5);
    this.referenceShoulderScale = shoulderSpanPx / cosYaw;
    this.referenceDistanceZ = distanceZ;
    this.smoothedDistanceZ = distanceZ;
  }

  /**
   * Tracks relative camera distance Z(t) based on apparent shoulder width and body yaw.
   * Z(t) = Z0 * s0 / s(t)
   * where s(t) = shoulderSpanPx / cos(yaw)
   */
  estimateCameraDistance(
    shoulderSpanPx: number,
    bodyYawRad = 0,
    confidence = 1.0
  ): number {
    if (!this.referenceShoulderScale || shoulderSpanPx <= 0) {
      return this.smoothedDistanceZ;
    }

    const cosYaw = Math.max(Math.cos(bodyYawRad), 0.5);
    const currentScale = shoulderSpanPx / cosYaw;

    if (currentScale <= 10) {
      return this.smoothedDistanceZ;
    }

    const rawZ = this.referenceDistanceZ * (this.referenceShoulderScale / currentScale);

    // Clamp to realistic domestic webcam operating range [0.35m, 4.0m]
    const clampedZ = Math.min(4.0, Math.max(0.35, rawZ));

    // Smooth distance transitions with confidence weighting
    const alpha = 0.15 * Math.min(confidence, 1.0);
    this.smoothedDistanceZ = this.smoothedDistanceZ * (1.0 - alpha) + clampedZ * alpha;

    return this.smoothedDistanceZ;
  }

  /**
   * Perspective-Correct Anatomical Section Radius Reconstruction.
   *
   * The apparent silhouette edge is a tangent ray from the camera, not a surface point
   * at the same depth as the body centroid.
   *
   * For circular section:
   * t = (wPx / 2) / fx
   * r = Z * t / sqrt(1 + t^2)
   */
  computePerspectiveCorrectRadius(
    apparentWidthPx: number,
    distanceZ: number,
    isXAxis = true
  ): number {
    const f = isXAxis ? this.intrinsics.fx : this.intrinsics.fy;
    const t = (apparentWidthPx / 2.0) / f;
    const r = (distanceZ * t) / Math.sqrt(1.0 + t * t);
    return r;
  }

  /**
   * Elliptical cross-section iterative refinement for semi-axes (a, b)
   * given apparent width wPx and estimated depth-to-width ratio (b/a).
   */
  refineEllipticalCrossSection(
    apparentWidthPx: number,
    distanceZ: number,
    depthToWidthRatio = 0.65 // Human torso depth is typically ~65% of torso width
  ): { semiMajorA: number; semiMinorB: number } {
    const a = this.computePerspectiveCorrectRadius(apparentWidthPx, distanceZ, true);
    const b = a * depthToWidthRatio;
    return { semiMajorA: a, semiMinorB: b };
  }

  /**
   * Constructs an exact Three.js Matrix4 projection matrix directly from the
   * calibrated camera intrinsics (fx, fy, cx, cy) and viewport dimensions.
   *
   * Includes off-axis principal point shift and horizontal mirroring without
   * inverting mesh winding, clipping planes, or depth tests.
   */
  buildThreeProjectionMatrix(
    near = 0.05,
    far = 20.0,
    isMirrored = true
  ): THREE.Matrix4 {
    const { fx, fy, cx, cy, width, height } = this.intrinsics;

    // Projection matrix components
    // [ P00   0   P02   0  ]
    // [  0   P11  P12   0  ]
    // [  0    0   P22  P23 ]
    // [  0    0   -1    0  ]

    const matrix = new THREE.Matrix4();
    const elements = matrix.elements;

    // Standard pinhole off-axis frustum matching OpenGL clip space:
    // P00 = 2 * fx / width
    // P11 = 2 * fy / height
    // P02 = 1 - (2 * cx / width)
    // P12 = (2 * cy / height) - 1  (Three.js screen Y is inverted relative to image coordinate v)
    // P22 = -(far + near) / (far - near)
    // P23 = -(2 * far * near) / (far - near)
    // P32 = -1

    let p00 = (2.0 * fx) / width;
    let p02 = 1.0 - (2.0 * cx) / width;

    if (isMirrored) {
      // In mirror mode, invert X column so moving right in front of webcam translates +X on screen
      p00 = -p00;
      p02 = -p02;
    }

    const p11 = (2.0 * fy) / height;
    const p12 = (2.0 * cy) / height - 1.0;

    const p22 = -(far + near) / (far - near);
    const p23 = -(2.0 * far * near) / (far - near);

    // Fill column-major order array for THREE.Matrix4
    elements[0] = p00;
    elements[1] = 0.0;
    elements[2] = 0.0;
    elements[3] = 0.0;

    elements[4] = 0.0;
    elements[5] = p11;
    elements[6] = 0.0;
    elements[7] = 0.0;

    elements[8] = p02;
    elements[9] = p12;
    elements[10] = p22;
    elements[11] = -1.0;

    elements[12] = 0.0;
    elements[13] = 0.0;
    elements[14] = p23;
    elements[15] = 0.0;

    return matrix;
  }
}

