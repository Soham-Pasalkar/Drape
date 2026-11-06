/**
 * DRAPE Landmark Smoother & Keypoint Extractor
 *
 * Implements the 1€ Filter (Casiez et al., 2012) to stabilize MediaPipe pose landmarks,
 * suppress high-frequency camera sensor tremble, maintain low latency during rapid turns,
 * and extract anatomical anatomical centers (shoulders, chest, waist, hips).
 */

import { LandmarkPoint, BodyKeypoints } from './types';
import { OneEuroFilterVec3, OneEuroConfig } from './one-euro-filter';

// MediaPipe Pose Landmark Indices (33 points)
export const POSE_LANDMARKS = {
  NOSE: 0,
  LEFT_EYE_INNER: 1,
  LEFT_EYE: 2,
  LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4,
  RIGHT_EYE: 5,
  RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  MOUTH_LEFT: 9,
  MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_PINKY: 17,
  RIGHT_PINKY: 18,
  LEFT_INDEX: 19,
  RIGHT_INDEX: 20,
  LEFT_THUMB: 21,
  RIGHT_THUMB: 22,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
} as const;

export class LandmarkSmoother {
  private filters: Map<number, OneEuroFilterVec3> = new Map();
  private worldFilters: Map<number, OneEuroFilterVec3> = new Map();
  private filterConfig: OneEuroConfig;
  private worldFilterConfig: OneEuroConfig;
  private prevTimestamp = 0;
  /** After a tracking gap longer than this the filters restart instead of interpolating. */
  static readonly RESET_GAP_MS = 500;

  constructor(config?: Partial<OneEuroConfig>) {
    this.filterConfig = {
      fMin: config?.fMin ?? 1.2,       // Cutoff frequency for still pose
      beta: config?.beta ?? 0.015,     // Speed coefficient to eliminate lag
      dCutOff: config?.dCutOff ?? 1.0, // Derivative cutoff
      maxVelocity: 4.0,                // Velocity clamping
    };
    // World landmarks are metres (≈ 0.4 m shoulder span vs ≈ 0.2 normalized units), so the
    // speed coefficient is scaled accordingly; they are also noisier in z.
    this.worldFilterConfig = { fMin: 1.0, beta: 0.008, dCutOff: 1.0, maxVelocity: 8.0 };
  }

  /**
   * Resets internal filter states on tracking loss.
   */
  reset(): void {
    this.filters.clear();
    this.worldFilters.clear();
    this.prevTimestamp = 0;
  }

