/**
 * DRAPE Virtual Try-On Experience
 *
 * LIVE EXECUTION PATH
 *   getUserMedia ─► <video> (object-cover, inside the mirrored layer stack)
 *        │
 *        ├─ requestVideoFrameCallback ─► MediaPipe PoseLandmarker ─► 1€ smoothing
 *        │      (once per camera frame)        └─► poseFrameRef { keypoints, frameId }
 *        │
 *        └─ requestAnimationFrame render loop (display rate):
 *             1. container size (ResizeObserver) + video size ─► VideoDisplayTransform
 *             2. intrinsics + display transform ─► projection matrix (only when changed)
 *             3. NEW pose frame? ─► FrameStep.fit → FittingEngine.processFrame (smoothing: FrameStep.smoother, per pose frame)
 *                                  ─► ThreeSceneManager.setFrameTarget
 *             4. ThreeSceneManager.render: pose smoothing, sleeves, deformation, XPBD, draw
 *             5. ~10 Hz React UI / diagnostics update from the latest fit
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
  X,
  Ruler,
  Layers,
  ShoppingBag,
  Info,
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
  DistanceMode,
} from "@/lib/ar/types";
import { getAllGarments, getGarmentById } from "@/lib/ar/garment-registry";
import { CameraManager } from "@/lib/ar/camera";
import { PoseTracker, PoseTrackerCallbacks, POSE_MODEL_ID, POSE_OPTIONS } from "@/lib/ar/pose-tracker";
import { SessionRecorder, toSessionLandmarks } from "@/lib/ar/session/recorder";
import { composeSnapshot } from "@/lib/ar/session/snapshot";
import { PositionKey, SessionFile } from "@/lib/ar/session/schema";
import { imageToDisplay } from "@/lib/ar/coordinates";
import { ThreeSceneManager } from "@/lib/ar/three-scene";
import { FittingEngine, DetailedFittingResult } from "@/lib/ar/fitting-engine";
import { FrameStep } from "@/lib/ar/pipeline/frame-step";
import { computeVideoDisplayTransform, VideoDisplayTransform, imageToNDC } from "@/lib/ar/coordinates";
import { computeRegistration } from "@/lib/ar/debug/registration";
import { buildFrameDiag } from "@/lib/ar/debug/frame-diag";
import type { DebugMaterialMode } from "@/lib/ar/debug/stage1-probe";
import * as THREE from "three";
import TrackingStatusBanner from "./TrackingStatusBanner";
import CameraViewport from "./CameraViewport";
import GarmentSelector from "./GarmentSelector";
import { DiagnosticMetrics, DiagnosticLayers, DEFAULT_DIAGNOSTIC_LAYERS } from "./DeveloperDiagnosticOverlay";

interface VirtualTryOnExperienceProps {
  initialGarmentId?: string;
}

/** The <video> uses CSS object-fit: cover with centred object-position (see CameraViewport). */
const VIDEO_OBJECT_FIT = "cover" as const;
const UI_UPDATE_INTERVAL_MS = 100;

