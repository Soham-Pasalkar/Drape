/**
 * DRAPE Fitting Engine
 *
 * Runs once per NEW pose frame (not per render frame) and produces everything the scene needs
 * in explicitly named spaces:
 *
 *   keypoints (normalized, unmirrored) ──► image pixels ──► shoulder span S, yaw
 *        │                                                    │
 *        │                         ShoulderDistanceEstimator ─┴─► Z, mode, B
 *        │                                                    │
 *        ├─► BodyProportionEstimator (scale-free ratios) ─────┴─► BodyShape (metres)
 *        │
 *        ├─► RobustPnP(body-local model points ↔ pixels, priors) ─► T_body→camera
 *        │
 *        └─► world landmarks ─► camera axes ─► R⁻¹ ─► body-local arm / leg directions
 *
 * The garment transform is NOT computed here: the scene derives it from T_body→camera and the
 * semantic anchors (garment-rig.ts), so there is exactly one place where anchors are applied.
 */

import * as THREE from 'three';
import {
  BodyKeypoints,
  GarmentMetadata,
  Transform3D,
  BodyMeasurements,
  GarmentEase,
  OperatingMode,
  FramingGuidance,
  MHRJointName,
  LandmarkPoint,
} from './types';
import { CameraCalibrationManager } from './camera-calibration';
import { ShoulderDistanceEstimator, DistanceEstimate } from './distance-estimator';
import { OperatingModeManager } from './operating-modes';
import { PersonalizedBodyShapeEstimator } from './personalized-body-shape';
import { RobustPnPSolver, PnPResult, PnPCorrespondence, torsoRotationFromWorld, torsoRotationFromImage } from './robust-pnp';
import { GarmentEaseEngine } from './garment-ease';
import { BodyShape } from './mhr-body-proxy';
import { normalizedPixelDistance, worldLandmarkToCameraAxes, imageToCamera } from './coordinates';

export interface RigidPose3D {
  position: [number, number, number];
  quaternion: [number, number, number, number];
  scale: [number, number, number];
}

/** Scale-free body proportions, collected while the subject is frontal. */
export const PROPORTION_CONFIG = {
  WINDOW: 30,
  MAX_YAW_RAD: 0.35,
  MIN_HIP_VISIBILITY: 0.5,
  /** Population defaults: hip-landmark / shoulder-landmark breadth, torso length / shoulder breadth. */
  DEFAULT_HIP_RATIO: 0.75,
  DEFAULT_TORSO_RATIO: 1.39,
  HIP_RATIO_RANGE: [0.55, 1.05] as [number, number],
  TORSO_RATIO_RANGE: [1.0, 1.8] as [number, number],
};

/** Joint visibility needed before a limb direction is trusted. */
export const LIMB_MIN_VISIBILITY = 0.5;

export class BodyProportionEstimator {
  private hip: number[] = [];
  private torso: number[] = [];
  hipRatio = PROPORTION_CONFIG.DEFAULT_HIP_RATIO;
  torsoRatio = PROPORTION_CONFIG.DEFAULT_TORSO_RATIO;
  source: 'population_prior' | 'observed' = 'population_prior';
  /** Bumped whenever the frozen ratios change. */
  version = 0;

  reset(): void {
    this.hip = [];
    this.torso = [];
    this.hipRatio = PROPORTION_CONFIG.DEFAULT_HIP_RATIO;
    this.torsoRatio = PROPORTION_CONFIG.DEFAULT_TORSO_RATIO;
    this.source = 'population_prior';
    this.version++;
  }

  observe(hipOverShoulder: number, torsoOverShoulder: number, yaw: number, hipVisibility: number): void {
    if (this.source === 'observed') return;
    if (Math.abs(yaw) > PROPORTION_CONFIG.MAX_YAW_RAD || hipVisibility < PROPORTION_CONFIG.MIN_HIP_VISIBILITY) return;
    const [h0, h1] = PROPORTION_CONFIG.HIP_RATIO_RANGE;
    const [t0, t1] = PROPORTION_CONFIG.TORSO_RATIO_RANGE;
    if (hipOverShoulder < h0 || hipOverShoulder > h1 || torsoOverShoulder < t0 || torsoOverShoulder > t1) return;
    this.hip.push(hipOverShoulder);
    this.torso.push(torsoOverShoulder);
    if (this.hip.length >= PROPORTION_CONFIG.WINDOW) {
      const med = (a: number[]) => [...a].sort((x, y) => x - y)[a.length >> 1];
      this.hipRatio = med(this.hip);
      this.torsoRatio = med(this.torso);
      this.source = 'observed';
      this.version++;
    }
  }
}

