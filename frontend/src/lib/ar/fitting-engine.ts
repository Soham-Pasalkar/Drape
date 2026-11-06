/**
 * DRAPE Garment Fitting Engine (Parametric Architecture)
 *
 * Coordinates:
 * 1. Calibrated Camera Pinhole Model & Metric Scale
 * 2. Relative Distance Tracking Z(t) with Yaw Correction
 * 3. Operating Mode & Framing Evaluation (Collar, Bust, Full-Body)
 * 4. Personalized Anthropometric Shape Reconstruction
 * 5. Robust PnP Body-Root & Joint Kinematics Solver
 * 6. Garment Ease & Physical Stretch Strain Estimation
 */

import * as THREE from 'three';
import {
  BodyKeypoints,
  GarmentMetadata,
  Transform3D,
  CameraIntrinsics,
  BodyMeasurements,
  GarmentEase,
  OperatingMode,
  FramingGuidance,
  MHRJointName,
} from './types';
import { CameraCalibrationManager } from './camera-calibration';
import { OperatingModeManager } from './operating-modes';
import { PersonalizedBodyShapeEstimator } from './personalized-body-shape';
import { RobustPnPSolver, PnPResult } from './robust-pnp';
import { GarmentEaseEngine } from './garment-ease';

export interface RigidPose3D {
  position: [number, number, number];
  quaternion: [number, number, number, number];
  scale: [number, number, number];
}

export interface CameraProjectionContext {
  fov?: number;
  aspectRatio: number;
  cameraZ?: number;
  isMirrored?: boolean;
}

export interface DetailedFittingResult {
  transform: Transform3D;
  garmentPose: RigidPose3D;
  bodyPose: RigidPose3D;
  limbJoints: Partial<Record<MHRJointName, [number, number, number]>>;
  pnpResult: PnPResult;
  measurements: BodyMeasurements;
  ease: GarmentEase;
  operatingMode: OperatingMode;
  framingGuidance: FramingGuidance;
  framingMessage: string;
  isEligibleForGarment: boolean;
  estimatedDistanceZ: number;
}

export class FittingEngine {
  public calibrationManager: CameraCalibrationManager;
  public operatingModeManager: OperatingModeManager;
  public shapeEstimator: PersonalizedBodyShapeEstimator;
  public pnpSolver: RobustPnPSolver;
  public easeEngine: GarmentEaseEngine;

  private latestMeasurements: BodyMeasurements | null = null;
  private latestEase: GarmentEase | null = null;

  constructor() {
    this.calibrationManager = new CameraCalibrationManager(1280, 720);
    this.operatingModeManager = new OperatingModeManager();
    this.shapeEstimator = new PersonalizedBodyShapeEstimator();
    this.pnpSolver = new RobustPnPSolver();
    this.easeEngine = new GarmentEaseEngine();
  }

