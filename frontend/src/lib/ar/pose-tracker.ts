/**
 * DRAPE Pose Tracker (Upgraded Vision Engine)
 *
 * MediaPipe Tasks Vision Pose Landmarker orchestration with:
 * - On-device WASM inference with GPU delegate and CPU fallback
 * - Strictly synchronized frame processing via requestVideoFrameCallback
 * - Image landmarks + 3D World landmarks extraction
 * - 1€ Filter landmark smoothing integration
 * - Volatile-only frame processing guaranteeing zero network transmission
 */

import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import { LandmarkPoint, BodyKeypoints, TrackingStatus } from './types';
import { LandmarkSmoother } from './landmark-smoother';

export interface PoseTrackerCallbacks {
  /**
   * Called once per inferred video frame. `meta` carries the raw (unsmoothed) world landmarks, the timestamp the
   * smoother used and the frame's mediaTime — everything a session recording needs to replay this frame.
   */
  onKeypoints?: (keypoints: BodyKeypoints | null, rawLandmarks: LandmarkPoint[], meta?: PoseFrameMeta) => void;
  onStatusChange?: (status: TrackingStatus) => void;
  /** Called right before a detected frame is smoothed (used to start a recording from a clean state). */
  onBeforeSmooth?: (timestampMs: number) => void;
  onError?: (error: Error) => void;
}

export interface PoseTrackerStats {
  /** Video frame callbacks fired (RVFC / RAF). */
  callbackCount: number;
  /** Actual detectForVideo calls executed. */
  inferenceCount: number;
  /** Frames where a body pose was successfully detected. */
  detectionCount: number;
  /** Frames where no pose was detected (or landmarks < 25 / filtered out). */
  emptyCount: number;
  /** Monotonic count of processed video frames (backward-compatible alias for inferenceCount). */
  frameCount: number;
  /** Pose inferences per second (EMA). */
  inferenceFps: number;
  /** Duration of the last detectForVideo call (ms). */
  inferenceMs: number;
  /** Last observed mediaTime (seconds), or null if unavailable / not provided. */
  lastMediaTime: number | null;
  /** Timestamp (performance.now()) of the last successful inference. */
  lastInferenceAt: number;
  delegate: 'GPU' | 'CPU' | 'none';
}

type VideoWithRVFC = HTMLVideoElement & {
  requestVideoFrameCallback?: (cb: (now: number, metadata: { mediaTime: number }) => void) => number;
  cancelVideoFrameCallback?: (handle: number) => void;
};

export interface PoseFrameMeta {
  world: LandmarkPoint[] | undefined;
  timestampMs: number;
  mediaTime: number | null;
}

export const POSE_MODEL_ID = 'pose_landmarker_lite';
/** Landmarker options (recorded in session headers). */
export const POSE_OPTIONS = {
  modelAssetPath: `/models/${POSE_MODEL_ID}.task`,
  runningMode: 'VIDEO' as const,
  numPoses: 1,
  minPoseDetectionConfidence: 0.5,
  minPosePresenceConfidence: 0.5,
  minTrackingConfidence: 0.5,
  outputSegmentationMasks: false,
};

export class PoseTracker {
  private landmarker: PoseLandmarker | null = null;
  private smoother: LandmarkSmoother;
  private isInitializing = false;
  private isTracking = false;
  private rvfcHandle: number | null = null;
  private rafId: number | null = null;
  private lastTimestamp = -1;
  private currentStatus: TrackingStatus = 'idle';
  private trackedVideo: VideoWithRVFC | null = null;
  private lastInferenceTime = 0;
  public stats: PoseTrackerStats = {
    callbackCount: 0,
    inferenceCount: 0,
    detectionCount: 0,
    emptyCount: 0,
    frameCount: 0,
    inferenceFps: 0,
    inferenceMs: 0,
    lastMediaTime: null,
    lastInferenceAt: 0,
    delegate: 'none',
  };

  private resetStats(): void {
    this.stats = {
      callbackCount: 0,
      inferenceCount: 0,
      detectionCount: 0,
      emptyCount: 0,
      frameCount: 0,
      inferenceFps: 0,
      inferenceMs: 0,
      lastMediaTime: null,
      lastInferenceAt: 0,
      delegate: this.stats.delegate,
    };
  }

  /** The smoother is injected so the live app and replay share one instance (pipeline/frame-step.ts). */
  constructor(smoother: LandmarkSmoother = new LandmarkSmoother()) {
    this.smoother = smoother;
  }

