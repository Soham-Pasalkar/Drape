/**
 * DRAPE Camera Calibration Subsystem
 *
 * Owns the active pinhole intrinsics K = [[fx, 0, cx], [0, fy, cy], [0, 0, 1]] for the
 * *unmirrored* sensor image (see coordinates.ts for the coordinate contract).
 *
 * - Population prior: 65° horizontal FOV, square pixels, centred principal point.
 * - ISO ID-1 card: fx = observedWidthPx · Z / 0.0856 at a user-supplied distance Z.
 * - Every mutation bumps `version` so consumers (projection matrix, distance estimator)
 *   can detect stale state instead of silently keeping old intrinsics.
 *
 * Distance tracking lives in distance-estimator.ts; this class only owns K.
 */

import * as THREE from 'three';
import { CameraIntrinsics } from './types';
import { buildProjectionMatrix, computeVideoDisplayTransform, VideoDisplayTransform } from './coordinates';

// ISO/IEC 7810 ID-1 card dimensions in millimetres
export const ISO_ID1_CARD = {
  WIDTH_MM: 85.6,
  HEIGHT_MM: 53.98,
  ASPECT: 85.6 / 53.98,
};

/** Typical laptop / phone front-camera horizontal field of view used by the prior. */
export const PRIOR_HFOV_DEGREES = 65.0;

export class CameraCalibrationManager {
  private intrinsics: CameraIntrinsics;
  private _version = 0;

  constructor(initialWidth = 1280, initialHeight = 720) {
    this.intrinsics = CameraCalibrationManager.createPopulationPrior(initialWidth, initialHeight);
  }

  /** Monotonic counter incremented on every change of the active intrinsics. */
  get version(): number {
    return this._version;
  }

  /** Pure factory: does NOT modify any manager. Use resetToPopulationPrior() for that. */
  static createPopulationPrior(width: number, height: number): CameraIntrinsics {
    const fovRad = (PRIOR_HFOV_DEGREES * Math.PI) / 180.0;
    const fx = width / 2.0 / Math.tan(fovRad / 2.0);
    return {
      fx,
      fy: fx,
      cx: width / 2.0,
      cy: height / 2.0,
      width,
      height,
      isCalibrated: false,
      calibrationMethod: 'prior',
      confidence: 0.65,
    };
  }

  /** Instance alias kept for API compatibility; pure, does not mutate state. */
  createPopulationPrior(width: number, height: number): CameraIntrinsics {
    return CameraCalibrationManager.createPopulationPrior(width, height);
  }

  /** Replaces the active intrinsics with the population prior for the given stream size. */
  resetToPopulationPrior(width: number, height: number): CameraIntrinsics {
    this.intrinsics = CameraCalibrationManager.createPopulationPrior(width, height);
    this._version++;
    return this.getIntrinsics();
  }

  getIntrinsics(): CameraIntrinsics {
    return { ...this.intrinsics };
  }

  setIntrinsics(updated: Partial<CameraIntrinsics>): void {
    this.intrinsics = { ...this.intrinsics, ...updated };
    this._version++;
  }

  /**
   * Calibrates focal length from an ISO ID-1 card held parallel to the sensor at a known
   * distance. Both the pixel width and the distance are user inputs; the result is only as
   * good as they are.
   */
  calibrateWithReferenceCard(
    observedWidthPx: number,
    observedHeightPx: number,
    distanceM = 0.5
  ): CameraIntrinsics {
    if (!(observedWidthPx > 0) || !(observedHeightPx > 0) || !(distanceM > 0)) {
      throw new Error('INVALID_CARD_CALIBRATION_INPUT');
    }
    const fx = (observedWidthPx * distanceM) / (ISO_ID1_CARD.WIDTH_MM / 1000.0);
    const fy = (observedHeightPx * distanceM) / (ISO_ID1_CARD.HEIGHT_MM / 1000.0);
    const ratioDelta = Math.abs(observedWidthPx / observedHeightPx - ISO_ID1_CARD.ASPECT);

    this.intrinsics = {
      fx,
      fy,
      cx: this.intrinsics.width / 2.0,
      cy: this.intrinsics.height / 2.0,
      width: this.intrinsics.width,
      height: this.intrinsics.height,
      isCalibrated: true,
      calibrationMethod: 'card',
      confidence: ratioDelta < 0.15 ? 0.95 : 0.75,
    };
    this._version++;
    return this.getIntrinsics();
  }

  /**
   * Adapts K to a new stream resolution. The sensor FOV is assumed unchanged, so focal
   * lengths and principal point scale with the resolution (principal point scales
   * proportionally rather than being reset to the centre, preserving calibrated offsets).
   * Returns true when the resolution actually changed.
   */
  updateResolution(width: number, height: number): boolean {
    if (!(width > 0) || !(height > 0)) return false;
    if (this.intrinsics.width === width && this.intrinsics.height === height) return false;

    const scaleX = width / this.intrinsics.width;
    const scaleY = height / this.intrinsics.height;
    const aspectChanged = Math.abs(scaleX - scaleY) > 1e-3;

    if (aspectChanged && !this.intrinsics.isCalibrated) {
      // A different aspect ratio usually means a different sensor crop: rebuild the prior.
      this.intrinsics = CameraCalibrationManager.createPopulationPrior(width, height);
    } else {
      this.intrinsics = {
        ...this.intrinsics,
        fx: this.intrinsics.fx * scaleX,
        fy: this.intrinsics.fy * scaleY,
        cx: this.intrinsics.cx * scaleX,
        cy: this.intrinsics.cy * scaleY,
        width,
        height,
      };
    }
    this._version++;
    return true;
  }

  /**
   * Perspective-correct radius of a circular section whose silhouette spans apparentWidthPx
   * at depth distanceZ: the silhouette edges are tangent rays, t = (w/2)/f, r = Z·t/√(1+t²).
   */
  computePerspectiveCorrectRadius(apparentWidthPx: number, distanceZ: number, isXAxis = true): number {
    const f = isXAxis ? this.intrinsics.fx : this.intrinsics.fy;
    const t = apparentWidthPx / 2.0 / f;
    return (distanceZ * t) / Math.sqrt(1.0 + t * t);
  }

  refineEllipticalCrossSection(
    apparentWidthPx: number,
    distanceZ: number,
    depthToWidthRatio = 0.65
  ): { semiMajorA: number; semiMinorB: number } {
    const a = this.computePerspectiveCorrectRadius(apparentWidthPx, distanceZ, true);
    return { semiMajorA: a, semiMinorB: a * depthToWidthRatio };
  }

  /**
   * Projection matrix for a canvas covering the container in which the video is displayed.
   * When no display transform is given, the canvas is assumed to show the full frame 1:1.
   * Never mirrored — see the mirroring policy in coordinates.ts.
   */
  buildThreeProjectionMatrix(
    near = 0.05,
    far = 20.0,
    display?: VideoDisplayTransform
  ): THREE.Matrix4 {
    const K = this.intrinsics;
    const t =
      display ?? computeVideoDisplayTransform(K.width, K.height, K.width, K.height, 'cover');
    return buildProjectionMatrix(K, t, near, far);
  }
}
