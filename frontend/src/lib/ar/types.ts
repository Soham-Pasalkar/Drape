/**
 * DRAPE 3D AR Virtual Try-On Engine Type Definitions
 *
 * Parametric Human Body Reconstruction + Garment-to-Body Registration +
 * Skeletal Deformation + XPBD Cloth Simulation
 */

export interface LandmarkPoint {
  x: number;
  y: number;
  z: number;
  visibility?: number;
  presence?: number;
}

export interface BodyKeypoints {
  nose?: LandmarkPoint;
  leftEye?: LandmarkPoint;
  rightEye?: LandmarkPoint;
  leftEar?: LandmarkPoint;
  rightEar?: LandmarkPoint;

  leftShoulder: LandmarkPoint;
  rightShoulder: LandmarkPoint;
  leftElbow: LandmarkPoint;
  rightElbow: LandmarkPoint;
  leftWrist: LandmarkPoint;
  rightWrist: LandmarkPoint;
  leftPinky?: LandmarkPoint;
  rightPinky?: LandmarkPoint;
  leftIndex?: LandmarkPoint;
  rightIndex?: LandmarkPoint;

  leftHip: LandmarkPoint;
  rightHip: LandmarkPoint;
  leftKnee?: LandmarkPoint;
  rightKnee?: LandmarkPoint;
  leftAnkle?: LandmarkPoint;
  rightAnkle?: LandmarkPoint;

  // Computed virtual anatomical centers
  shoulderCenter: LandmarkPoint;
  hipCenter: LandmarkPoint;
  torsoCenter: LandmarkPoint;
  waistCenter: LandmarkPoint;
  chestCenter: LandmarkPoint;

  // Proportions in normalized coordinates
  shoulderWidth: number;
  torsoHeight: number;
  hipWidth: number;
  confidence: number;

  // Smoothed MediaPipe world landmarks: hip-centred, metres, axes x→image right,
  // y→image down, z→away from camera. This is a learned *prior* on 3D pose, not
  // measured depth. Convert with worldLandmarkToCameraAxes() before use.
  worldLandmarks?: LandmarkPoint[];

  // performance.now() timestamp of the video frame these landmarks came from.
  timestamp?: number;
}

export type GarmentCategory = 'tops' | 'skirts' | 'dresses';

export interface CameraIntrinsics {
  fx: number;
  fy: number;
  cx: number;
  cy: number;
  width: number;
  height: number;
  k1?: number; // Radial distortion coefficient
  k2?: number;
  isCalibrated: boolean;
  calibrationMethod: 'card' | 'checkerboard' | 'prior' | 'uncalibrated';
  confidence: number;
}

export type OperatingMode = 'collar' | 'bust' | 'full-body';

export type FramingGuidance =
  | 'good_framing'
  | 'step_back'
  | 'move_closer'
  | 'center_body'
  | 'too_close'
  | 'calibrating';

export interface BodyMeasurements {
  heightCm: number;
  shoulderBreadthCm: number;
  chestCircumferenceCm: number;
  waistCircumferenceCm: number;
  hipCircumferenceCm: number;
  torsoLengthCm: number;
  armLengthCm: number;
  inseamCm: number;
  confidence: {
    overall: number;
    shoulders: number;
    chest: number;
    waist: number;
    hips: number;
  };
  isEstimated: boolean;
  /**
   * Where the metric scale comes from. A monocular webcam cannot observe absolute
   * body size: 'anthropometric_prior' means metres come from an assumed / learned
   * shoulder breadth; 'known_distance' means the user supplied a reference distance.
   */
  scaleSource?: 'anthropometric_prior' | 'known_distance';
  /** Approximate 1-sigma uncertainty of the circumference values, in cm. */
  uncertaintyCm?: number;
}

export interface ShapeParameters {
  beta: number[]; // PCA shape coefficient vector (dimension 10)
  timestamp: number;
}

export type MHRJointName =
  | 'pelvis'
  | 'spine_navel'
  | 'spine_chest'
  | 'neck'
  | 'head'
  | 'left_clavicle'
  | 'left_shoulder'
  | 'left_elbow'
  | 'left_wrist'
  | 'right_clavicle'
  | 'right_shoulder'
  | 'right_elbow'
  | 'right_wrist'
  | 'left_hip'
  | 'left_knee'
  | 'left_ankle'
  | 'right_hip'
  | 'right_knee'
  | 'right_ankle';

export interface JointTransform {
  name: MHRJointName;
  parent: MHRJointName | null;
  position: [number, number, number]; // local offset [x, y, z] in meters
  rotation: [number, number, number, number]; // local quaternion [x, y, z, w]
  worldPosition?: [number, number, number];
  worldRotation?: [number, number, number, number];
}

export interface BodyProxySkeleton {
  rootPosition: [number, number, number]; // Camera-space [x, y, z] in meters
  rootRotation: [number, number, number, number]; // Camera-space quaternion [x, y, z, w]
  joints: Record<MHRJointName, JointTransform>;
  estimatedDistanceZ: number;
}