  /**
   * Initializes MediaPipe Pose Landmarker using local WASM and task model.
   */
  async initialize(): Promise<void> {
    if (this.landmarker) return;
    if (this.isInitializing) return;

    this.isInitializing = true;
    this.setStatus('initializing');

    try {
      // Load wasm binaries from local origin /wasm
      const vision = await FilesetResolver.forVisionTasks('/wasm');

      const modelOptions = POSE_OPTIONS;

      try {
        // Attempt GPU delegate first for optimal real-time performance
        this.landmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: modelOptions.modelAssetPath,
            delegate: 'GPU',
          },
          ...modelOptions,
        });
        this.stats.delegate = 'GPU';
      } catch (gpuError) {
        console.warn('PoseTracker: GPU delegate unavailable, falling back to CPU', gpuError);
        this.landmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: modelOptions.modelAssetPath,
            delegate: 'CPU',
          },
          ...modelOptions,
        });
        this.stats.delegate = 'CPU';
      }

      this.setStatus('camera_active');
    } catch (err: unknown) {
      console.error('PoseTracker: Failed to initialize MediaPipe Pose Landmarker', err);
      this.setStatus('error');
      throw err;
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Begins tracking pose on a live HTML5 video stream with synchronized frame processing.
   */
  async startTracking(
    video: HTMLVideoElement,
    callbacks: PoseTrackerCallbacks
  ): Promise<void> {
    if (!this.landmarker) {
      await this.initialize();
    }

    if (!this.landmarker) {
      throw new Error('POSE_TRACKER_NOT_INITIALIZED');
    }

    this.stopTracking();
    this.isTracking = true;
    this.lastTimestamp = -1;
    this.lastInferenceTime = 0;
    this.resetStats();
    this.smoother.reset();

    this.trackedVideo = video as VideoWithRVFC;

    const processFrame = (mediaTime?: number) => {
      if (!this.isTracking || !this.landmarker) return;

      this.stats.callbackCount++;
      if (mediaTime !== undefined && Number.isFinite(mediaTime)) {
        this.stats.lastMediaTime = mediaTime;
      }

      try {
        if (
          video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
          !video.paused &&
          !video.ended &&
          video.videoWidth > 0 &&
          video.videoHeight > 0
        ) {
          const now = performance.now();
          if (now > this.lastTimestamp) {
            this.lastTimestamp = now;
            this.stats.inferenceCount++;
            this.stats.frameCount++;

            const result = this.landmarker.detectForVideo(video, now);
            const done = performance.now();
            this.stats.inferenceMs = done - now;
            this.stats.lastInferenceAt = done;
            if (this.lastInferenceTime > 0) {
              const inst = 1000 / Math.max(1, done - this.lastInferenceTime);
              this.stats.inferenceFps =
                this.stats.inferenceFps === 0 ? inst : this.stats.inferenceFps * 0.9 + inst * 0.1;
            }
            this.lastInferenceTime = done;

            if (result.landmarks && result.landmarks.length > 0 && result.landmarks[0].length >= 25) {
              const rawLandmarks: LandmarkPoint[] = result.landmarks[0].map((lm) => ({
                x: lm.x,
                y: lm.y,
                z: lm.z,
                visibility: lm.visibility,
                presence: lm.presence,
              }));

              let worldLandmarks: LandmarkPoint[] | undefined;
              if (result.worldLandmarks && result.worldLandmarks.length > 0) {
                worldLandmarks = result.worldLandmarks[0].map((lm) => ({
                  x: lm.x,
                  y: lm.y,
                  z: lm.z,
                  visibility: lm.visibility,
                  presence: lm.presence,
                }));
              }

              callbacks.onBeforeSmooth?.(now);
              const smoothed = this.smoother.process(rawLandmarks, now, worldLandmarks);
              const meta: PoseFrameMeta = {
                world: worldLandmarks,
                timestampMs: now,
                mediaTime: this.stats.lastMediaTime,
              };

              if (smoothed) {
                this.stats.detectionCount++;
                this.setStatus('body_detected', callbacks.onStatusChange);
                callbacks.onKeypoints?.(smoothed, rawLandmarks, meta);
              } else {
                this.stats.emptyCount++;
                this.setStatus('body_lost', callbacks.onStatusChange);
                callbacks.onKeypoints?.(null, rawLandmarks, meta);
              }
            } else {
              this.stats.emptyCount++;
              this.setStatus('body_lost', callbacks.onStatusChange);
              callbacks.onKeypoints?.(null, [], {
                world: undefined,
                timestampMs: now,
                mediaTime: this.stats.lastMediaTime,
              });
            }
          }
        }
      } catch (err) {
        console.error('PoseTracker: Error during frame detection', err);
        callbacks.onError?.(err as Error);
      }

      if (this.isTracking) {
        this.scheduleNextFrame(video, processFrame);
      }
    };

    this.scheduleNextFrame(video, processFrame);
  }

  private scheduleNextFrame(video: HTMLVideoElement, callback: (mediaTime?: number) => void): void {
    const v = video as VideoWithRVFC;
    // Prefer requestVideoFrameCallback: fires once per decoded camera frame.
    if (typeof v.requestVideoFrameCallback === 'function') {
      this.rvfcHandle = v.requestVideoFrameCallback((_now, metadata) => callback(metadata?.mediaTime));
    } else {
      this.rafId = requestAnimationFrame(() => callback());
    }
  }

  /**
   * Stops tracking loop and resets smoother state.
   */
  stopTracking(): void {
    this.isTracking = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.rvfcHandle !== null && this.trackedVideo?.cancelVideoFrameCallback) {
      this.trackedVideo.cancelVideoFrameCallback(this.rvfcHandle);
    }
    this.rvfcHandle = null;
    this.trackedVideo = null;
    this.smoother.reset();
    this.lastTimestamp = -1;
    this.lastInferenceTime = 0;
    this.resetStats();
  }

  /**
   * Disposes MediaPipe landmarker and cleans up all resources.
   */
  dispose(): void {
    this.stopTracking();
    if (this.landmarker) {
      try {
        this.landmarker.close();
      } catch {
        // ignore
      }
      this.landmarker = null;
    }
    this.currentStatus = 'idle';
  }

  private setStatus(status: TrackingStatus, callback?: (status: TrackingStatus) => void): void {
    if (this.currentStatus !== status) {
      this.currentStatus = status;
      callback?.(status);
    }
  }

  get status(): TrackingStatus {
    return this.currentStatus;
  }
}