export default function VirtualTryOnExperience({ initialGarmentId }: VirtualTryOnExperienceProps) {
  const allGarments = getAllGarments();
  const initial = initialGarmentId ? getGarmentById(initialGarmentId) : null;
  const [selectedGarment, setSelectedGarment] = useState<GarmentMetadata>(initial || allGarments[0]);

  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>("idle");
  const [bodyTrackingStatus, setBodyTrackingStatus] = useState<BodyTrackingStatus>("searching");
  const [garmentFittingStatus, setGarmentFittingStatus] = useState<GarmentFittingStatus>("unloaded");
  const [trackingStatus, setTrackingStatus] = useState<TrackingStatus>("idle");
  const [isMirrored, setIsMirrored] = useState<boolean>(true);

  const [rawLandmarks, setRawLandmarks] = useState<LandmarkPoint[]>([]);
  const [showSkeleton, setShowSkeleton] = useState<boolean>(false);
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(false);
  const [diagnosticLayers, setDiagnosticLayers] = useState<DiagnosticLayers>(DEFAULT_DIAGNOSTIC_LAYERS);
  const [diagnosticMetrics, setDiagnosticMetrics] = useState<DiagnosticMetrics | null>(null);
  const [materialMode, setMaterialMode] = useState<DebugMaterialMode>("normal");
  const [displayTransform, setDisplayTransform] = useState<VideoDisplayTransform | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoModalOpen, setInfoModalOpen] = useState<boolean>(false);
  const [calibrationModalOpen, setCalibrationModalOpen] = useState<boolean>(false);
  const [cameraAspect, setCameraAspect] = useState<number>(16 / 9);

  const [operatingMode, setOperatingMode] = useState<OperatingMode>("bust");
  const [framingGuidance, setFramingGuidance] = useState<FramingGuidance>("good_framing");
  const [framingMessage, setFramingMessage] = useState<string>("Optimal studio framing");
  const [isCalibrated, setIsCalibrated] = useState<boolean>(false);
  const [estimatedDistanceZ, setEstimatedDistanceZ] = useState<number | undefined>(undefined);
  const [distanceMode, setDistanceMode] = useState<DistanceMode>("uninitialized");
  const [landmarkConfidence, setLandmarkConfidence] = useState<number | undefined>(undefined);
  const [bodyMeasurements, setBodyMeasurements] = useState<BodyMeasurements | null>(null);
  const [garmentEase, setGarmentEase] = useState<GarmentEase | null>(null);

  const [cardDistanceInput, setCardDistanceInput] = useState<number>(0.5);
  const [cardWidthPxInput, setCardWidthPxInput] = useState<number>(240);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const threeContainerRef = useRef<HTMLDivElement | null>(null);
  const cameraManagerRef = useRef<CameraManager | null>(null);
  const poseTrackerRef = useRef<PoseTracker | null>(null);
  const poseCallbacksRef = useRef<PoseTrackerCallbacks | null>(null);
  const threeSceneRef = useRef<ThreeSceneManager | null>(null);
  const fittingEngineRef = useRef<FittingEngine | null>(null);
  const frameStepRef = useRef<FrameStep | null>(null);
  const renderRafRef = useRef<number | null>(null);
  const sessionRef = useRef<number>(0); // invalidates async work from a previous session

  const poseFrameRef = useRef<{
    keypoints: BodyKeypoints | null;
    landmarks: LandmarkPoint[];
    frameId: number;
    t: number;
    mediaTime: number | null;
    world: LandmarkPoint[] | undefined;
  }>({ keypoints: null, landmarks: [], frameId: 0, t: 0, mediaTime: null, world: undefined });
  // Session recording (FR-18): local only, opt-in.
  const recorderRef = useRef<SessionRecorder>(new SessionRecorder());
  const [recording, setRecording] = useState(false);
  const [recordElapsedS, setRecordElapsedS] = useState(0);
  const [recordFrames, setRecordFrames] = useState(0);
  const [lastMarker, setLastMarker] = useState<PositionKey | null>(null);
  const [includeSnapshots, setIncludeSnapshots] = useState(false);
  const includeSnapshotsRef = useRef(false);
  const lastRecordUiRef = useRef(0);
  const pendingRecordHeaderRef = useRef<SessionFile["header"] | null>(null);
  const [savedSessionName, setSavedSessionName] = useState<string | null>(null);
  const processedFrameIdRef = useRef<number>(0);
  const latestFitRef = useRef<DetailedFittingResult | null>(null);
  const containerSizeRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 });
  const displayKeyRef = useRef<string>("");
  const displayRef = useRef<VideoDisplayTransform | null>(null);
  const selectedGarmentRef = useRef<GarmentMetadata>(selectedGarment);
  const overlaysVisibleRef = useRef<boolean>(false);
  const diagnosticsVisibleRef = useRef<boolean>(false);
  const statusRef = useRef<{ fitting: GarmentFittingStatus; body: BodyTrackingStatus }>({ fitting: "unloaded", body: "searching" });

  const lastUiUpdateRef = useRef<number>(0);
  const renderFrameCountRef = useRef<number>(0);
  const lastFpsTimeRef = useRef<number>(0);
  const currentRenderFpsRef = useRef<number>(0);
  const lastFrameMsRef = useRef<number>(0);

  useEffect(() => {
    selectedGarmentRef.current = selectedGarment;
  }, [selectedGarment]);
  useEffect(() => {
    overlaysVisibleRef.current = showSkeleton || showDiagnostics;
    diagnosticsVisibleRef.current = showDiagnostics;
  }, [showSkeleton, showDiagnostics]);
  useEffect(() => {
    threeSceneRef.current?.setDebugLayers({
      bodyProxy: showSkeleton || (showDiagnostics && diagnosticLayers.bodyProxy),
      bounds: showDiagnostics && diagnosticLayers.bounds,
      anchors: showDiagnostics && diagnosticLayers.anchors,
      correspondence: showDiagnostics && diagnosticLayers.correspondence,
      collisionNormals: showDiagnostics && diagnosticLayers.collisionNormals,
    });
    threeSceneRef.current?.setAxesGizmoVisible(showDiagnostics && diagnosticLayers.axesGizmo);
    threeSceneRef.current?.setProbeEnabled(showDiagnostics);
    threeSceneRef.current?.setRegistrationVisible(showDiagnostics && diagnosticLayers.registration);
    threeSceneRef.current?.setDebugMaterialMode(materialMode);
  }, [showSkeleton, showDiagnostics, diagnosticLayers, materialMode, isCameraActive]);

  const setFittingStatus = useCallback((s: GarmentFittingStatus) => {
    if (statusRef.current.fitting !== s) {
      statusRef.current.fitting = s;
      setGarmentFittingStatus(s);
    }
  }, []);

  // Container size tracking (layout reads happen in the observer, never in the render loop).
  useEffect(() => {
    const el = threeContainerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      containerSizeRef.current = { width: r.width, height: r.height };
      threeSceneRef.current?.resize(r.width, r.height);
    });
    ro.observe(el);
    containerSizeRef.current = { width: el.clientWidth, height: el.clientHeight };
    return () => ro.disconnect();
  }, []);

  const teardownAR = useCallback(() => {
    sessionRef.current++;
    if (renderRafRef.current !== null) {
      cancelAnimationFrame(renderRafRef.current);
      renderRafRef.current = null;
    }
    poseTrackerRef.current?.dispose();
    poseTrackerRef.current = null;
    cameraManagerRef.current?.stopCamera();
    cameraManagerRef.current = null;
    threeSceneRef.current?.dispose();
    threeSceneRef.current = null;
    fittingEngineRef.current = null;
    frameStepRef.current = null;
    poseFrameRef.current = { keypoints: null, landmarks: [], frameId: 0, t: 0, mediaTime: null, world: undefined };
    if (recorderRef.current.active) recorderRef.current.stop(); // discard: the session ended without a save
    processedFrameIdRef.current = 0;
    latestFitRef.current = null;
    displayKeyRef.current = "";
    displayRef.current = null;
    statusRef.current = { fitting: "unloaded", body: "searching" };

    setRawLandmarks([]);
    setIsCameraActive(false);
    setCameraStatus("idle");
    setBodyTrackingStatus("searching");
    setGarmentFittingStatus("unloaded");
    setTrackingStatus("idle");
    setBodyMeasurements(null);
    setGarmentEase(null);
    setDiagnosticMetrics(null);
    setDisplayTransform(null);
    setEstimatedDistanceZ(undefined);
    setDistanceMode("uninitialized");
  }, []);

  useEffect(() => () => teardownAR(), [teardownAR]);

  // Pause-safe timing: after a hidden tab, rAF resumes with a huge gap; reset frame timing.
  useEffect(() => {
    const onVis = () => {
      if (!document.hidden) threeSceneRef.current?.resetTiming();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const buildDiagnostics = (fit: DetailedFittingResult, video: HTMLVideoElement, fitting: FittingEngine, scene: ThreeSceneManager): DiagnosticMetrics => {
    const K = fitting.calibrationManager.getIntrinsics();
    const d = displayRef.current;
    const sd = scene.getDiagnostics();
    const tracker = poseTrackerRef.current;
    const dpr = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 2) : 1;
    return {
      camera: {
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        containerWidth: containerSizeRef.current.width,
        containerHeight: containerSizeRef.current.height,
        canvasWidth: Math.round(containerSizeRef.current.width * dpr),
        canvasHeight: Math.round(containerSizeRef.current.height * dpr),
        dpr: typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1,
        fit: VIDEO_OBJECT_FIT,
        displayScale: d?.scaleX ?? NaN,
        offsetX: d?.offsetX ?? NaN,
        offsetY: d?.offsetY ?? NaN,
        mirrored: cameraManagerRef.current?.mirror.value === true,
        mirrorSource: cameraManagerRef.current?.mirror.source ?? "none",
        fx: K.fx,
        fy: K.fy,
        cx: K.cx,
        cy: K.cy,
        calibrationMethod: K.calibrationMethod,
        isCalibrated: K.isCalibrated,
      },
      tracking: {
        status: tracker?.status ?? "idle",
        landmarkConfidence: fit.tracking.landmarkConfidence,
        shoulderSpanPx: fit.tracking.shoulderSpanPx,
        shoulderVisibility: fit.tracking.shoulderVisibility,
        hipVisibility: fit.tracking.hipVisibility,
        yawDeg: (fit.tracking.yawRad * 180) / Math.PI,
        yawSource: fit.tracking.yawSource,
        jitterPx: fit.tracking.landmarkJitterPx,
        proportionSource: fit.tracking.proportionSource,
        pnpValid: fit.pnpResult.valid,
        pnpReason: fit.pnpResult.reason,
        reprojectionErrorPx: fit.pnpResult.reprojectionError,
        pnpIterations: fit.pnpResult.iterations,
        rootPosition: fit.pnpResult.rootPosition,
      },
      distance: {
        mode: fit.distance.mode,
        distanceM: fit.distance.distanceM,
        confidence: fit.distance.confidence,
        rawSpanPx: fit.distance.rawSpanPx,
        correctedSpanPx: fit.distance.correctedSpanPx,
        referenceSpanPx: fit.distance.referenceSpanPx,
        referenceDistanceM: fit.distance.referenceDistanceM,
        shoulderBreadthM: fit.distance.shoulderBreadthM,
        breadthSource: fit.distance.breadthSource,
        samplesCollected: fit.distance.samplesCollected,
        samplesRequired: fit.distance.samplesRequired,
      },
      garment: sd.garment,
      performance: {
        renderFps: currentRenderFpsRef.current,
        inferenceFps: tracker?.stats.inferenceFps ?? 0,
        inferenceMs: tracker?.stats.inferenceMs ?? 0,
        fitMs: fit.fitDurationMs,
        garmentUpdateMs: sd.garmentUpdateMs,
        simStepMs: sd.garment?.simulation.stepMs ?? 0,
        renderMs: sd.renderMs,
        frameMs: lastFrameMsRef.current,
        drawCalls: sd.drawCalls,
        triangles: sd.triangles,
        delegate: tracker?.stats.delegate ?? "none",
      },
      operatingMode: fit.operatingMode,
      framingGuidance: fit.framingGuidance,
      measurements: fit.measurements,
      ease: fit.ease,
      registration: d
        ? computeRegistration({
            display: d,
            mirrored: cameraManagerRef.current?.mirror.value === true,
            raw: poseFrameRef.current.landmarks,
            smoothed: {
              left_shoulder: poseFrameRef.current.keypoints?.leftShoulder,
              right_shoulder: poseFrameRef.current.keypoints?.rightShoulder,
              left_hip: poseFrameRef.current.keypoints?.leftHip,
              right_hip: poseFrameRef.current.keypoints?.rightHip,
            },
            projected: scene.registrationPixels(d),
          })
        : null,
      frameDiag: buildFrameDiag(fit, scene, d, performance.now()),
      stage1: (() => {
        const e = new THREE.Euler().setFromQuaternion(new THREE.Quaternion(...fit.bodyPose.quaternion), "YXZ");
        const deg = (r: number) => (r * 180) / Math.PI;
        const lm = poseFrameRef.current.landmarks;
        const vis = lm.length ? lm.reduce((a, p) => a + (p.visibility ?? 0), 0) / lm.length : 0;
        return {
          renderFrame: sd.frame.renderFrame,
          poseFrameId: poseFrameRef.current.frameId,
          poseTimestampMs: poseFrameRef.current.keypoints?.timestamp ?? null,
          dtMs: sd.frame.dtMs,
          lerpA: sd.frame.lerpA,
          snapped: sd.frame.snapped,
          targetPos: sd.frame.targetPos,
          bodyRootPos: sd.frame.bodyRootPos,
          parented: sd.frame.garmentParentedToBodyRoot,
          visible: sd.frame.bodyRootVisible,
          rootEulerDeg: { yaw: deg(e.y), pitch: deg(e.x), roll: deg(e.z) },
          meanVisibility: vis,
          pnpSolveMs: fit.tracking.pnpSolveMs,
          orientation: sd.orientation,
          probeRgb: sd.probeRgb,
          materialMode: sd.materialMode,
        };
      })(),
    };
  };

  /** Builds one session frame from the live objects of THIS tick (called right after render). */
  const recordConsumedFrame = (
    pf: typeof poseFrameRef.current,
    fit: DetailedFittingResult | null,
    sceneNow: ThreeSceneManager,
    fitting: FittingEngine,
    video: HTMLVideoElement,
    vW: number,
    vH: number,
    nowMs: number
  ) => {
    const dsp = displayRef.current;
    const K = fitting.calibrationManager.getIntrinsics();
    const geom = sceneNow.renderGeometry();
    const wrapper = threeContainerRef.current?.parentElement;
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    const kp = pf.keypoints;
    const reg = dsp
      ? computeRegistration({
          display: dsp,
          mirrored: cameraManagerRef.current?.mirror.value === true,
          raw: pf.landmarks,
          smoothed: { left_shoulder: kp?.leftShoulder, right_shoulder: kp?.rightShoulder, left_hip: kp?.leftHip, right_hip: kp?.rightHip },
          projected: sceneNow.registrationPixels(dsp),
        })
      : null;
    recorderRef.current.consume(
      {
        t: pf.t,
        mediaTime: pf.mediaTime,
        video: { w: vW, h: vH },
        container: { w: containerSizeRef.current.width, h: containerSizeRef.current.height },
        dpr,
        displayMode: "live",
        presentedMediaTime: null,
        render: {
          canvasClient: geom?.canvasClient ?? { w: 0, h: 0 },
          canvasBuffer: geom?.canvasBuffer ?? { w: 0, h: 0 },
          drawingBuffer: geom?.drawingBuffer ?? { w: 0, h: 0 },
          rendererPixelRatio: geom?.rendererPixelRatio ?? 0,
          dpr,
          wrapperTransform: wrapper ? getComputedStyle(wrapper).transform : "none",
        },
        raw: toSessionLandmarks(pf.landmarks) ?? [],
        world: toSessionLandmarks(pf.world),
        garmentId: selectedGarmentRef.current.id,
        k: [K.fx, K.fy, K.cx, K.cy],
        out: {
          pose: fit
            ? {
                position: fit.bodyPose.position,
                quaternion: fit.bodyPose.quaternion,
                valid: fit.pnpResult.valid,
                reason: fit.pnpResult.reason ?? null,
                reprojPx: Number.isFinite(fit.pnpResult.reprojectionError) ? fit.pnpResult.reprojectionError : null,
                usedPoints: fit.pnpResult.usedPoints,
              }
            : null,
          pnpKeypointsCam: fit ? fit.pnpKeypointsCamera : null,
          smoothedRoot: {
            position: [sceneNow.bodyRoot.position.x, sceneNow.bodyRoot.position.y, sceneNow.bodyRoot.position.z],
            quaternion: [sceneNow.bodyRoot.quaternion.x, sceneNow.bodyRoot.quaternion.y, sceneNow.bodyRoot.quaternion.z, sceneNow.bodyRoot.quaternion.w],
          },
          registration: reg,
          distance: fit ? { z: fit.distance.distanceM, mode: fit.distance.mode } : null,
          timings: { inferMs: poseTrackerRef.current?.stats.inferenceMs ?? 0, fitMs: fit?.fitDurationMs ?? 0, renderMs: sceneNow.renderDurationMs },
          diag: buildFrameDiag(fit, sceneNow, dsp, nowMs),
        },
      },
      pf.t
    );
  };

  const startRecording = () => {
    const scene = threeSceneRef.current, fitting = fittingEngineRef.current, cam = cameraManagerRef.current, video = videoRef.current;
    if (!scene || !fitting || !cam || !video) return;
    const K = fitting.calibrationManager.getIntrinsics();
    const vs = getComputedStyle(video);
    scene.ensureRegistrationProbes();
    // Armed now; actually started by onBeforeSmooth on the next detected pose frame.
    pendingRecordHeaderRef.current = (
      {
        schema: "drape-ar-session/1",
        createdAt: new Date().toISOString(),
        appCommit: process.env.NEXT_PUBLIC_APP_COMMIT || null,
        userAgent: navigator.userAgent,
        modelId: POSE_MODEL_ID,
        poseOptions: { ...POSE_OPTIONS },
        trackSettings: cam.trackSettings,
        mirror: cam.mirror,
        garmentId: selectedGarmentRef.current.id,
        calibration: { fx: K.fx, fy: K.fy, cx: K.cx, cy: K.cy, width: K.width, height: K.height, method: K.calibrationMethod },
        video: { objectFit: vs.objectFit, objectPosition: vs.objectPosition },
      }
    );
    setSavedSessionName(null);
    setLastMarker(null);
    setRecordElapsedS(0);
    setRecordFrames(0);
    setRecording(true);
  };

  const stopAndSaveRecording = () => {
    pendingRecordHeaderRef.current = null;
    const file: SessionFile | null = recorderRef.current.stop();
    setRecording(false);
    if (!file) return;
    const ua = navigator.userAgent;
    const browser = /Edg\//.test(ua) ? "edge" : /Chrome\//.test(ua) ? "chrome" : /Safari\//.test(ua) ? "safari" : /Firefox\//.test(ua) ? "firefox" : "browser";
    const name = `drape-session-${browser}-${file.header.createdAt.replace(/[:.]/g, "-")}.json`;
    // Local download only (object URL); nothing is sent over the network.
    const url = URL.createObjectURL(new Blob([JSON.stringify(file)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    setSavedSessionName(`${name} (${file.frames.length} frames, ${file.images.length} snapshots)`);
  };

  // Hotkeys 1–8 label the current position while recording; ignored when typing in a form control.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!recorderRef.current.active || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = document.activeElement as HTMLElement | null;
      if (el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable)) return;
      const p = recorderRef.current.markByHotkey(e.key);
      if (p) setLastMarker(p);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    includeSnapshotsRef.current = includeSnapshots;
  }, [includeSnapshots]);

  const startPoseTracking = async (session: number) => {
    const video = videoRef.current;
    const tracker = poseTrackerRef.current;
    if (!video || !tracker) return;
    const callbacks: PoseTrackerCallbacks = {
      onKeypoints: (keypoints, landmarks, meta) => {
        if (session !== sessionRef.current) return;
        poseFrameRef.current = {
          keypoints,
          landmarks,
          frameId: poseFrameRef.current.frameId + 1,
          t: meta?.timestampMs ?? performance.now(),
          mediaTime: meta?.mediaTime ?? null,
          world: meta?.world,
        };
        recorderRef.current.notePoseFrame(poseFrameRef.current.t, landmarks, meta?.world);
        if (overlaysVisibleRef.current) setRawLandmarks(landmarks);
        const body: BodyTrackingStatus = keypoints ? "detected" : "lost";
        if (statusRef.current.body !== body) {
          statusRef.current.body = body;
          setBodyTrackingStatus(body);
          setTrackingStatus(keypoints ? "body_detected" : "body_lost");
        }
      },
      onBeforeSmooth: (t) => {
        // A pending recording starts HERE, before this frame is smoothed, from a clean pipeline state, so offline
        // replay (which starts fresh) reproduces it. Visible effect: one re-snap + distance re-initialisation.
        const pend = pendingRecordHeaderRef.current;
        if (!pend || session !== sessionRef.current) return;
        pendingRecordHeaderRef.current = null;
        frameStepRef.current?.reset();
        threeSceneRef.current?.resetTracking();
        recorderRef.current.start(pend, t);
      },
      onStatusChange: (status) => {
        if (session === sessionRef.current) setTrackingStatus(status);
      },
      onError: (err) => {
        console.error("AR Pose Tracking Error:", err);
        if (session === sessionRef.current) setErrorMessage("Spatial tracking interrupted. Repositioning...");
      },
    };
    poseCallbacksRef.current = callbacks;
    await tracker.startTracking(video, callbacks);
  };

  const handleStartCamera = async () => {
    if (renderRafRef.current !== null) return; // already running
    const session = ++sessionRef.current;
    setErrorMessage(null);
    setCameraStatus("initializing");
    setTrackingStatus("initializing");

    try {
      if (!videoRef.current || !threeContainerRef.current) throw new Error("VIEWPORT_CONTAINER_UNAVAILABLE");

      const cameraManager = new CameraManager();
      cameraManagerRef.current = cameraManager;
      const { width, height, aspect } = await cameraManager.startCamera(videoRef.current, { facingMode: "user" });
      if (session !== sessionRef.current) return;
      setCameraAspect(aspect);
      setIsMirrored(cameraManager.mirror.value);
      setCameraStatus("active");

      threeContainerRef.current.innerHTML = "";
      const scene = new ThreeSceneManager(threeContainerRef.current);
      threeSceneRef.current = scene;
      scene.resize(threeContainerRef.current.clientWidth, threeContainerRef.current.clientHeight);

      const frameStep = new FrameStep(width, height);
      frameStepRef.current = frameStep;
      const fitting = frameStep.engine;
      fittingEngineRef.current = fitting;
      setIsCalibrated(false);

      setFittingStatus("loading");
      await scene.loadGarment(selectedGarmentRef.current);
      if (session !== sessionRef.current) return;
      setFittingStatus("ready");

      poseTrackerRef.current = new PoseTracker(frameStep.smoother);
      await startPoseTracking(session);
      if (session !== sessionRef.current) return;

      lastFpsTimeRef.current = performance.now();
      const renderLoop = (now: number) => {
        if (session !== sessionRef.current) return;
        const t0 = performance.now();
        const sceneNow = threeSceneRef.current;
        const fittingEngine = fittingEngineRef.current;
        const video = videoRef.current;

        renderFrameCountRef.current++;
        if (now - lastFpsTimeRef.current >= 500) {
          currentRenderFpsRef.current = (renderFrameCountRef.current * 1000) / (now - lastFpsTimeRef.current);
          renderFrameCountRef.current = 0;
          lastFpsTimeRef.current = now;
        }

        if (sceneNow && fittingEngine && video && video.videoWidth > 0) {
          const vW = video.videoWidth;
          const vH = video.videoHeight;
          fittingEngine.calibrationManager.updateResolution(vW, vH);

          // 1–2. Display transform + projection (cheap no-ops when unchanged).
          const { width: cw, height: ch } = containerSizeRef.current;
          if (cw > 0 && ch > 0) {
            const display = computeVideoDisplayTransform(vW, vH, cw, ch, VIDEO_OBJECT_FIT);
            const key = `${vW}x${vH}|${cw}x${ch}`;
            if (key !== displayKeyRef.current) {
              displayKeyRef.current = key;
              displayRef.current = display;
              setDisplayTransform(display);
            }
            sceneNow.setProjection(fittingEngine.calibrationManager.getIntrinsics(), displayRef.current ?? display);
          }

          // 3. Fitting runs once per NEW pose frame.
          const pf = poseFrameRef.current;
          let consumed = false;
          if (pf.frameId !== processedFrameIdRef.current) {
            processedFrameIdRef.current = pf.frameId;
            consumed = true;
            if (pf.keypoints) {
              const fit = frameStepRef.current!.fit(pf.keypoints, selectedGarmentRef.current, vW, vH);
              latestFitRef.current = fit;
              sceneNow.setFrameTarget(fit, now);
              const dsp = displayRef.current;
              const kpL = pf.keypoints.leftShoulder, kpR = pf.keypoints.rightShoulder;
              sceneNow.setShoulderNdcHint(
                dsp ? { left: imageToNDC({ x: kpL.x * vW, y: kpL.y * vH }, dsp), right: imageToNDC({ x: kpR.x * vW, y: kpR.y * vH }, dsp) } : null
              );
              setFittingStatus(fit.pnpResult.valid ? "fitting_active" : "ready");
            } else {
              latestFitRef.current = null;
              sceneNow.setFrameTarget(null, now);
              setFittingStatus("ready");
            }
          }

          // 4. Render.
          sceneNow.render(now);

          // 4b. Session recording (same tick as the render).
          const rec = recorderRef.current;
          if (rec.active) {
            if (consumed) recordConsumedFrame(pf, latestFitRef.current, sceneNow, fittingEngine, video, vW, vH, now);
            rec.noteRender(now);
            const dsp = displayRef.current;
            if (includeSnapshotsRef.current && dsp && rec.wantsImage(now) && sceneNow.glCanvas) {
              const reg = sceneNow.registrationPixels(dsp);
              const cyan = [11, 12, 23, 24]
                .map((i) => pf.landmarks[i])
                .filter((l) => l && (l.visibility ?? 0) >= 0.5)
                .map((l) => imageToDisplay({ x: l.x * vW, y: l.y * vH }, dsp));
              const ls = pf.landmarks[11], rs = pf.landmarks[12];
              const png = composeSnapshot({
                video,
                glCanvas: sceneNow.glCanvas,
                display: dsp,
                mirrored: cameraManagerRef.current?.mirror.value === true,
                cyan,
                magenta: Object.values(reg.keypoints),
                anchor: reg.garmentAnchor,
                midShoulder: ls && rs ? imageToDisplay({ x: ((ls.x + rs.x) / 2) * vW, y: ((ls.y + rs.y) / 2) * vH }, dsp) : null,
              });
              if (png) rec.addImage(png, now);
            }
            if (rec.limitReached(now)) stopAndSaveRecording();
          }

          // 5. Throttled UI.
          const fit = latestFitRef.current;
          if (fit && now - lastUiUpdateRef.current > UI_UPDATE_INTERVAL_MS) {
            lastUiUpdateRef.current = now;
            setOperatingMode(fit.operatingMode);
            setFramingGuidance(fit.framingGuidance);
            setFramingMessage(fit.framingMessage);
            setEstimatedDistanceZ(fit.distance.distanceM);
            setDistanceMode(fit.distance.mode);
            setLandmarkConfidence(fit.tracking.landmarkConfidence);
            setBodyMeasurements(fit.measurements);
            setGarmentEase(fit.ease);
            setIsCalibrated(fittingEngine.calibrationManager.getIntrinsics().isCalibrated);
            if (diagnosticsVisibleRef.current) setDiagnosticMetrics(buildDiagnostics(fit, video, fittingEngine, sceneNow));
          }
          if (rec.active && now - lastRecordUiRef.current > 250) {
            lastRecordUiRef.current = now;
            setRecordElapsedS(rec.elapsedMs(now) / 1000);
            setRecordFrames(rec.frameCount);
          }
        }
        lastFrameMsRef.current = performance.now() - t0;
        renderRafRef.current = requestAnimationFrame(renderLoop);
      };

      renderRafRef.current = requestAnimationFrame(renderLoop);
      setIsCameraActive(true);
    } catch (err: unknown) {
      console.error("Failed to start Virtual Try-On:", err);
      const e = err as { message?: string };
      teardownAR();
      if (e.message === "CAMERA_PERMISSION_DENIED") {
        setErrorMessage("Camera access was denied. Please allow camera permissions in your browser.");
        setCameraStatus("denied");
        setTrackingStatus("permission_denied");
      } else if (e.message === "CAMERA_NOT_FOUND") {
        setErrorMessage("No camera was found on this device.");
        setCameraStatus("error");
        setTrackingStatus("error");
      } else if (e.message === "CAMERA_IN_USE") {
        setErrorMessage("The camera is in use by another application.");
        setCameraStatus("error");
        setTrackingStatus("error");
      } else if (e.message === "WEBGL_UNAVAILABLE") {
        setErrorMessage("WebGL2 is not supported on this device or browser.");
        setCameraStatus("unsupported");
        setTrackingStatus("unsupported");
      } else {
        setErrorMessage(e.message || "Failed to initialize 3D AR Try-On.");
        setCameraStatus("error");
        setTrackingStatus("error");
      }
    }
  };

  const handleSelectGarment = async (garment: GarmentMetadata) => {
    setSelectedGarment(garment);
    selectedGarmentRef.current = garment;
    const scene = threeSceneRef.current;
    if (!scene) return;
    const session = sessionRef.current;
    try {
      setFittingStatus("loading");
      await scene.loadGarment(garment);
      if (session !== sessionRef.current) return;
      setFittingStatus(latestFitRef.current?.pnpResult.valid ? "fitting_active" : "ready");
    } catch (err) {
      if (session !== sessionRef.current) return;
      console.error("Failed to load 3D garment mesh:", err);
      setFittingStatus("error");
      setErrorMessage(`Failed to switch to ${garment.name}`);
    }
  };

  const handleSwitchCamera = async () => {
    const cam = cameraManagerRef.current;
    if (!cam || !videoRef.current) return;
    const session = sessionRef.current;
    try {
      poseTrackerRef.current?.stopTracking();
      const res = await cam.switchCamera();
      if (session !== sessionRef.current || !res) return;
      setCameraAspect(res.aspect);
      setIsMirrored(cam.mirror.value);
      // New sensor: previous reference pose, proportions and temporal priors are invalid.
      fittingEngineRef.current?.resetSubjectState();
      fittingEngineRef.current?.calibrationManager.resetToPopulationPrior(res.width, res.height);
      setIsCalibrated(false);
      displayKeyRef.current = "";
      await startPoseTracking(session);
    } catch (err) {
      console.error("Camera switch error:", err);
      setErrorMessage("Could not switch camera.");
    }
  };

  const handleToggleSkeleton = () => setShowSkeleton((v) => !v);

  const handleApplyCardCalibration = () => {
    const fitting = fittingEngineRef.current;
    if (!fitting) return;
    try {
      const k = fitting.calibrationManager.calibrateWithReferenceCard(
        cardWidthPxInput,
        cardWidthPxInput / (85.6 / 53.98),
        cardDistanceInput
      );
      setIsCalibrated(k.isCalibrated);
      setCalibrationModalOpen(false);
    } catch {
      setErrorMessage("Calibration needs a positive card width and distance.");
    }
  };

  // Reset to Population Prior: the returned intrinsics become ACTIVE (version bump ⇒ the
  // projection matrix is rebuilt on the next frame).
  const handleResetPriorCalibration = () => {
    const fitting = fittingEngineRef.current;
    if (!fitting || !videoRef.current) return;
    const w = videoRef.current.videoWidth || 1280;
    const h = videoRef.current.videoHeight || 720;
    fitting.calibrationManager.resetToPopulationPrior(w, h);
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
            confidence={landmarkConfidence}
            operatingMode={operatingMode}
            isCalibrated={isCalibrated}
            estimatedDistanceZ={estimatedDistanceZ}
            distanceMode={distanceMode}
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
              isMirrored={isMirrored}
              trackingStatus={trackingStatus}
              rawLandmarks={rawLandmarks}
              showSkeleton={showSkeleton}
              onToggleSkeleton={handleToggleSkeleton}
              showDiagnostics={showDiagnostics}
              onToggleDiagnostics={() => setShowDiagnostics((prev) => !prev)}
              diagnosticMetrics={diagnosticMetrics}
              diagnosticLayers={diagnosticLayers}
              onDiagnosticLayersChange={setDiagnosticLayers}
              materialMode={materialMode}
              onMaterialModeChange={setMaterialMode}
              session={{
                recording,
                elapsedS: recordElapsedS,
                frames: recordFrames,
                lastMarker,
                includeSnapshots,
                savedName: savedSessionName,
                onRecord: startRecording,
                onStopSave: stopAndSaveRecording,
                onToggleSnapshots: () => setIncludeSnapshots((v) => !v),
              }}
              displayTransform={displayTransform}
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
              <span className="text-acid-lime">BODY PROXY • XPBD CLOTH</span>
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
                      <span>Body Estimate</span>
                    </span>
                    <span className="text-[9px] text-warm-ivory/50">
                      {bodyMeasurements.scaleSource === "known_distance"
                        ? `KNOWN-DISTANCE SCALE ±${bodyMeasurements.uncertaintyCm ?? "?"} CM`
                        : `ASSUMED BODY SCALE ±${bodyMeasurements.uncertaintyCm ?? "?"} CM`}
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
                          garmentEase.reliable === false
                            ? "text-warm-ivory/50"
                            : garmentEase.isTooSmall
                            ? "text-red-400"
                            : garmentEase.estimatedStrainPercent > 0
                            ? "text-amber-400"
                            : "text-acid-lime"
                        }`}
                      >
                        {garmentEase.reliable === false
                          ? "Indicative only — not a size recommendation"
                          : garmentEase.isTooSmall
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
              <h5 className="uppercase tracking-wider">Parametric Body Proxy Fitting</h5>
            </div>
            <p className="text-[11px] font-light leading-relaxed text-warm-ivory/60">
              MHR-inspired elliptical torso proxy posed by robust PnP. Garments are anchored to it, articulated at the sleeves and pushed out to body clearance via nearest-surface correspondence.
            </p>
          </div>

          <div className="p-4 bg-ink-black/40 border border-warm-ivory/10 space-y-2">
            <div className="flex items-center space-x-2 text-warm-ivory font-medium">
              <Layers className="w-4 h-4" />
              <h5 className="uppercase tracking-wider">XPBD Secondary Cloth Drape</h5>
            </div>
            <p className="text-[11px] font-light leading-relaxed text-warm-ivory/60">
              XPBD secondary motion on each garment&apos;s body panel (stretch, bending, tether and body-proxy collision), plus depth-only arm occlusion. Sleeves are articulated rigidly.
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
              Monocular RGB webcams do not provide absolute metric depth. Hold a standard credit/identity card (85.60 mm width) parallel to the camera at approximately 0.5 meters to calibrate the focal length. This does not calibrate your body size.
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
                <strong>Camera Projection:</strong> Pinhole model K (population prior or card-calibrated focal length) with an off-axis frustum that includes the video&apos;s object-fit crop. Mirroring is a single CSS reflection of the whole layer stack.
              </p>
              <p>
                <strong>Tracking & Jitter Filter:</strong> 1€ Filter (Casiez et al., 2012) on joint positions and quaternion SLERP in SO(3).
              </p>
              <p>
                <strong>Parametric Body:</strong> A simplified MHR-inspired proxy (elliptical torso sections, capsule limbs). It is not a full MHR reconstruction.
              </p>
              <p>
                <strong>Anthropometry:</strong> Body proportions are observed; absolute size is assumed from an anthropometric prior because a single webcam cannot measure it. Circumferences are indicative only.
              </p>
              <p>
                <strong>Cloth Dynamics:</strong> XPBD secondary simulation (fixed 60 Hz step) about the fitted garment shape, with stretch, bending, tether and collision constraints.
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
