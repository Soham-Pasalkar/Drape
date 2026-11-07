/**
 * DRAPE Shoulder-Span Distance Estimator
 *
 * A monocular webcam observes the *angular* size of the shoulders, S = fx · B / Z, where B is
 * the physical shoulder-landmark breadth and Z the distance. Only B/Z is observable, so the
 * absolute distance needs one metric assumption:
 *
 *   relative mode:  B comes from MediaPipe world landmarks (a learned human-scale prior) or,
 *                   if unavailable, from POPULATION_SHOULDER_BREADTH_M. Z0 = fx · B / S0.
 *   metric mode:    the user supplies the true distance Z0 at the reference pose.
 *
 * Tracking then follows Z(t) = Z0 · S0 / S(t), with S yaw-corrected: S = S_px / cos(yaw).
 *
 * Reference lifecycle (automatic — no manual call required):
 *   1. Collect yaw-corrected spans while shoulders are visible (≥ MIN_VISIBILITY) and the
 *      subject is roughly frontal (|yaw| ≤ MAX_REFERENCE_YAW_RAD).
 *   2. When REFERENCE_WINDOW samples are collected and their relative MAD is
 *      ≤ MAX_REFERENCE_SPREAD, S0 = median. Otherwise the older half is discarded.
 *   3. resetReference() returns to step 1. The fitting engine calls it whenever the stream
 *      resolution changes (camera restart / switch).
 */

import { DistanceMode } from './types';

/** Average adult MediaPipe shoulder-landmark separation (≈ 0.9 × biacromial breadth). */
export const POPULATION_SHOULDER_BREADTH_M = 0.36;
/** Plausible range for world-landmark shoulder breadth; outside it the prior is used. */
export const WORLD_BREADTH_RANGE_M: [number, number] = [0.26, 0.48];

export const DISTANCE_ESTIMATOR_CONFIG = {
  /** Minimum per-shoulder landmark visibility to use a frame at all. */
  MIN_VISIBILITY: 0.65,
  /** Maximum subject yaw during reference collection (~20°). */
  MAX_REFERENCE_YAW_RAD: 0.35,
  /** Below cos(yaw) = 0.5 (|yaw| > 60°) the 1/cos correction is too ill-conditioned. */
  MIN_COS_YAW: 0.5,
  /** Frames required for the reference (~0.67 s at 30 fps). */
  REFERENCE_WINDOW: 20,
  /** Max relative median-absolute-deviation of spans inside the reference window. */
  MAX_REFERENCE_SPREAD: 0.03,
  /** A single-frame relative span jump above this is treated as an outlier… */
  OUTLIER_JUMP: 0.25,
  /** …unless it persists for this many consecutive frames (real motion). */
  OUTLIER_PERSIST_FRAMES: 5,
  /** Exponential smoothing time constant (seconds). */
  SMOOTHING_TAU_S: 0.2,
  /** Clamp to a plausible webcam operating range (metres). */
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
  /** |left − right| shoulder distance from world landmarks (metres), if available. */
  worldShoulderBreadthM?: number;
  timestampMs: number;
}

export type BreadthSource = 'world_landmarks' | 'population_prior' | 'known_distance';

export interface DistanceEstimate {
  distanceM: number;
  mode: DistanceMode;
  confidence: number;
  rawSpanPx: number;
  /** Yaw-corrected span S(t). */
  correctedSpanPx: number;
  referenceSpanPx: number | null;
  referenceDistanceM: number | null;
  /** Shoulder breadth B (metres) currently anchoring the scale. */
  shoulderBreadthM: number;
  breadthSource: BreadthSource;
  yawRad: number;
  samplesCollected: number;
  samplesRequired: number;
  /**
   * Diagnostic: why the estimate is not (yet) a live relative measurement this frame, or null when it is.
   * e.g. "visibility 0.58 < 0.65 (Z held)", "yaw 27° > 20° (sample not collected)",
   * "window unstable: spread 4.1% > 3% (older half dropped)", "collecting 12/20", "outlier hold 2/5".
   */
  reason: string | null;
  /** Relative MAD of the last full reference window (null until one was evaluated). */
  lastWindowSpread: number | null;
}

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : 0.5 * (s[m - 1] + s[m]);
}

function plausibleBreadth(b: number | undefined): b is number {
  return b !== undefined && Number.isFinite(b) && b >= WORLD_BREADTH_RANGE_M[0] && b <= WORLD_BREADTH_RANGE_M[1];
}

export class ShoulderDistanceEstimator {
  private readonly cfg = DISTANCE_ESTIMATOR_CONFIG;

  private samples: { span: number; breadth?: number }[] = [];
  private referenceSpan: number | null = null;
  private breadthM = POPULATION_SHOULDER_BREADTH_M;
  private breadthSource: BreadthSource = 'population_prior';
  private knownReferenceDistance: number | null = null;

  private smoothedZ: number | null = null;
  private lastAcceptedSpan: number | null = null;
  private pendingOutlierFrames = 0;
  private lastTimestampMs: number | null = null;
  private last: DistanceEstimate | null = null;
  private lastSpread: number | null = null;
  private reason: string | null = null;

