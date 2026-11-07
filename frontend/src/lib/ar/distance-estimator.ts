/**
 * DRAPE shoulder-span depth estimator — instant, never gated (user fix list 2026-11-07, item 2).
 *
 * Every frame:   Z_inst = fx · W / S,   S = shoulderPx / max(cos(yaw), 0.5)
 * where W is the shoulder-joint span: a population prior (POPULATION_SHOULDER_BREADTH_M) unless a metric anchor
 * (known distance; later card / height / iris) corrected it. A monocular camera only observes W/Z, so the absolute
 * scale is APPROXIMATE without an anchor — that is a label, never a state that blocks motion.
 *
 * Robustness without freezing:
 *  - measurement weight w ∈ [0,1] from shoulder visibility and yaw; the target is blended toward the last value
 *    (Z_last + w·(Z_inst − Z_last)); after LOW_WEIGHT_TIMEOUT_MS of low weight the instant estimate is used again;
 *  - a maximum rate of change (MAX_RATE_MPS) bounds single-frame spikes;
 *  - a One Euro filter (time-based) smooths the result with low lag when moving.
 * There is no reference window, no "calibrating" state and no hold.
 */

import { DistanceMode } from './types';
import { OneEuroFilter } from './one-euro-filter';

/** Average adult MediaPipe shoulder-landmark separation (≈ 0.9 × biacromial breadth). */
export const POPULATION_SHOULDER_BREADTH_M = 0.36;

export const DISTANCE_ESTIMATOR_CONFIG = {
  /** cos(yaw) floor for the 1/cos span correction (|yaw| ≤ 60°). */
  MIN_COS_YAW: 0.5,
  /** Visibility at/below which the measurement weight is 0, and at/above which it is 1. */
  VIS_ZERO: 0.3,
  VIS_FULL: 0.7,
  /** cos(yaw) at/below which the yaw weight is 0 (60°), and at/above which it is 1 (≈ 26°). */
  COS_YAW_ZERO: 0.5,
  COS_YAW_FULL: 0.9,
  /** After this long without a weight ≥ 0.5 the instant estimate is used regardless. */
  LOW_WEIGHT_TIMEOUT_MS: 1000,
  /**
   * Bound on how fast Z may change (m/s). Rejects one-frame span glitches (≥ 10 m/s implied) while allowing fast
   * real approaches (the adversarial test steps in at ≈ 3 m/s; 2.5 m/s clipped it — fix item 6, attempt 2).
   */
  MAX_RATE_MPS: 5.0,
  ONE_EURO: { fMin: 1.5, beta: 6.0, dCutOff: 1.0, maxVelocity: 10 },
  MIN_DISTANCE_M: 0.3,
  MAX_DISTANCE_M: 5.0,
};

export interface ShoulderObservation {
  /** Pixel distance between the two shoulder landmarks in the unmirrored image. */
  shoulderSpanPx: number;
  /** Subject yaw about camera +Y (radians, 0 = facing camera). */
  yawRad: number;
  /** min(left, right) shoulder visibility. */
  visibility: number;
  /** |left − right| shoulder distance from world landmarks (metres); diagnostics only. */
  worldShoulderBreadthM?: number;
  timestampMs: number;
}

export type BreadthSource = 'world_landmarks' | 'population_prior' | 'known_distance';

