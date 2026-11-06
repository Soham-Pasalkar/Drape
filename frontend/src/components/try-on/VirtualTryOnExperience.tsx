/**
 * DRAPE Virtual Try-On Experience (Parametric MHR Architecture)
 *
 * Implements:
 * 1. Calibrated Pinhole Camera + Metric Scale Anchor
 * 2. MediaPipe Pose 33-Landmarks + 1€ Filter Smoothing
 * 3. Parametric MHR Body Proxy + Depth-Only Occlusion
 * 4. Robust PnP 6-DoF Root Solver & Swing-Twist Joint Kinematics
 * 5. Personalized Anthropometric Body Shape Fitting (Chest, Waist, Hips)
 * 6. Garment Ease & Physical Strain Limits
 * 7. XPBD Secondary Cloth Simulation
 * 8. Real-time Studio Framing Guidance (Collar, Bust, Full-Body)
 */

"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Camera,
  CameraOff,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  RotateCcw,
  Check,
  Layers,
  ShoppingBag,
  ExternalLink,
  Info,
  X,
  Ruler,
  Maximize2,
  CheckCircle2,
} from "lucide-react";
import {
  GarmentMetadata,
  TrackingStatus,
  CameraStatus,
  BodyTrackingStatus,
  GarmentFittingStatus,
  LandmarkPoint,
  BodyKeypoints,
  OperatingMode,
  FramingGuidance,
  BodyMeasurements,
  GarmentEase,
} from "@/lib/ar/types";
import { getAllGarments, getGarmentById } from "@/lib/ar/garment-registry";
import { CameraManager } from "@/lib/ar/camera";
import { PoseTracker } from "@/lib/ar/pose-tracker";
import { ThreeSceneManager } from "@/lib/ar/three-scene";
import { FittingEngine } from "@/lib/ar/fitting-engine";
import TrackingStatusBanner from "./TrackingStatusBanner";
import CameraViewport from "./CameraViewport";
import GarmentSelector from "./GarmentSelector";
import { DiagnosticMetrics } from "./DeveloperDiagnosticOverlay";

interface VirtualTryOnExperienceProps {
  initialGarmentId?: string;
}