  get isInitialized(): boolean {
    return this.referenceSpan !== null;
  }

  /** Discards the reference; the next stable window re-initializes it automatically. */
  resetReference(): void {
    this.samples = [];
    this.referenceSpan = null;
    this.breadthM = POPULATION_SHOULDER_BREADTH_M;
    this.breadthSource = 'population_prior';
    this.knownReferenceDistance = null;
    this.smoothedZ = null;
    this.lastSpread = null;
    this.reason = null;
    this.lastAcceptedSpan = null;
    this.pendingOutlierFrames = 0;
    this.lastTimestampMs = null;
    this.last = null;
  }

  /**
   * Upgrades a relative reference to metric by stating the true distance (metres) at which
   * the reference span S0 was recorded. Returns false if no reference exists yet.
   */
  setKnownReferenceDistance(distanceM: number, fx: number): boolean {
    if (this.referenceSpan === null || !(distanceM > 0)) return false;
    this.knownReferenceDistance = distanceM;
    this.breadthM = (distanceM * this.referenceSpan) / fx;
    this.breadthSource = 'known_distance';
    return true;
  }

  /** Z0 for the active reference. Recomputed per call so a new fx is honoured. */
  private referenceDistance(fx: number): number | null {
    if (this.referenceSpan === null) return null;
    if (this.knownReferenceDistance !== null) return this.knownReferenceDistance;
    return (fx * this.breadthM) / this.referenceSpan;
  }

  update(obs: ShoulderObservation, fx: number): DistanceEstimate {
    const cfg = this.cfg;
    const cosYaw = Math.cos(obs.yawRad);
    const dt =
      this.lastTimestampMs === null ? 1 / 30 : Math.max(0, (obs.timestampMs - this.lastTimestampMs) / 1000);
    this.lastTimestampMs = obs.timestampMs;

    const measurable =
      Number.isFinite(obs.shoulderSpanPx) &&
      obs.shoulderSpanPx > 1 &&
      obs.visibility >= cfg.MIN_VISIBILITY &&
      cosYaw >= cfg.MIN_COS_YAW;

    if (!measurable) {
      this.reason = !(Number.isFinite(obs.shoulderSpanPx) && obs.shoulderSpanPx > 1)
        ? 'no shoulder span (Z held)'
        : obs.visibility < cfg.MIN_VISIBILITY
        ? `visibility ${obs.visibility.toFixed(2)} < ${cfg.MIN_VISIBILITY} (Z held)`
        : `|yaw| ${((Math.abs(obs.yawRad) * 180) / Math.PI).toFixed(0)}° > 60° (Z held)`;
      return this.hold(obs, fx);
    }

    const S = obs.shoulderSpanPx / cosYaw;

    // ---- 1. Reference collection --------------------------------------------------------
    if (this.referenceSpan === null) {
      if (Math.abs(obs.yawRad) <= cfg.MAX_REFERENCE_YAW_RAD) {
        this.samples.push({ span: S, breadth: obs.worldShoulderBreadthM });
        if (this.samples.length > cfg.REFERENCE_WINDOW) this.samples.shift();
        this.reason = `collecting ${Math.min(this.samples.length, cfg.REFERENCE_WINDOW)}/${cfg.REFERENCE_WINDOW}`;
      } else {
        this.reason = `|yaw| ${((Math.abs(obs.yawRad) * 180) / Math.PI).toFixed(0)}° > ${((cfg.MAX_REFERENCE_YAW_RAD * 180) / Math.PI).toFixed(0)}° (sample not collected)`;
      }

      if (this.samples.length >= cfg.REFERENCE_WINDOW) {
        const spans = this.samples.map((s) => s.span);
        const med = median(spans);
        const spread = median(spans.map((v) => Math.abs(v - med))) / med;
        this.lastSpread = spread;
        if (spread <= cfg.MAX_REFERENCE_SPREAD) {
          this.referenceSpan = med;
          const breadths = this.samples.map((s) => s.breadth).filter(plausibleBreadth);
          if (breadths.length >= cfg.REFERENCE_WINDOW / 2) {
            this.breadthM = median(breadths);
            this.breadthSource = 'world_landmarks';
          } else {
            this.breadthM = POPULATION_SHOULDER_BREADTH_M;
            this.breadthSource = 'population_prior';
          }
          this.smoothedZ = this.referenceDistance(fx);
          this.lastAcceptedSpan = med;
          this.samples = [];
        } else {
          // Unstable window (subject moving): discard the older half and keep collecting.
          this.samples.splice(0, this.samples.length >> 1);
          this.reason = `window unstable: spread ${(spread * 100).toFixed(1)}% > ${(cfg.MAX_REFERENCE_SPREAD * 100).toFixed(0)}% (older half dropped)`;
        }
      }

      if (this.referenceSpan === null) {
        // Provisional value for rendering only; explicitly flagged as uninitialized.
        const b = plausibleBreadth(obs.worldShoulderBreadthM) ? obs.worldShoulderBreadthM : POPULATION_SHOULDER_BREADTH_M;
        const zProvisional = this.clampZ((fx * b) / S);
        this.smoothedZ = this.smooth(this.smoothedZ, zProvisional, dt, obs.visibility);
        return this.emit({
          distanceM: this.smoothedZ,
          mode: 'uninitialized',
          confidence: 0.2,
          rawSpanPx: obs.shoulderSpanPx,
          correctedSpanPx: S,
          referenceSpanPx: null,
          referenceDistanceM: null,
          shoulderBreadthM: b,
          breadthSource: plausibleBreadth(obs.worldShoulderBreadthM) ? 'world_landmarks' : 'population_prior',
          yawRad: obs.yawRad,
          samplesCollected: this.samples.length,
          samplesRequired: cfg.REFERENCE_WINDOW,
        });
      }
    }

    // ---- 2. Outlier rejection --------------------------------------------------------------
    if (this.lastAcceptedSpan !== null) {
      const jump = Math.abs(S - this.lastAcceptedSpan) / this.lastAcceptedSpan;
      if (jump > cfg.OUTLIER_JUMP) {
        this.pendingOutlierFrames++;
        if (this.pendingOutlierFrames < cfg.OUTLIER_PERSIST_FRAMES) {
          this.reason = `outlier hold ${this.pendingOutlierFrames}/${cfg.OUTLIER_PERSIST_FRAMES} (span jump ${(jump * 100).toFixed(0)}%)`;
          return this.hold(obs, fx);
        }
      }
    }
    this.pendingOutlierFrames = 0;
    this.lastAcceptedSpan = S;
    this.reason = null;

    // ---- 3. Relative tracking Z(t) = Z0 · S0 / S(t) ----------------------------------------
    const Z0 = this.referenceDistance(fx)!;
    const rawZ = this.clampZ((Z0 * this.referenceSpan!) / S);
    this.smoothedZ = this.smooth(this.smoothedZ, rawZ, dt, obs.visibility);

    const yawPenalty = Math.max(0, (cosYaw - cfg.MIN_COS_YAW) / (1 - cfg.MIN_COS_YAW));
    const metric = this.knownReferenceDistance !== null;
    return this.emit({
      distanceM: this.smoothedZ,
      mode: metric ? 'metric' : 'relative',
      // Relative mode is capped: its absolute scale rests on an anthropometric assumption.
      confidence: (metric ? 0.9 : 0.55) * obs.visibility * (0.5 + 0.5 * yawPenalty),
      rawSpanPx: obs.shoulderSpanPx,
      correctedSpanPx: S,
      referenceSpanPx: this.referenceSpan,
      referenceDistanceM: Z0,
      shoulderBreadthM: this.breadthM,
      breadthSource: this.breadthSource,
      yawRad: obs.yawRad,
      samplesCollected: cfg.REFERENCE_WINDOW,
      samplesRequired: cfg.REFERENCE_WINDOW,
    });
  }