  /**
   * Filters raw MediaPipe landmarks with 1€ filter and returns stabilized BodyKeypoints.
   */
  process(
    rawLandmarks: LandmarkPoint[],
    timestamp: number = performance.now(),
    worldLandmarks?: LandmarkPoint[]
  ): BodyKeypoints | null {
    if (!rawLandmarks || rawLandmarks.length < 25) {
      return null;
    }

    const lsRaw = rawLandmarks[POSE_LANDMARKS.LEFT_SHOULDER];
    const rsRaw = rawLandmarks[POSE_LANDMARKS.RIGHT_SHOULDER];
    const lhRaw = rawLandmarks[POSE_LANDMARKS.LEFT_HIP];
    const rhRaw = rawLandmarks[POSE_LANDMARKS.RIGHT_HIP];

    // Minimal visibility check for torso anchors
    const visThreshold = 0.35;
    if (
      (lsRaw.visibility !== undefined && lsRaw.visibility < visThreshold) ||
      (rsRaw.visibility !== undefined && rsRaw.visibility < visThreshold)
    ) {
      return null;
    }

    if (this.prevTimestamp > 0 && timestamp - this.prevTimestamp > LandmarkSmoother.RESET_GAP_MS) {
      this.filters.clear();
      this.worldFilters.clear();
    }
    this.prevTimestamp = timestamp;

    const smoothedPoints: LandmarkPoint[] = [];

    // Filter each landmark with its own 1€ filter instance
    for (let i = 0; i < rawLandmarks.length; i++) {
      const raw = rawLandmarks[i];
      let filter = this.filters.get(i);
      if (!filter) {
        filter = new OneEuroFilterVec3(this.filterConfig);
        this.filters.set(i, filter);
      }

      const filtered = filter.filter([raw.x, raw.y, raw.z], timestamp);
      smoothedPoints.push({
        x: filtered[0],
        y: filtered[1],
        z: filtered[2],
        visibility: raw.visibility,
        presence: raw.presence,
      });
    }

    let smoothedWorld: LandmarkPoint[] | undefined;
    if (worldLandmarks && worldLandmarks.length === rawLandmarks.length) {
      smoothedWorld = worldLandmarks.map((w, i) => {
        let f = this.worldFilters.get(i);
        if (!f) {
          f = new OneEuroFilterVec3(this.worldFilterConfig);
          this.worldFilters.set(i, f);
        }
        const v = f.filter([w.x, w.y, w.z], timestamp);
        return { x: v[0], y: v[1], z: v[2], visibility: w.visibility, presence: w.presence };
      });
    }

    const ls = smoothedPoints[POSE_LANDMARKS.LEFT_SHOULDER];
    const rs = smoothedPoints[POSE_LANDMARKS.RIGHT_SHOULDER];
    const le = smoothedPoints[POSE_LANDMARKS.LEFT_ELBOW] || ls;
    const re = smoothedPoints[POSE_LANDMARKS.RIGHT_ELBOW] || rs;
    const lw = smoothedPoints[POSE_LANDMARKS.LEFT_WRIST] || le;
    const rw = smoothedPoints[POSE_LANDMARKS.RIGHT_WRIST] || re;
    const lh = smoothedPoints[POSE_LANDMARKS.LEFT_HIP] || ls;
    const rh = smoothedPoints[POSE_LANDMARKS.RIGHT_HIP] || rs;
    const lk = smoothedPoints[POSE_LANDMARKS.LEFT_KNEE];
    const rk = smoothedPoints[POSE_LANDMARKS.RIGHT_KNEE];
    const la = smoothedPoints[POSE_LANDMARKS.LEFT_ANKLE];
    const ra = smoothedPoints[POSE_LANDMARKS.RIGHT_ANKLE];
    const nose = smoothedPoints[POSE_LANDMARKS.NOSE];

    // Virtual anatomical centers
    const shoulderCenter: LandmarkPoint = {
      x: (ls.x + rs.x) / 2.0,
      y: (ls.y + rs.y) / 2.0,
      z: (ls.z + rs.z) / 2.0,
      visibility: Math.min(ls.visibility ?? 1, rs.visibility ?? 1),
    };

    const hipCenter: LandmarkPoint = {
      x: (lh.x + rh.x) / 2.0,
      y: (lh.y + rh.y) / 2.0,
      z: (lh.z + rh.z) / 2.0,
      visibility: Math.min(lh.visibility ?? 1, rh.visibility ?? 1),
    };

    const chestCenter: LandmarkPoint = {
      x: shoulderCenter.x * 0.7 + hipCenter.x * 0.3,
      y: shoulderCenter.y * 0.7 + hipCenter.y * 0.3,
      z: shoulderCenter.z * 0.7 + hipCenter.z * 0.3,
    };

    // Waist is anatomically ~60% down from shoulders to hips
    const waistCenter: LandmarkPoint = {
      x: shoulderCenter.x * 0.4 + hipCenter.x * 0.6,
      y: shoulderCenter.y * 0.4 + hipCenter.y * 0.6,
      z: shoulderCenter.z * 0.4 + hipCenter.z * 0.6,
    };

    const torsoCenter: LandmarkPoint = {
      x: (shoulderCenter.x + hipCenter.x) / 2.0,
      y: (shoulderCenter.y + hipCenter.y) / 2.0,
      z: (shoulderCenter.z + hipCenter.z) / 2.0,
    };

    // NOTE: these spans are in NORMALIZED image units (x/W and y/H mixed), useful only as
    // framing heuristics. Pixel spans must be computed with normalizedPixelDistance().
    const shoulderWidth = Math.hypot(rs.x - ls.x, rs.y - ls.y);
    const torsoHeight = Math.hypot(shoulderCenter.x - hipCenter.x, shoulderCenter.y - hipCenter.y);
    const hipWidth = Math.hypot(rh.x - lh.x, rh.y - lh.y);

    const confidence =
      ((ls.visibility ?? 1) +
        (rs.visibility ?? 1) +
        (lh.visibility ?? 0.8) +
        (rh.visibility ?? 0.8)) /
      4.0;

    return {
      nose,
      leftShoulder: ls,
      rightShoulder: rs,
      leftElbow: le,
      rightElbow: re,
      leftWrist: lw,
      rightWrist: rw,
      leftHip: lh,
      rightHip: rh,
      leftKnee: lk,
      rightKnee: rk,
      leftAnkle: la,
      rightAnkle: ra,
      shoulderCenter,
      hipCenter,
      torsoCenter,
      waistCenter,
      chestCenter,
      shoulderWidth,
      torsoHeight,
      hipWidth,
      confidence,
      worldLandmarks: smoothedWorld,
      timestamp,
    };
  }
}