export interface TrackingDiagnostics {
  shoulderSpanPx: number;
  shoulderVisibility: number;
  hipVisibility: number;
  landmarkConfidence: number;
  yawRad: number;
  yawSource: 'world_landmarks' | 'image_depth' | 'none';
  /** EMA of the frame-to-frame shoulder-centre motion in pixels (jitter + real motion). */
  landmarkJitterPx: number;
  proportionSource: 'population_prior' | 'observed';
}

export interface DetailedFittingResult {
  /** body-local → camera. */
  bodyPose: RigidPose3D;
  bodyShape: BodyShape;
  /** Fit scale applied about the garment anchor (≥ 1 only from reliable negative ease). */
  garmentScale: [number, number, number];
  /** Unit upper-arm directions (shoulder→elbow), body-local (null = not visible). */
  armDirectionsBody: { left: [number, number, number] | null; right: [number, number, number] | null };
  /**
   * Unit shoulder→wrist chords, body-local. A rigid full-length sleeve cannot bend at the
   * elbow; aiming it along the chord keeps the cuff at the wrist when the arm is bent.
   */
  fullArmDirectionsBody: { left: [number, number, number] | null; right: [number, number, number] | null };
  /** Body-local joint positions for limb occlusion / collision capsules. */
  limbJoints: Partial<Record<MHRJointName, [number, number, number]>>;
  pnpResult: PnPResult;
  distance: DistanceEstimate;
  measurements: BodyMeasurements;
  ease: GarmentEase;
  operatingMode: OperatingMode;
  framingGuidance: FramingGuidance;
  framingMessage: string;
  isEligibleForGarment: boolean;
  estimatedDistanceZ: number;
  tracking: TrackingDiagnostics;
  fitDurationMs: number;
  /** Backward-compatible Euler view of the body pose. */
  transform: Transform3D;
}

const toTuple = (v: THREE.Vector3): [number, number, number] => [v.x, v.y, v.z];

export class FittingEngine {
  public calibrationManager: CameraCalibrationManager;
  public distanceEstimator: ShoulderDistanceEstimator;
  public proportionEstimator: BodyProportionEstimator;
  public operatingModeManager: OperatingModeManager;
  public shapeEstimator: PersonalizedBodyShapeEstimator;
  public pnpSolver: RobustPnPSolver;
  public easeEngine: GarmentEaseEngine;

  private latestMeasurements: BodyMeasurements | null = null;
  private latestEase: GarmentEase | null = null;
  private lastShoulderCenterPx: { x: number; y: number } | null = null;
  private jitterEma = 0;
  private streamSize = { width: 0, height: 0 };

  constructor(initialWidth = 1280, initialHeight = 720) {
    this.calibrationManager = new CameraCalibrationManager(initialWidth, initialHeight);
    this.distanceEstimator = new ShoulderDistanceEstimator();
    this.proportionEstimator = new BodyProportionEstimator();
    this.operatingModeManager = new OperatingModeManager();
    this.shapeEstimator = new PersonalizedBodyShapeEstimator();
    this.pnpSolver = new RobustPnPSolver();
    this.easeEngine = new GarmentEaseEngine();
  }

  /** Clears all per-subject / per-camera state (reference pose, proportions, temporal priors). */
  resetSubjectState(): void {
    this.distanceEstimator.resetReference();
    this.proportionEstimator.reset();
    this.pnpSolver.reset();
    this.lastShoulderCenterPx = null;
    this.jitterEma = 0;
  }

