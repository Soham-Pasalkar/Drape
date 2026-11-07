/**
 * DRAPE Spatial Atelier — Public AR Subsystem API Barrel
 *
 * Exposes the public contracts and interfaces of the AR virtual try-on engine.
 * Organized into 8 architectural subsystems:
 * 1. Camera & Calibration
 * 2. Pose Tracking & Landmark Filtering
 * 3. Coordinate System & Projection
 * 4. Body Representation & Proxy Models
 * 5. Garment Asset Registry & Rigging
 * 6. Fitting & Registration Engine
 * 7. Secondary Cloth Dynamics (XPBD)
 * 8. Three.js Scene & Compositor
 */

// 1. Types & Domain Interfaces
export * from "./types";

// 2. Camera Acquisition & Calibration
export { CameraManager, decideMirror } from "./camera";
export type { CameraConfig, MirrorDecision, TrackSettingsSubset } from "./camera";
export {
  CameraCalibrationManager,
  ISO_ID1_CARD,
  PRIOR_HFOV_DEGREES,
} from "./camera-calibration";

// 3. Pose Tracking & Smoothing
export {
  PoseTracker,
  POSE_MODEL_ID,
  POSE_OPTIONS,
} from "./pose-tracker";
export type { PoseTrackerCallbacks, PoseTrackerStats, PoseFrameMeta } from "./pose-tracker";
export { LandmarkSmoother, POSE_LANDMARKS } from "./landmark-smoother";
export {
  OneEuroFilter,
  OneEuroFilterVec3,
  OneEuroFilterQuat,
  LowPassFilter,
} from "./one-euro-filter";
export type { OneEuroConfig } from "./one-euro-filter";

// 4. Coordinates, Projections & Distance
export {
  imageToNDC,
  imageToDisplay,
  ndcToDisplay,
  ndcToImage,
  displayToImage,
  displayToNDC,
  imageToCamera,
  cameraToImage,
  imageToNormalized,
  normalizedToImage,
  normalizedPixelDistance,
  computeVideoDisplayTransform,
  buildProjectionMatrix,
  worldLandmarkToCameraAxes,
} from "./coordinates";
export type { VideoDisplayTransform, ObjectFit, Vec2 } from "./coordinates";
export {
  ShoulderDistanceEstimator,
  POPULATION_SHOULDER_BREADTH_M,
  DISTANCE_ESTIMATOR_CONFIG,
} from "./distance-estimator";
export type { DistanceEstimate, BreadthSource, ShoulderObservation } from "./distance-estimator";

// 5. Body Representation & Proxy Posing
export {
  MHRBodyProxy,
  BODY_PROXY_PRIORS,
  defaultBodyShape,
} from "./mhr-body-proxy";
export type { BodyShape, CapsuleCollider, EllipticalCrossSection, SignedDistanceResult } from "./mhr-body-proxy";
export {
  RobustPnPSolver,
  PNP_CONFIG,
  torsoRotationFromImage,
  torsoRotationFromWorld,
  quatLog,
  quatExp,
} from "./robust-pnp";
export type { PnPResult, PnPCorrespondence, PnPPriors } from "./robust-pnp";
export {
  PersonalizedBodyShapeEstimator,
  BODY_MEASUREMENT_FACTORS,
} from "./personalized-body-shape";
export { OperatingModeManager } from "./operating-modes";
export type { FramingEvaluation } from "./operating-modes";

// 6. Garment Assets, Rigging & Correspondence
export {
  getAllGarments,
  getGarmentById,
  getGarmentsByCategory,
  GARMENTS,
} from "./garment-registry";
export { GarmentInstance } from "./garment-instance";
export type {
  GarmentUpdateParams,
  GarmentDiagnostics,
  GarmentDebugFlags,
  MeshRecord,
  MeshRole,
  SimulationData,
} from "./garment-instance";
export {
  computeSemanticAnchor,
  describeSleeve,
  bodyDirToGarment,
  clampAbduction,
  captureRestTransforms,
  composeGarmentRootMatrix,
} from "./garment-rig";
export type {
  SemanticAnchorResult,
  SleeveDescriptor,
  SleeveRig,
  RestTransform,
} from "./garment-rig";
export { GarmentEaseEngine, RELIABLE_FIT_MIN_CONFIDENCE } from "./garment-ease";
export {
  buildCorrespondence,
  deformAgainstBody,
  fieldToVertexCorrespondences,
  transformPositions,
  weldNormals,
  buildWeldedAdjacency,
  closestPointOnTriangle,
  RestPoseDeformer,
  TriangleBVH,
} from "./garment-correspondence";
export type {
  CorrespondenceField,
  VertexCorrespondence,
  CorrespondenceOptions,
  PushOutParams,
  ClosestPointResult,
} from "./garment-correspondence";
export { FabricMaterialFactory } from "./fabric-materials";

// 7. Physics & Secondary Cloth Dynamics
export { XPBDClothSolver, XPBD_TIMESTEP } from "./xpbd-cloth-solver";
export type { DistanceConstraint, XPBDStats, XPBDStepContext } from "./xpbd-cloth-solver";

// 8. Fitting Engine, Scene & Pipeline
export {
  FittingEngine,
  BodyProportionEstimator,
  HIP_GATE,
  LIMB_MIN_VISIBILITY,
  PROPORTION_CONFIG,
  landmarkUsable,
} from "./fitting-engine";
export type { DetailedFittingResult, RigidPose3D, TrackingDiagnostics } from "./fitting-engine";
export { ThreeSceneManager } from "./three-scene";
export type { FrameLog, SceneDebugLayers, SceneDiagnostics } from "./three-scene";
export { FrameStep, PIPELINE_VERSION } from "./pipeline/frame-step";

// 9. Session Recording & Debugging
export { SessionRecorder, toSessionLandmarks } from "./session/recorder";
export { composeSnapshot } from "./session/snapshot";
export type { SessionFile, PositionKey } from "./session/schema";