export default function VirtualTryOnExperience({
  initialGarmentId,
}: VirtualTryOnExperienceProps) {
  const allGarments = getAllGarments();
  const initial = initialGarmentId ? getGarmentById(initialGarmentId) : null;
  const [selectedGarment, setSelectedGarment] = useState<GarmentMetadata>(
    initial || allGarments[0]
  );

  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>("idle");
  const [bodyTrackingStatus, setBodyTrackingStatus] = useState<BodyTrackingStatus>("searching");
  const [garmentFittingStatus, setGarmentFittingStatus] = useState<GarmentFittingStatus>("unloaded");
  const [trackingStatus, setTrackingStatus] = useState<TrackingStatus>("idle");

  const [rawLandmarks, setRawLandmarks] = useState<LandmarkPoint[]>([]);
  const [showSkeleton, setShowSkeleton] = useState<boolean>(false);
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(false);
  const [diagnosticMetrics, setDiagnosticMetrics] = useState<DiagnosticMetrics | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoModalOpen, setInfoModalOpen] = useState<boolean>(false);
  const [calibrationModalOpen, setCalibrationModalOpen] = useState<boolean>(false);
  const [cameraAspect, setCameraAspect] = useState<number>(16 / 9);

  // Parametric Engine Metrics
  const [operatingMode, setOperatingMode] = useState<OperatingMode>("bust");
  const [framingGuidance, setFramingGuidance] = useState<FramingGuidance>("good_framing");
  const [framingMessage, setFramingMessage] = useState<string>("Optimal studio framing");
  const [isCalibrated, setIsCalibrated] = useState<boolean>(false);
  const [estimatedDistanceZ, setEstimatedDistanceZ] = useState<number>(1.6);
  const [bodyMeasurements, setBodyMeasurements] = useState<BodyMeasurements | null>(null);
  const [garmentEase, setGarmentEase] = useState<GarmentEase | null>(null);

  // Calibration Form State
  const [cardDistanceInput, setCardDistanceInput] = useState<number>(0.5);
  const [cardWidthPxInput, setCardWidthPxInput] = useState<number>(240);

  // Core AR Subsystem Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const threeContainerRef = useRef<HTMLDivElement | null>(null);

  const cameraManagerRef = useRef<CameraManager | null>(null);
  const poseTrackerRef = useRef<PoseTracker | null>(null);
  const threeSceneRef = useRef<ThreeSceneManager | null>(null);
  const fittingEngineRef = useRef<FittingEngine | null>(null);
  const renderRafRef = useRef<number | null>(null);

  const latestKeypointsRef = useRef<BodyKeypoints | null>(null);
  const selectedGarmentRef = useRef<GarmentMetadata>(selectedGarment);
  const lastUiUpdateRef = useRef<number>(0);
  const renderFrameCountRef = useRef<number>(0);
  const lastFpsTimeRef = useRef<number>(performance.now());
  const currentRenderFpsRef = useRef<number>(60);

  useEffect(() => {
    selectedGarmentRef.current = selectedGarment;
  }, [selectedGarment]);

  // Clean tear-down helper
  const teardownAR = useCallback(() => {
    if (renderRafRef.current !== null) {
      cancelAnimationFrame(renderRafRef.current);
      renderRafRef.current = null;
    }

    if (poseTrackerRef.current) {
      poseTrackerRef.current.stopTracking();
      poseTrackerRef.current.dispose();
      poseTrackerRef.current = null;
    }

    if (cameraManagerRef.current) {
      cameraManagerRef.current.stopCamera();
      cameraManagerRef.current = null;
    }

    if (threeSceneRef.current) {
      threeSceneRef.current.dispose();
      threeSceneRef.current = null;
    }

    latestKeypointsRef.current = null;
    setRawLandmarks([]);
    setIsCameraActive(false);
    setCameraStatus("idle");
    setBodyTrackingStatus("searching");
    setGarmentFittingStatus("unloaded");
    setTrackingStatus("idle");
    setBodyMeasurements(null);
    setGarmentEase(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      teardownAR();
    };
  }, [teardownAR]);

  // Start AR Experience
  const handleStartCamera = async () => {
    setErrorMessage(null);
    setCameraStatus("initializing");
    setTrackingStatus("initializing");

    try {
      if (!videoRef.current || !threeContainerRef.current) {
        throw new Error("VIEWPORT_CONTAINER_UNAVAILABLE");
      }

      // 1. Initialize Camera Stream
      const cameraManager = new CameraManager();
      cameraManagerRef.current = cameraManager;
      const { width, height, aspect } = await cameraManager.startCamera(videoRef.current, {
        facingMode: "user",
      });
      setCameraAspect(aspect);
      setCameraStatus("active");

      // 2. Initialize Three.js WebGL2 Scene with MHR Body Proxy
      threeContainerRef.current.innerHTML = "";
      const threeScene = new ThreeSceneManager(threeContainerRef.current);
      threeScene.resize(threeContainerRef.current.clientWidth, threeContainerRef.current.clientHeight);
      threeSceneRef.current = threeScene;

      // 3. Initialize Parametric Fitting Engine
      const fitting = new FittingEngine();
      fitting.calibrationManager.updateResolution(width, height);
      fittingEngineRef.current = fitting;

      // Set initial projection matrix directly from calibrated intrinsics
      const isMirrored = cameraManager.facingMode === "user";
      const initialProjMatrix = fitting.calibrationManager.buildThreeProjectionMatrix(0.05, 20.0, isMirrored);
      threeScene.setCalibratedProjectionMatrix(initialProjMatrix, isMirrored);

      // 4. Load initial 3D Garment Model with PBR Sheen & XPBD Rig
      setGarmentFittingStatus("loading");
      await threeScene.loadGarment(selectedGarmentRef.current);
      setGarmentFittingStatus("ready");

      // 5. Initialize & Start MediaPipe Pose Landmarker with 1€ filter
      const poseTracker = new PoseTracker();
      poseTrackerRef.current = poseTracker;

      await poseTracker.startTracking(videoRef.current, {
        onKeypoints: (keypoints, landmarks) => {
          latestKeypointsRef.current = keypoints;
          setRawLandmarks(landmarks);
          if (keypoints) {
            setBodyTrackingStatus("detected");
            setTrackingStatus("body_detected");
          } else {
            setBodyTrackingStatus("lost");
            setTrackingStatus("body_lost");
          }
        },
        onStatusChange: (status) => {
          setTrackingStatus(status);
        },
        onError: (err) => {
          console.error("AR Pose Tracking Error:", err);
          setErrorMessage("Spatial tracking interrupted. Repositioning...");
        },
      });

      // 6. Continuous Three.js Render & Parametric Fitting Loop
      const renderLoop = () => {
        const scene = threeSceneRef.current;
        const fittingEngine = fittingEngineRef.current;
        const kp = latestKeypointsRef.current;
        const currentGarment = selectedGarmentRef.current;
        const video = videoRef.current;

        renderFrameCountRef.current++;
        const nowFpsTime = performance.now();
        if (nowFpsTime - lastFpsTimeRef.current >= 500) {
          currentRenderFpsRef.current = (renderFrameCountRef.current * 1000) / (nowFpsTime - lastFpsTimeRef.current);
          renderFrameCountRef.current = 0;
          lastFpsTimeRef.current = nowFpsTime;
        }

        if (scene && fittingEngine) {
          const isFrontCamera = cameraManagerRef.current?.facingMode === "user";

          if (video && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
            // Adaptive Environmental Lighting from Video Frame
            scene.updateEnvironmentalLighting(video);
          }

          if (kp) {
            const vWidth = video?.videoWidth || 1280;
            const vHeight = video?.videoHeight || 720;

            // Execute Parametric Pipeline
            const fitResult = fittingEngine.processFrame(
              kp,
              currentGarment,
              vWidth,
              vHeight,
              isFrontCamera
            );

            // Update Three.js camera projection matrix with calibrated intrinsics
            const projMat = fittingEngine.calibrationManager.buildThreeProjectionMatrix(
              0.05,
              20.0,
              isFrontCamera
            );
            scene.setCalibratedProjectionMatrix(projMat, isFrontCamera);

            // Apply body shape adaptation & ease clearances to garment mesh
            scene.adaptGarmentToBody(fitResult.measurements);

            // Set unified 6-DoF poses with joint rotations and limb occluders
            scene.setTargetPoses(
              fitResult.garmentPose,
              fitResult.bodyPose,
              fitResult.pnpResult.jointRotations,
              fitResult.limbJoints
            );

            setGarmentFittingStatus("fitting_active");

            // Throttle React UI state updates to ~10 FPS for peak rendering smoothness
            const now = performance.now();
            if (now - lastUiUpdateRef.current > 100) {
              lastUiUpdateRef.current = now;
              setOperatingMode(fitResult.operatingMode);
              setFramingGuidance(fitResult.framingGuidance);
              setFramingMessage(fitResult.framingMessage);
              setEstimatedDistanceZ(fitResult.estimatedDistanceZ);
              setBodyMeasurements(fitResult.measurements);
              setGarmentEase(fitResult.ease);
              setIsCalibrated(fittingEngine.calibrationManager.getIntrinsics().isCalibrated);

              setDiagnosticMetrics({
                videoResolution: { width: vWidth, height: vHeight },
                canvasResolution: {
                  width: threeContainerRef.current?.clientWidth || vWidth,
                  height: threeContainerRef.current?.clientHeight || vHeight,
                  dpr: typeof window !== "undefined" ? window.devicePixelRatio : 1,
                },
                trackingFps: 30,
                renderFps: currentRenderFpsRef.current,
                operatingMode: fitResult.operatingMode,
                framingGuidance: fitResult.framingGuidance,
                estimatedDistanceZ: fitResult.estimatedDistanceZ,
                pnpRootPosition: fitResult.pnpResult.rootPosition,
                pnpRootRotation: fitResult.pnpResult.rootRotation,
                pnpReprojectionError: fitResult.pnpResult.reprojectionError,
                measurements: fitResult.measurements,
                ease: fitResult.ease,
                activeGarmentId: currentGarment.id,
              });
            }
          } else {
            scene.setTargetPoses(null, null);
            setGarmentFittingStatus("ready");
          }

          scene.render();
        }

        renderRafRef.current = requestAnimationFrame(renderLoop);
      };

      renderRafRef.current = requestAnimationFrame(renderLoop);
      setIsCameraActive(true);
    } catch (err: unknown) {
      console.error("Failed to start Virtual Try-On:", err);
      const e = err as { message?: string };
      if (e.message === "CAMERA_PERMISSION_DENIED") {
        setErrorMessage("Camera access was denied. Please allow camera permissions in your browser.");
        setCameraStatus("denied");
        setTrackingStatus("permission_denied");
      } else if (e.message === "WEBGL_UNAVAILABLE") {
        setErrorMessage("WebGL2 is not supported on this device or browser.");
        setCameraStatus("unsupported");
        setTrackingStatus("unsupported");
      } else {
        setErrorMessage(e.message || "Failed to initialize 3D AR Try-On.");
        setCameraStatus("error");
        setTrackingStatus("error");
      }
      teardownAR();
    }
  };

  // Switch Active Garment seamlessly
  const handleSelectGarment = async (garment: GarmentMetadata) => {
    setSelectedGarment(garment);
    selectedGarmentRef.current = garment;

    if (threeSceneRef.current) {
      try {
        setGarmentFittingStatus("loading");
        await threeSceneRef.current.loadGarment(garment);
        setGarmentFittingStatus(latestKeypointsRef.current ? "fitting_active" : "ready");
      } catch (err) {
        console.error("Failed to load 3D garment mesh:", err);
        setGarmentFittingStatus("error");
        setErrorMessage(`Failed to switch to ${garment.name}`);
      }
    }
  };

  // Flip Camera
  const handleSwitchCamera = async () => {
    if (!cameraManagerRef.current || !videoRef.current) return;
    try {
      const res = await cameraManagerRef.current.switchCamera();
      if (res) {
        setCameraAspect(res.aspect);
        if (threeSceneRef.current && threeContainerRef.current) {
          threeSceneRef.current.resize(
            threeContainerRef.current.clientWidth,
            threeContainerRef.current.clientHeight
          );
        }
      }
    } catch (err) {
      console.error("Camera switch error:", err);
    }
  };

  // Toggle Skeleton / MHR Proxy Wireframe
  const handleToggleSkeleton = () => {
    const nextVal = !showSkeleton;
    setShowSkeleton(nextVal);
    if (threeSceneRef.current) {
      threeSceneRef.current.setDebugSkeletonVisible(nextVal);
    }
  };

  // Perform ISO ID-1 Reference Card Calibration
  const handleApplyCardCalibration = () => {
    if (!fittingEngineRef.current) return;
    const cardAspect = 85.6 / 53.98;
    const heightPx = cardWidthPxInput / cardAspect;

    const newIntrinsics = fittingEngineRef.current.calibrationManager.calibrateWithReferenceCard(
      cardWidthPxInput,
      heightPx,
      cardDistanceInput
    );

    setIsCalibrated(newIntrinsics.isCalibrated);
    setCalibrationModalOpen(false);
  };

  // Reset to Population Prior Calibration
  const handleResetPriorCalibration = () => {
    if (!fittingEngineRef.current || !videoRef.current) return;
    const w = videoRef.current.videoWidth || 1280;
    const h = videoRef.current.videoHeight || 720;
    fittingEngineRef.current.calibrationManager.createPopulationPrior(w, h);
    setIsCalibrated(false);
    setCalibrationModalOpen(false);
  };

  return (
    <div className="bg-ink-black text-warm-ivory min-h-screen pb-20">
      {/* Studio Header Bar */}
      <div className="border-b border-warm-ivory/15 bg-ink-black/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link
              href="/"
              className="font-serif text-2xl font-bold tracking-editorial text-warm-ivory hover:text-electric-blue transition-colors"
            >
              DRAPE
            </Link>
            <span className="text-warm-ivory/30">•</span>
            <span className="font-mono text-xs uppercase tracking-widest text-acid-lime font-medium">
              3D AR Spatial Atelier
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setCalibrationModalOpen(true)}
              className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest border border-electric-blue/40 text-electric-blue hover:bg-electric-blue/10 transition-colors flex items-center space-x-1.5 rounded-sm"
              title="Camera Metric Calibration"
            >
              <Ruler className="w-3.5 h-3.5" />
              <span>{isCalibrated ? "Calibrated" : "Calibrate Scale"}</span>
            </button>

            <button
              onClick={() => setInfoModalOpen(true)}
              className="p-2 text-warm-ivory/70 hover:text-warm-ivory hover:bg-warm-ivory/10 transition-colors rounded-sm"
              title="Spatial Atelier Dossier"
            >
              <Info className="w-4 h-4" />
            </button>
            <Link
              href="/collections"
              className="text-[10px] font-mono uppercase tracking-widest px-3 py-1.5 border border-warm-ivory/20 hover:border-warm-ivory text-warm-ivory transition-colors"
            >
              Back to Collections
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 pt-6 sm:pt-8">
        {/* Top Status & Controls Strip */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <TrackingStatusBanner
            status={trackingStatus}
            cameraStatus={cameraStatus}
            bodyTrackingStatus={bodyTrackingStatus}
            garmentFittingStatus={garmentFittingStatus}
            activeGarmentName={selectedGarment.name}
            confidence={latestKeypointsRef.current?.confidence}
            operatingMode={operatingMode}
            isCalibrated={isCalibrated}
            estimatedDistanceZ={estimatedDistanceZ}
            ease={garmentEase}
          />

          <div className="flex items-center space-x-3">
            {!isCameraActive ? (
              <button
                onClick={handleStartCamera}
                className="px-5 py-2.5 bg-electric-blue text-white text-xs font-mono uppercase tracking-widest hover:bg-electric-blue/90 transition-all flex items-center space-x-2 shadow-lg"
              >
                <Camera className="w-4 h-4" />
                <span>Activate Camera & Try-On</span>
              </button>
            ) : (
              <button
                onClick={teardownAR}
                className="px-4 py-2 border border-warm-ivory/30 text-warm-ivory text-xs font-mono uppercase tracking-widest hover:border-red-400 hover:text-red-400 transition-colors flex items-center space-x-2"
              >
                <CameraOff className="w-4 h-4" />
                <span>Stop Mirror</span>
              </button>
            )}
          </div>
        </div>

        {/* Error Alert Banner */}
        {errorMessage && (
          <div className="mb-6 p-4 bg-red-950/80 border border-red-500/40 text-red-200 text-xs font-mono flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-red-300 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Main AR Studio Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Interactive 3D AR Camera Viewport (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            <CameraViewport
              videoRef={videoRef}
              threeContainerRef={threeContainerRef}
              isMirrored={cameraManagerRef.current?.facingMode === "user"}
              trackingStatus={trackingStatus}
              rawLandmarks={rawLandmarks}
              showSkeleton={showSkeleton}
              onToggleSkeleton={handleToggleSkeleton}
              showDiagnostics={showDiagnostics}
              onToggleDiagnostics={() => setShowDiagnostics((prev) => !prev)}
              diagnosticMetrics={diagnosticMetrics}
              onSwitchCamera={isCameraActive ? handleSwitchCamera : undefined}
              onOpenCalibration={() => setCalibrationModalOpen(true)}
              aspectRatio={cameraAspect}
              framingGuidance={framingGuidance}
              framingMessage={framingMessage}
              isCalibrated={isCalibrated}
            />

            {/* Viewport Operational Guidance */}
            <div className="p-3 bg-ink-black/60 border border-warm-ivory/10 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-warm-ivory/70">
              <div className="flex items-center space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-electric-blue animate-pulse" />
                <span>
                  {operatingMode === "collar"
                    ? "COLLAR MODE (<0.5M) • FACE & NECKLINE ANCHORS ACTIVE"
                    : operatingMode === "bust"
                    ? "BUST MODE (0.6–1.4M) • TORSO SHAPE & CHEST VOLUME FITTING"
                    : "FULL-BODY MODE (1.8–2.5M) • HIP KINEMATICS & HEM DRAPE ACTIVE"}
                </span>
              </div>
              <span className="text-acid-lime">MHR BODY PROXY • XPBD CLOTH</span>
            </div>
          </div>

          {/* Right: Garment Selection & Active Piece Dossier (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Active Garment Spotlight Card */}
            <div className="p-5 bg-ink-black/60 border border-warm-ivory/15 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2 text-[10px] font-mono uppercase tracking-widest text-acid-lime mb-1">
                    <span>ACTIVE 3D RIG</span>
                    <span>•</span>
                    <span>{selectedGarment.category}</span>
                    <span>•</span>
                    <span>{selectedGarment.fabric.fabricType.replace("_", " ").toUpperCase()}</span>
                  </div>
                  <h3 className="font-serif text-2xl font-normal text-warm-ivory">
                    {selectedGarment.name}
                  </h3>
                </div>

                <div
                  className="w-5 h-5 rounded-full border border-warm-ivory/40"
                  style={{ backgroundColor: selectedGarment.material.color }}
                  title={`Color: ${selectedGarment.material.color}`}
                />
              </div>

              <p className="text-xs text-warm-ivory/75 font-light leading-relaxed">
                {selectedGarment.description}
              </p>

              {/* Physical Dimension Spec */}
              <div className="grid grid-cols-3 gap-2 p-3 bg-warm-ivory/5 border border-warm-ivory/10 text-center font-mono text-[10px]">
                <div>
                  <span className="text-warm-ivory/50 block">CHEST / BUST</span>
                  <span className="text-warm-ivory font-semibold">
                    {selectedGarment.dimensions.chestCm
                      ? `${selectedGarment.dimensions.chestCm} cm`
                      : "Adaptive"}
                  </span>
                </div>
                <div>
                  <span className="text-warm-ivory/50 block">WAIST</span>
                  <span className="text-warm-ivory font-semibold">
                    {selectedGarment.dimensions.waistCm
                      ? `${selectedGarment.dimensions.waistCm} cm`
                      : "Adaptive"}
                  </span>
                </div>
                <div>
                  <span className="text-warm-ivory/50 block">TOTAL LENGTH</span>
                  <span className="text-warm-ivory font-semibold">
                    {selectedGarment.dimensions.lengthCm} cm
                  </span>
                </div>
              </div>

              {/* Live Personalized Body Reconstruction Dossier */}
              {bodyMeasurements && (
                <div className="p-3 bg-warm-ivory/5 border border-electric-blue/30 space-y-2 font-mono text-[10px]">
                  <div className="flex items-center justify-between text-electric-blue">
                    <span className="uppercase tracking-widest font-semibold flex items-center space-x-1.5">
                      <Ruler className="w-3.5 h-3.5" />
                      <span>Parametric Body Reconstruction</span>
                    </span>
                    <span className="text-[9px] text-warm-ivory/50">
                      {isCalibrated ? "METRIC VERIFIED" : "STATISTICAL PRIOR"}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-1.5 text-center pt-1">
                    <div className="p-1.5 bg-ink-black/40 border border-warm-ivory/10">
                      <span className="text-warm-ivory/50 block text-[9px]">SHOULDERS</span>
                      <span className="text-warm-ivory font-medium">
                        {bodyMeasurements.shoulderBreadthCm} cm
                      </span>
                    </div>
                    <div className="p-1.5 bg-ink-black/40 border border-warm-ivory/10">
                      <span className="text-warm-ivory/50 block text-[9px]">CHEST</span>
                      <span className="text-warm-ivory font-medium">
                        {bodyMeasurements.chestCircumferenceCm} cm
                      </span>
                    </div>
                    <div className="p-1.5 bg-ink-black/40 border border-warm-ivory/10">
                      <span className="text-warm-ivory/50 block text-[9px]">WAIST</span>
                      <span className="text-warm-ivory font-medium">
                        {bodyMeasurements.waistCircumferenceCm} cm
                      </span>
                    </div>
                    <div className="p-1.5 bg-ink-black/40 border border-warm-ivory/10">
                      <span className="text-warm-ivory/50 block text-[9px]">HIPS</span>
                      <span className="text-warm-ivory font-medium">
                        {bodyMeasurements.hipCircumferenceCm} cm
                      </span>
                    </div>
                  </div>

                  {garmentEase && (
                    <div className="pt-2 border-t border-warm-ivory/10 flex items-center justify-between text-[10px]">
                      <span className="text-warm-ivory/70">
                        {garmentEase.chestEaseCm !== undefined
                          ? `Chest Ease: ${garmentEase.chestEaseCm > 0 ? "+" : ""}${garmentEase.chestEaseCm} cm`
                          : garmentEase.waistEaseCm !== undefined
                          ? `Waist Ease: ${garmentEase.waistEaseCm > 0 ? "+" : ""}${garmentEase.waistEaseCm} cm`
                          : "Adaptive Ease"}
                      </span>
                      <span
                        className={`font-semibold ${
                          garmentEase.isTooSmall
                            ? "text-red-400"
                            : garmentEase.estimatedStrainPercent > 0
                            ? "text-amber-400"
                            : "text-acid-lime"
                        }`}
                      >
                        {garmentEase.isTooSmall
                          ? `Too Small (+${garmentEase.estimatedStrainPercent}% Strain)`
                          : garmentEase.estimatedStrainPercent > 0
                          ? `Snug (+${garmentEase.estimatedStrainPercent}% Stretch)`
                          : `Tailored Ease`}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-warm-ivory/10">
                <span className="text-[10px] font-mono text-warm-ivory/60">
                  ANCHOR: {selectedGarment.modelAnchor.type.toUpperCase().replace('_', ' ')}
                </span>
                <Link
                  href="/collections"
                  className="inline-flex items-center space-x-1.5 text-xs font-mono uppercase tracking-widest text-electric-blue hover:text-white transition-colors"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Shop Related Pieces</span>
                </Link>
              </div>
            </div>

            {/* Garment Selector Carousel */}
            <div className="space-y-3">
              <h4 className="font-mono text-xs uppercase tracking-widest text-warm-ivory/80">
                Switch Atelier Silhouette ({allGarments.length} Models)
              </h4>
              <GarmentSelector
                selectedGarmentId={selectedGarment.id}
                onSelectGarment={handleSelectGarment}
              />
            </div>
          </div>
        </div>

        {/* Studio Technical Specifications & Privacy Accordion */}
        <div className="mt-16 pt-10 border-t border-warm-ivory/15 grid grid-cols-1 md:grid-cols-3 gap-6 font-mono text-xs text-warm-ivory/75">
          <div className="p-4 bg-ink-black/40 border border-warm-ivory/10 space-y-2">
            <div className="flex items-center space-x-2 text-acid-lime font-medium">
              <ShieldCheck className="w-4 h-4" />
              <h5 className="uppercase tracking-wider">Absolute Privacy</h5>
            </div>
            <p className="text-[11px] font-light leading-relaxed text-warm-ivory/60">
              100% on-device WebAssembly execution. Camera frames are processed strictly in local volatile RAM and are never recorded, compressed, or transmitted to any server.
            </p>
          </div>

          <div className="p-4 bg-ink-black/40 border border-warm-ivory/10 space-y-2">
            <div className="flex items-center space-x-2 text-electric-blue font-medium">
              <Sparkles className="w-4 h-4" />
              <h5 className="uppercase tracking-wider">Parametric MHR Body Fitting</h5>
            </div>
            <p className="text-[11px] font-light leading-relaxed text-warm-ivory/60">
              Momentum Human Rig proxy with robust PnP root estimation, Ramanujan elliptical torso reconstruction, and LBS/DQS skeletal deformation.
            </p>
          </div>

          <div className="p-4 bg-ink-black/40 border border-warm-ivory/10 space-y-2">
            <div className="flex items-center space-x-2 text-warm-ivory font-medium">
              <Layers className="w-4 h-4" />
              <h5 className="uppercase tracking-wider">XPBD Secondary Cloth Drape</h5>
            </div>
            <p className="text-[11px] font-light leading-relaxed text-warm-ivory/60">
              Extended Position-Based Dynamics (XPBD) cloth solver with body-proxy collision, long-range attachments, and depth-only foreground hand/arm occlusion.
            </p>
          </div>
        </div>
      </div>

      {/* Metric Calibration Modal */}
      {calibrationModalOpen && (
        <div className="fixed inset-0 z-50 bg-ink-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-ink-black border border-warm-ivory/20 max-w-md w-full p-6 space-y-5 relative text-warm-ivory shadow-2xl">
            <button
              onClick={() => setCalibrationModalOpen(false)}
              className="absolute top-4 right-4 p-1 text-warm-ivory/60 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2 text-electric-blue font-mono text-xs uppercase tracking-widest">
              <Ruler className="w-4 h-4" />
              <span>Camera Metric Scale Calibration</span>
            </div>

            <h3 className="font-serif text-2xl font-light">ISO ID-1 Reference Card</h3>

            <p className="text-xs font-mono text-warm-ivory/70 leading-relaxed">
              Monocular RGB webcams do not provide absolute metric depth. Hold a standard credit/identity card (85.60 mm width) parallel to the camera at approximately 0.5 meters to calibrate exact focal length.
            </p>

            <div className="space-y-3 font-mono text-xs">
              <div>
                <label className="text-warm-ivory/60 block text-[10px] uppercase mb-1">
                  Card Apparent Width in Stream (Pixels)
                </label>
                <input
                  type="number"
                  value={cardWidthPxInput}
                  onChange={(e) => setCardWidthPxInput(Number(e.target.value))}
                  className="w-full bg-warm-ivory/10 border border-warm-ivory/20 px-3 py-2 text-warm-ivory font-mono text-xs focus:outline-none focus:border-electric-blue"
                />
              </div>

              <div>
                <label className="text-warm-ivory/60 block text-[10px] uppercase mb-1">
                  Distance to Camera (Meters)
                </label>
                <input
                  type="number"
                  step="0.05"
                  value={cardDistanceInput}
                  onChange={(e) => setCardDistanceInput(Number(e.target.value))}
                  className="w-full bg-warm-ivory/10 border border-warm-ivory/20 px-3 py-2 text-warm-ivory font-mono text-xs focus:outline-none focus:border-electric-blue"
                />
              </div>
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                onClick={handleApplyCardCalibration}
                className="flex-1 py-2.5 bg-electric-blue text-white font-mono text-xs uppercase tracking-widest hover:bg-electric-blue/90 transition-colors shadow-md"
              >
                Apply Calibration
              </button>
              <button
                onClick={handleResetPriorCalibration}
                className="px-4 py-2.5 border border-warm-ivory/20 text-warm-ivory/70 font-mono text-xs uppercase tracking-widest hover:text-white hover:border-warm-ivory transition-colors"
              >
                Reset to Prior
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Technical Dossier Modal */}
      {infoModalOpen && (
        <div className="fixed inset-0 z-50 bg-ink-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-ink-black border border-warm-ivory/20 max-w-lg w-full p-6 space-y-4 relative text-warm-ivory shadow-2xl">
            <button
              onClick={() => setInfoModalOpen(false)}
              className="absolute top-4 right-4 p-1 text-warm-ivory/60 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2 text-acid-lime font-mono text-xs uppercase tracking-widest">
              <Sparkles className="w-4 h-4" />
              <span>DRAPE SPATIAL ATELIER • SPECIFICATION</span>
            </div>

            <h3 className="font-serif text-2xl font-light">Parametric 3D AR Virtual Try-On</h3>

            <div className="space-y-3 text-xs font-mono text-warm-ivory/80 leading-relaxed">
              <p>
                <strong>Camera Projection:</strong> True pinhole camera model K with off-axis frustum directly mapped to stream dimensions, aspect ratio, and mirroring.
              </p>
              <p>
                <strong>Tracking & Jitter Filter:</strong> 1€ Filter (Casiez et al., 2012) on joint positions and quaternion SLERP in SO(3).
              </p>
              <p>
                <strong>Parametric Body:</strong> Momentum Human Rig (MHR) proxy with elliptical torso cross-sections and capsule limb colliders.
              </p>
              <p>
                <strong>Anthropometry:</strong> Ramanujan ellipse perimeter formulation for chest, waist, and hip circumference reconstruction.
              </p>
              <p>
                <strong>Cloth Dynamics:</strong> Extended Position-Based Dynamics (XPBD) secondary simulation with stretch, bending, and skin attachment constraints.
              </p>
              <p>
                <strong>Occlusion:</strong> Depth-only body proxy (colorWrite: false) occludes 3D garments when arms/hands pass in front of torso.
              </p>
            </div>

            <button
              onClick={() => setInfoModalOpen(false)}
              className="w-full py-2.5 bg-warm-ivory text-ink-black font-mono text-xs uppercase tracking-widest hover:bg-white transition-colors"
            >
              Close Dossier
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