export interface DistanceEstimate {
  distanceM: number;
  /** 'approximate' (prior scale) or 'metric' (anchored). Never blocks motion. */
  mode: DistanceMode;
  confidence: number;
  rawSpanPx: number;
  /** Yaw-corrected span S(t). */
  correctedSpanPx: number;
  /** Unfiltered instant estimate fx·W/S for this frame (null when no span). */
  instantDistanceM: number | null;
  /** Measurement weight applied this frame. */
  weight: number;
  /** Kept for diagnostic compatibility; always null / 0 now (there is no reference window). */
  referenceSpanPx: number | null;
  referenceDistanceM: number | null;
  samplesCollected: number;
  samplesRequired: number;
  lastWindowSpread: number | null;
  /** Shoulder breadth W (metres) currently anchoring the scale. */
  shoulderBreadthM: number;
  breadthSource: BreadthSource;
  yawRad: number;
  /** Why the measurement was down-weighted / limited this frame, or null for a full-weight measurement. */
  reason: string | null;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export class ShoulderDistanceEstimator {
  private readonly cfg = DISTANCE_ESTIMATOR_CONFIG;
  private breadthM = POPULATION_SHOULDER_BREADTH_M;
  private breadthSource: BreadthSource = 'population_prior';
  private metric = false;
  private filter = new OneEuroFilter(DISTANCE_ESTIMATOR_CONFIG.ONE_EURO);
  private zLast: number | null = null;
  private lastT: number | null = null;
  private lastGoodT: number | null = null;
  private lastCorrectedSpan: number | null = null;
  private last: DistanceEstimate | null = null;

  /** True once at least one measurement was taken. */
  get isInitialized(): boolean {
    return this.zLast !== null;
  }

  /** Clears the temporal state and any metric anchor. */
  resetReference(): void {
    this.breadthM = POPULATION_SHOULDER_BREADTH_M;
    this.breadthSource = 'population_prior';
    this.metric = false;
    this.filter.reset();
    this.zLast = null;
    this.lastT = null;
    this.lastGoodT = null;
    this.lastCorrectedSpan = null;
    this.last = null;
  }

  /**
   * Metric anchor: the user is at `distanceM` NOW. Corrects only the scale, W = Z·S/fx (motion is unaffected).
   * Returns false when no shoulder span has been measured yet.
   */
  setKnownReferenceDistance(distanceM: number, fx: number): boolean {
    if (this.lastCorrectedSpan === null || !(distanceM > 0)) return false;
    this.breadthM = (distanceM * this.lastCorrectedSpan) / fx;
    this.breadthSource = 'known_distance';
    this.metric = true;
    return true;
  }

  update(obs: ShoulderObservation, fx: number): DistanceEstimate {
    const cfg = this.cfg;
    const t = obs.timestampMs;
    const dt = this.lastT === null ? 1 / 30 : Math.max(1e-3, (t - this.lastT) / 1000);
    this.lastT = t;
    const cosYaw = Math.cos(obs.yawRad);
    const hasSpan = Number.isFinite(obs.shoulderSpanPx) && obs.shoulderSpanPx > 1;
    const S = hasSpan ? obs.shoulderSpanPx / Math.max(cosYaw, cfg.MIN_COS_YAW) : NaN;
    const zInst = hasSpan ? this.clampZ((fx * this.breadthM) / S) : null;
    if (hasSpan) this.lastCorrectedSpan = S;

    const visW = clamp01((obs.visibility - cfg.VIS_ZERO) / (cfg.VIS_FULL - cfg.VIS_ZERO));
    const yawW = clamp01((cosYaw - cfg.COS_YAW_ZERO) / (cfg.COS_YAW_FULL - cfg.COS_YAW_ZERO));
    let w = hasSpan ? visW * yawW : 0;
    const reasons: string[] = [];
    if (w >= 0.5) this.lastGoodT = t;
    const lowFor = this.lastGoodT === null ? Infinity : t - this.lastGoodT;
    if (hasSpan && w < 1) {
      reasons.push(`weight ${w.toFixed(2)} (vis ${obs.visibility.toFixed(2)}, yaw ${((obs.yawRad * 180) / Math.PI).toFixed(0)}°)`);
      if (w < 0.5 && lowFor > cfg.LOW_WEIGHT_TIMEOUT_MS) {
        w = 1;
        reasons.push(`low weight > ${cfg.LOW_WEIGHT_TIMEOUT_MS} ms: instant estimate`);
      } else {
        reasons.push('blending toward last value');
      }
    }
    if (!hasSpan) reasons.push('no shoulder span: last value');

    let target: number;
    if (zInst === null) target = this.zLast ?? this.clampZ((fx * this.breadthM) / 200);
    else if (this.zLast === null) target = zInst;
    else target = this.zLast + w * (zInst - this.zLast);

    if (this.zLast !== null) {
      const maxStep = cfg.MAX_RATE_MPS * dt;
      if (Math.abs(target - this.zLast) > maxStep) {
        target = this.zLast + Math.sign(target - this.zLast) * maxStep;
        reasons.push('rate-limited');
      }
    }
    const z = this.clampZ(this.filter.filter(target, t));
    this.zLast = target;

    const est: DistanceEstimate = {
      distanceM: z,
      mode: this.metric ? 'metric' : 'approximate',
      confidence: (this.metric ? 0.9 : 0.55) * (hasSpan ? Math.max(w, 0.1) : 0.1),
      rawSpanPx: obs.shoulderSpanPx,
      correctedSpanPx: hasSpan ? S : NaN,
      instantDistanceM: zInst,
      weight: w,
      referenceSpanPx: null,
      referenceDistanceM: null,
      samplesCollected: 0,
      samplesRequired: 0,
      lastWindowSpread: null,
      shoulderBreadthM: this.breadthM,
      breadthSource: this.breadthSource,
      yawRad: obs.yawRad,
      reason: reasons.length ? reasons.join('; ') : null,
    };
    this.last = est;
    return est;
  }

  getLastEstimate(): DistanceEstimate | null {
    return this.last;
  }

  private clampZ(z: number): number {
    return Math.min(this.cfg.MAX_DISTANCE_M, Math.max(this.cfg.MIN_DISTANCE_M, z));
  }
}