  getLastEstimate(): DistanceEstimate | null {
    return this.last;
  }

  private hold(obs: ShoulderObservation, fx: number): DistanceEstimate {
    const Z0 = this.referenceDistance(fx);
    const z = this.smoothedZ ?? (Z0 ?? (fx * POPULATION_SHOULDER_BREADTH_M) / Math.max(obs.shoulderSpanPx, 1));
    return this.emit({
      distanceM: this.clampZ(z),
      mode: this.referenceSpan === null ? 'uninitialized' : 'low_confidence',
      confidence: 0.1,
      rawSpanPx: obs.shoulderSpanPx,
      correctedSpanPx: obs.shoulderSpanPx / Math.max(Math.cos(obs.yawRad), this.cfg.MIN_COS_YAW),
      referenceSpanPx: this.referenceSpan,
      referenceDistanceM: Z0,
      shoulderBreadthM: this.breadthM,
      breadthSource: this.breadthSource,
      yawRad: obs.yawRad,
      samplesCollected: this.referenceSpan === null ? this.samples.length : this.cfg.REFERENCE_WINDOW,
      samplesRequired: this.cfg.REFERENCE_WINDOW,
    });
  }

  private smooth(prev: number | null, target: number, dt: number, weight: number): number {
    if (prev === null) return target;
    const alpha = (1 - Math.exp(-dt / this.cfg.SMOOTHING_TAU_S)) * Math.min(1, Math.max(0, weight));
    return prev + (target - prev) * alpha;
  }

  private clampZ(z: number): number {
    return Math.min(this.cfg.MAX_DISTANCE_M, Math.max(this.cfg.MIN_DISTANCE_M, z));
  }

  private emit(e: Omit<DistanceEstimate, 'reason' | 'lastWindowSpread'>): DistanceEstimate {
    const full: DistanceEstimate = { ...e, reason: this.reason, lastWindowSpread: this.lastSpread };
    this.last = full;
    return full;
  }

}