  /**
   * Process one pose frame. `streamWidth/Height` are video.videoWidth/videoHeight; landmark
   * coordinates are interpreted in that unmirrored frame. Mirroring is a display concern only.
   */
  processFrame(
    keypoints: BodyKeypoints,
    garment: GarmentMetadata,
    streamWidth: number,
    streamHeight: number
  ): DetailedFittingResult {
    const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();

    // 1. Camera configuration change ⇒ previous reference is meaningless.
    if (this.streamSize.width !== streamWidth || this.streamSize.height !== streamHeight) {
      if (this.streamSize.width !== 0) this.resetSubjectState();
      this.streamSize = { width: streamWidth, height: streamHeight };
    }
    this.calibrationManager.updateResolution(streamWidth, streamHeight);
    const K = this.calibrationManager.getIntrinsics();
    const W = streamWidth;
    const H = streamHeight;
    const px = (p: { x: number; y: number }) => ({ x: p.x * W, y: p.y * H });

    const ls = keypoints.leftShoulder, rs = keypoints.rightShoulder;
    const lh = keypoints.leftHip, rh = keypoints.rightHip;
    const shoulderVis = Math.min(ls.visibility ?? 1, rs.visibility ?? 1);
    const hipVis = Math.min(lh.visibility ?? 0, rh.visibility ?? 0);
    const world = keypoints.worldLandmarks;

    // 2. Shoulder span in true pixels and subject yaw.
    const shoulderSpanPx = normalizedPixelDistance(ls, rs, W, H);
    let yaw = 0;
    let yawSource: TrackingDiagnostics['yawSource'] = 'none';
    let worldShoulderBreadth: number | undefined;
    if (world && world[11] && world[12]) {
      const c = worldLandmarkToCameraAxes({ x: world[11].x - world[12].x, y: world[11].y - world[12].y, z: world[11].z - world[12].z });
      worldShoulderBreadth = c.length();
      yaw = Math.atan2(-c.z, c.x);
      yawSource = 'world_landmarks';
    } else {
      // MediaPipe image z uses roughly the same scale as x (normalized by width).
      const dx = (ls.x - rs.x) * W;
      const dz = (ls.z - rs.z) * W;
      yaw = Math.atan2(dz, dx);
      yawSource = 'image_depth';
    }

    // 3. Distance.
    const timestampMs = keypoints.timestamp ?? t0;
    const distance = this.distanceEstimator.update(
      { shoulderSpanPx, yawRad: yaw, visibility: shoulderVis, worldShoulderBreadthM: worldShoulderBreadth, timestampMs },
      K.fx
    );

    // 4. Body proportions (scale-free) → body shape in metres.
    const cosYaw = Math.max(Math.cos(yaw), 0.5);
    const shoulderCenterPx = { x: ((ls.x + rs.x) / 2) * W, y: ((ls.y + rs.y) / 2) * H };
    const hipCenterPx = { x: ((lh.x + rh.x) / 2) * W, y: ((lh.y + rh.y) / 2) * H };
    const hipSpanPx = normalizedPixelDistance(lh, rh, W, H);
    const torsoPx = Math.hypot(shoulderCenterPx.x - hipCenterPx.x, shoulderCenterPx.y - hipCenterPx.y);
    const correctedShoulder = shoulderSpanPx / cosYaw;
    if (correctedShoulder > 1) {
      this.proportionEstimator.observe(hipSpanPx / cosYaw / correctedShoulder, torsoPx / correctedShoulder, yaw, hipVis);
    }
    const B = distance.shoulderBreadthM;
    const scaleSource = distance.mode === 'metric' ? 'known_distance' : 'anthropometric_prior';
    const measurementsFull = this.shapeEstimator.estimateFromBodyModel({
      shoulderBreadthM: B,
      hipBreadthM: B * this.proportionEstimator.hipRatio,
      torsoLengthM: B * this.proportionEstimator.torsoRatio,
      scaleSource,
      shoulderVisibility: shoulderVis,
      hipVisibility: hipVis,
    });
    const { semiAxes, ...measurements } = measurementsFull;
    const bodyShape: BodyShape = {
      shoulderBreadthM: B,
      hipBreadthM: B * this.proportionEstimator.hipRatio,
      torsoLengthM: B * this.proportionEstimator.torsoRatio,
      chest: semiAxes.chest,
      waist: semiAxes.waist,
      hips: semiAxes.hips,
    };
    this.latestMeasurements = measurements;

    // 5. Ease (fit verdict + only fit-driven scaling).
    const ease = this.easeEngine.evaluateFit(garment, measurements);
    this.latestEase = ease;
    const stretch = this.easeEngine.computeStretchScale(garment, measurements, ease);
    const garmentScale: [number, number, number] = [stretch, 1, stretch];

    // 6. PnP: body-local model points from the same body shape the scene uses.
    const model = (name: 'left_shoulder' | 'right_shoulder' | 'left_hip' | 'right_hip') => {
      const s = bodyShape;
      switch (name) {
        case 'left_shoulder': return new THREE.Vector3(s.shoulderBreadthM / 2, s.torsoLengthM / 2, 0);
        case 'right_shoulder': return new THREE.Vector3(-s.shoulderBreadthM / 2, s.torsoLengthM / 2, 0);
        case 'left_hip': return new THREE.Vector3(s.hipBreadthM / 2, -s.torsoLengthM / 2, 0);
        case 'right_hip': return new THREE.Vector3(-s.hipBreadthM / 2, -s.torsoLengthM / 2, 0);
      }
    };
    const correspondences: PnPCorrespondence[] = [
      { name: 'left_shoulder', model: model('left_shoulder'), image: px(ls), weight: ls.visibility ?? 1 },
      { name: 'right_shoulder', model: model('right_shoulder'), image: px(rs), weight: rs.visibility ?? 1 },
      { name: 'left_hip', model: model('left_hip'), image: px(lh), weight: lh.visibility ?? 0 },
      { name: 'right_hip', model: model('right_hip'), image: px(rh), weight: rh.visibility ?? 0 },
    ];
    const worldRot = world ? torsoRotationFromWorld(world) : null;
    const pnp = this.pnpSolver.solve(correspondences, K, {
      rotation: worldRot
        ? { q: worldRot, sigmaRad: 0.15 }
        : { q: torsoRotationFromImage(px(ls), px(rs)), sigmaRad: 0.6 },
      depth: { distanceM: distance.distanceM, sigmaM: Math.max(0.05, 0.1 * distance.distanceM) },
    });
    const qRoot = new THREE.Quaternion(...pnp.rootRotation);
    const pRoot = new THREE.Vector3(...pnp.rootPosition);
    const invRoot = qRoot.clone().invert();

    // 7. Limb directions: one consistent 3D space (world landmarks → camera axes → body-local).
    const segmentDirBody = (a: number, b: number, aKp: LandmarkPoint | undefined, bKp: LandmarkPoint | undefined): THREE.Vector3 | null => {
      if (!aKp || !bKp || (aKp.visibility ?? 0) < LIMB_MIN_VISIBILITY || (bKp.visibility ?? 0) < LIMB_MIN_VISIBILITY) return null;
      let d: THREE.Vector3;
      if (world && world[a] && world[b]) {
        d = worldLandmarkToCameraAxes({ x: world[b].x - world[a].x, y: world[b].y - world[a].y, z: world[b].z - world[a].z });
      } else {
        // No 3D prior: direction in the image plane only (depth component unknown ⇒ 0).
        d = new THREE.Vector3((bKp.x - aKp.x) * W, -(bKp.y - aKp.y) * H, 0);
      }
      if (d.lengthSq() < 1e-10) return null;
      return d.normalize().applyQuaternion(invRoot);
    };
    const segmentLength = (a: number, b: number, fallback: number) => {
      if (world && world[a] && world[b] && worldShoulderBreadth && worldShoulderBreadth > 0.1) {
        const l = Math.hypot(world[b].x - world[a].x, world[b].y - world[a].y, world[b].z - world[a].z);
        return l * (B / worldShoulderBreadth); // rescale into the body model's metric frame
      }
      return fallback;
    };

    const lUpper = segmentDirBody(11, 13, ls, keypoints.leftElbow);
    const rUpper = segmentDirBody(12, 14, rs, keypoints.rightElbow);
    const lFore = segmentDirBody(13, 15, keypoints.leftElbow, keypoints.leftWrist);
    const rFore = segmentDirBody(14, 16, keypoints.rightElbow, keypoints.rightWrist);
    const lChord = segmentDirBody(11, 15, ls, keypoints.leftWrist);
    const rChord = segmentDirBody(12, 16, rs, keypoints.rightWrist);
    const lThigh = segmentDirBody(23, 25, lh, keypoints.leftKnee);
    const rThigh = segmentDirBody(24, 26, rh, keypoints.rightKnee);

    const limbJoints: Partial<Record<MHRJointName, [number, number, number]>> = {};
    const chain = (
      startName: MHRJointName,
      start: THREE.Vector3,
      segs: [MHRJointName, THREE.Vector3 | null, number][]
    ) => {
      limbJoints[startName] = toTuple(start);
      let cur = start.clone();
      for (const [name, dir, len] of segs) {
        if (!dir) break;
        cur = cur.clone().addScaledVector(dir, len);
        limbJoints[name] = toTuple(cur);
      }
    };
    chain('left_shoulder', model('left_shoulder'), [
      ['left_elbow', lUpper, segmentLength(11, 13, 0.28)],
      ['left_wrist', lFore, segmentLength(13, 15, 0.25)],
    ]);
    chain('right_shoulder', model('right_shoulder'), [
      ['right_elbow', rUpper, segmentLength(12, 14, 0.28)],
      ['right_wrist', rFore, segmentLength(14, 16, 0.25)],
    ]);
    chain('left_hip', model('left_hip'), [['left_knee', lThigh, segmentLength(23, 25, 0.42)]]);
    chain('right_hip', model('right_hip'), [['right_knee', rThigh, segmentLength(24, 26, 0.42)]]);

    // Image-consistent limb joints: the 3D chain supplies only DEPTH (a prior); each joint is
    // re-placed on the camera ray through its observed landmark pixel at that depth. 2D
    // landmarks are far more accurate than world-landmark lateral positions, so occlusion
    // capsules then project exactly onto the real arm instead of punching holes beside it.
    const kpOf: Partial<Record<MHRJointName, LandmarkPoint | undefined>> = {
      left_elbow: keypoints.leftElbow, left_wrist: keypoints.leftWrist,
      right_elbow: keypoints.rightElbow, right_wrist: keypoints.rightWrist,
      left_knee: keypoints.leftKnee, right_knee: keypoints.rightKnee,
    };
    if (pnp.valid) {
      const P = new THREE.Vector3();
      for (const [name, kp] of Object.entries(kpOf) as [MHRJointName, LandmarkPoint | undefined][]) {
        const j = limbJoints[name];
        if (!j || !kp) continue;
        P.set(j[0], j[1], j[2]).applyQuaternion(qRoot).add(pRoot); // body-local → camera
        const depth = -P.z;
        if (!(depth > 0.1)) continue;
        imageToCamera(px(kp), depth, K, P);
        P.sub(pRoot).applyQuaternion(invRoot); // camera → body-local
        limbJoints[name] = toTuple(P);
      }
    }

    // 8. Framing.
    const framingEval = this.operatingModeManager.evaluate(keypoints, distance.distanceM, garment.category);

    // 9. Tracking diagnostics.
    if (this.lastShoulderCenterPx) {
      const m = Math.hypot(shoulderCenterPx.x - this.lastShoulderCenterPx.x, shoulderCenterPx.y - this.lastShoulderCenterPx.y);
      this.jitterEma = this.jitterEma * 0.9 + m * 0.1;
    }
    this.lastShoulderCenterPx = shoulderCenterPx;

    const euler = new THREE.Euler().setFromQuaternion(qRoot, 'ZYX');
    const fitDurationMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0;

    return {
      bodyPose: { position: toTuple(pRoot), quaternion: [qRoot.x, qRoot.y, qRoot.z, qRoot.w], scale: [1, 1, 1] },
      bodyShape,
      garmentScale,
      armDirectionsBody: { left: lUpper ? toTuple(lUpper) : null, right: rUpper ? toTuple(rUpper) : null },
      fullArmDirectionsBody: { left: lChord ? toTuple(lChord) : null, right: rChord ? toTuple(rChord) : null },
      limbJoints,
      pnpResult: pnp,
      distance,
      measurements,
      ease,
      operatingMode: framingEval.mode,
      framingGuidance: framingEval.guidance,
      framingMessage: framingEval.guidanceMessage,
      isEligibleForGarment: framingEval.isEligibleForGarment && pnp.valid,
      estimatedDistanceZ: distance.distanceM,
      tracking: {
        shoulderSpanPx,
        shoulderVisibility: shoulderVis,
        hipVisibility: hipVis,
        landmarkConfidence: keypoints.confidence,
        yawRad: yaw,
        yawSource,
        landmarkJitterPx: this.jitterEma,
        proportionSource: this.proportionEstimator.source,
      },
      fitDurationMs,
      transform: {
        position: toTuple(pRoot),
        rotation: [euler.x, euler.y, euler.z],
        scale: garmentScale,
      },
    };
  }

  getMeasurements(): BodyMeasurements | null {
    return this.latestMeasurements;
  }

  getEase(): GarmentEase | null {
    return this.latestEase;
  }
}