  /**
   * Complete parametric pipeline execution on a processed video frame.
   */
  processFrame(
    keypoints: BodyKeypoints,
    garment: GarmentMetadata,
    streamWidth: number,
    streamHeight: number,
    isMirrored = true
  ): DetailedFittingResult {
    // 1. Update camera stream resolution in calibration manager
    this.calibrationManager.updateResolution(streamWidth, streamHeight);
    const intrinsics = this.calibrationManager.getIntrinsics();

    // 2. Track relative camera distance Z(t)
    const shoulderSpanPx = keypoints.shoulderWidth * streamWidth;
    const bodyYaw = (keypoints.rightShoulder.z - keypoints.leftShoulder.z) * 0.8;
    const distanceZ = this.calibrationManager.estimateCameraDistance(
      shoulderSpanPx,
      bodyYaw,
      keypoints.confidence
    );

    // 3. Evaluate Camera Operating Mode & Framing Guidance
    const framingEval = this.operatingModeManager.evaluate(
      keypoints,
      distanceZ,
      garment.category
    );

    // 4. Personalized Body Shape Reconstruction
    const measurements = this.shapeEstimator.estimateMeasurements(
      keypoints,
      distanceZ,
      intrinsics
    );
    this.latestMeasurements = measurements;

    // 5. Garment Ease & Physical Fit Evaluation
    const ease = this.easeEngine.evaluateFit(garment, measurements);
    this.latestEase = ease;

    // 6. Robust PnP Body-Root & Joint Rotation Estimation
    const pnp = this.pnpSolver.solve(keypoints, intrinsics, distanceZ, isMirrored);

    const qRoot = new THREE.Quaternion(
      pnp.rootRotation[0],
      pnp.rootRotation[1],
      pnp.rootRotation[2],
      pnp.rootRotation[3]
    );
    const pRoot = new THREE.Vector3(
      pnp.rootPosition[0],
      pnp.rootPosition[1],
      pnp.rootPosition[2]
    );

    // 7. Anatomical Anchor Placement in Camera Space
    // Local body offsets: shoulders at y=+0.22m, waist at y=-0.08m
    let localAnchor: THREE.Vector3;
    if (garment.category === 'skirts') {
      localAnchor = new THREE.Vector3(0, -0.08, 0.005);
    } else {
      // tops and dresses anchor at shoulder center
      localAnchor = new THREE.Vector3(0, 0.22, 0.015);
    }

    const worldAnchorOffset = localAnchor.clone().applyQuaternion(qRoot);
    const garmentCamPos = pRoot.clone().add(worldAnchorOffset);

    // Anthropometric Scale Factors
    let scaleX = 1.0;
    let scaleY = 1.0;
    let scaleZ = 1.0;

    if (garment.category === 'skirts') {
      const refWaist = garment.dimensions.waistCm || 72;
      const refHips = garment.dimensions.hipsCm || 96;
      scaleX = Math.min(1.25, Math.max(0.85, measurements.hipCircumferenceCm / refHips));
      scaleZ = Math.min(1.25, Math.max(0.85, measurements.waistCircumferenceCm / refWaist));
    } else {
      const refShoulder = garment.dimensions.shoulderSpanCm || 46;
      const refChest = garment.dimensions.chestCm || 98;
      let easeFactor = 1.0;
      if (measurements.chestCircumferenceCm > 0) {
        easeFactor = Math.min(1.15, Math.max(0.90, refChest / measurements.chestCircumferenceCm));
      }
      scaleX = Math.min(1.25, Math.max(0.85, (measurements.shoulderBreadthCm / refShoulder) * easeFactor));
      scaleZ = Math.min(1.25, Math.max(0.85, (measurements.chestCircumferenceCm / refChest) * easeFactor));
    }

    const garmentPose: RigidPose3D = {
      position: [garmentCamPos.x, garmentCamPos.y, garmentCamPos.z],
      quaternion: [qRoot.x, qRoot.y, qRoot.z, qRoot.w],
      scale: [scaleX, scaleY, scaleZ],
    };

    const bodyPose: RigidPose3D = {
      position: [pRoot.x, pRoot.y, pRoot.z],
      quaternion: [qRoot.x, qRoot.y, qRoot.z, qRoot.w],
      scale: [1, 1, 1],
    };

    // Calculate local joint positions for limb occlusion capsules
    const invQRoot = qRoot.clone().invert();
    const limbJoints: Partial<Record<MHRJointName, [number, number, number]>> = {};

    const projectJointToLocal = (kp: { x: number; y: number; z?: number } | undefined): [number, number, number] | null => {
      if (!kp) return null;
      const u = isMirrored ? (1.0 - kp.x) * intrinsics.width : kp.x * intrinsics.width;
      const v = kp.y * intrinsics.height;
      const ptCamZ = -(distanceZ + (kp.z ?? 0) * 0.35);
      const ptCamX = ((u - intrinsics.cx) * Math.abs(ptCamZ)) / intrinsics.fx;
      const ptCamY = -((v - intrinsics.cy) * Math.abs(ptCamZ)) / intrinsics.fy;

      const ptCam = new THREE.Vector3(ptCamX, ptCamY, ptCamZ);
      const ptLocal = ptCam.sub(pRoot).applyQuaternion(invQRoot);
      return [ptLocal.x, ptLocal.y, ptLocal.z];
    };

    const leftShoulderLocal = projectJointToLocal(keypoints.leftShoulder);
    const leftElbowLocal = projectJointToLocal(keypoints.leftElbow);
    const leftWristLocal = projectJointToLocal(keypoints.leftWrist);
    const rightShoulderLocal = projectJointToLocal(keypoints.rightShoulder);
    const rightElbowLocal = projectJointToLocal(keypoints.rightElbow);
    const rightWristLocal = projectJointToLocal(keypoints.rightWrist);

    if (leftShoulderLocal) limbJoints.left_shoulder = leftShoulderLocal;
    if (leftElbowLocal) limbJoints.left_elbow = leftElbowLocal;
    if (leftWristLocal) limbJoints.left_wrist = leftWristLocal;
    if (rightShoulderLocal) limbJoints.right_shoulder = rightShoulderLocal;
    if (rightElbowLocal) limbJoints.right_elbow = rightElbowLocal;
    if (rightWristLocal) limbJoints.right_wrist = rightWristLocal;

    // Backward compatible Euler transform
    const euler = new THREE.Euler().setFromQuaternion(qRoot, 'ZYX');
    const transform: Transform3D = {
      position: [garmentCamPos.x, garmentCamPos.y, garmentCamPos.z],
      rotation: [euler.x, euler.y, euler.z],
      scale: [scaleX, scaleY, scaleZ],
    };

    return {
      transform,
      garmentPose,
      bodyPose,
      limbJoints,
      pnpResult: pnp,
      measurements,
      ease,
      operatingMode: framingEval.mode,
      framingGuidance: framingEval.guidance,
      framingMessage: framingEval.guidanceMessage,
      isEligibleForGarment: framingEval.isEligibleForGarment,
      estimatedDistanceZ: distanceZ,
    };
  }

  /**
   * Backward-compatible transform calculator.
   */
  calculateTransform(
    keypoints: BodyKeypoints,
    garment: GarmentMetadata,
    ctx: CameraProjectionContext
  ): Transform3D {
    const isMirrored = ctx.isMirrored !== false;
    const streamWidth = 1280;
    const streamHeight = Math.round(1280 / (ctx.aspectRatio || (16 / 9)));

    const result = this.processFrame(
      keypoints,
      garment,
      streamWidth,
      streamHeight,
      isMirrored
    );

    return result.transform;
  }

  getMeasurements(): BodyMeasurements | null {
    return this.latestMeasurements;
  }

  getEase(): GarmentEase | null {
    return this.latestEase;
  }
}