export interface GarmentEase {
  chestEaseCm?: number;
  waistEaseCm?: number;
  hipEaseCm?: number;
  estimatedStrainPercent: number;
  isTooSmall: boolean;
  fitAssessment: 'relaxed' | 'tailored' | 'snug' | 'strained' | 'too_small';
  /** False when body measurements are prior-derived and too uncertain to judge fit. */
  reliable?: boolean;
}

/**
 * Semantics of the current camera-to-body distance value.
 * - uninitialized: no stable reference yet; value is a provisional prior-based guess.
 * - relative:      Z(t) = Z0 * S0 / S(t) with Z0 anchored on an anthropometric prior.
 * - metric:        Z0 anchored on a user-supplied known distance.
 * - low_confidence: the current frame could not be measured (yaw / visibility); value held.
 */
export type DistanceMode = 'uninitialized' | 'relative' | 'metric' | 'low_confidence';

export interface SimulationConfig {
  enabled: boolean;
  particleCount?: number;
  substeps: number;
  iterations: number;
  stretchCompliance: number; // m/N
  bendCompliance: number;
  skinAttachmentDist: number; // meters
  lraStiffness: number;
  damping: number;
  inertialCoupling: number; // kappa: body acceleration coupling
  collisionTolerance: number; // meters
}

export interface FabricProperties {
  fabricType: 'cotton_jersey' | 'heavy_cotton' | 'modal_rib' | 'cashmere' | 'silk_georgette' | 'wool_twill' | 'pleated_satin' | 'crepe_jersey';
  stretchLimitPercent: number; // Maximum allowable fabric strain before "too small"
  sheenColor: string;
  sheenRoughness: number;
  roughness: number;
  metalness: number;
  clearcoat?: number;
  densityGsm: number;
}

export interface ModelAnchor {
  x: number;
  y: number;
  z: number;
  type: 'neckline_center' | 'waist_center' | 'shoulder_center';
}

export interface ModelDimensions {
  width: number;
  height: number;
  depth: number;
}

export interface GarmentDimensions {
  chestCm?: number;
  waistCm?: number;
  hipsCm?: number;
  lengthCm: number;
  shoulderSpanCm?: number;
  hemSweepCm?: number;
}

export interface FittingScaleMultipliers {
  width: number;
  height: number;
  depth: number;
}

export interface FittingProfile {
  category: GarmentCategory;
  anchor: 'torso' | 'hips' | 'full_body';
  scaleMultipliers: FittingScaleMultipliers;
  yOffset: number;
  zOffset: number;
}

/**
 * Construction facts that drive runtime behaviour. Never infer these from GLB
 * node names: the sleeveless top's GLB still contains 2 cm "left_sleeve" stubs.
 */
export interface GarmentConstruction {
  /** 'short' | 'long' sleeves are articulated about their seam; 'none' keeps any stubs rigid. */
  sleeves: 'short' | 'long' | 'none';
  /** Name of the GLB mesh that simulation-data.json was generated from. */
  simulationMesh: string;
}

export interface GarmentMetadata {
  id: string;
  name: string;
  category: GarmentCategory;
  description: string;
  modelPath: string;
  thumbnailPath: string;
  dimensions: GarmentDimensions;
  modelDimensions: ModelDimensions;
  modelAnchor: ModelAnchor;
  construction: GarmentConstruction;
  fittingProfile: FittingProfile;
  material: {
    color: string;
    roughness: number;
    metalness: number;
    sheen?: number;
    sheenColor?: string;
  };
  fabric: FabricProperties;
  simulation: SimulationConfig;
  license?: {
    type: string;
    commercialUsePermitted: boolean;
    author: string;
  };
}

export type CameraStatus = 'idle' | 'initializing' | 'active' | 'denied' | 'unsupported' | 'error';
export type BodyTrackingStatus = 'searching' | 'detected' | 'lost';
export type GarmentFittingStatus = 'unloaded' | 'loading' | 'ready' | 'fitting_active' | 'error';

export type TrackingStatus =
  | 'idle'
  | 'initializing'
  | 'camera_active'
  | 'body_detected'
  | 'body_lost'
  | 'permission_denied'
  | 'unsupported'
  | 'error';

export interface Transform3D {
  position: [number, number, number];
  rotation: [number, number, number]; // Euler angles in radians [x, y, z]
  scale: [number, number, number];
}

export interface EngineFrameState {
  timestamp: number;
  intrinsics: CameraIntrinsics;
  operatingMode: OperatingMode;
  framingGuidance: FramingGuidance;
  keypoints: BodyKeypoints | null;
  measurements: BodyMeasurements | null;
  bodyProxy: BodyProxySkeleton | null;
  ease: GarmentEase | null;
  clothSimActive: boolean;
  occlusionActive: boolean;
  fps: number;
  latencyMs: number;
}
