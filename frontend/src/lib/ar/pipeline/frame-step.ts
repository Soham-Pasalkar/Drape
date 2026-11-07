/**
 * The per-frame pipeline shared by the live app and offline replay (FR-19):
 *   smooth(raw, t, world)   — once per POSE frame (called by PoseTracker with this smoother instance)
 *   fit(keypoints, …)       — once per frame the render loop consumes
 * Rendering-side steps (PoseSmoother in ThreeSceneManager.setPose, registration metrics) are separate modules.
 * No DOM, no WebGL.
 */

import { BodyKeypoints, GarmentMetadata, LandmarkPoint } from '../types';
import { LandmarkSmoother } from '../landmark-smoother';
import { FittingEngine, DetailedFittingResult } from '../fitting-engine';

/**
 * Version of the per-frame pipeline's BEHAVIOUR. Bump on every intended behaviour change; recorded in session
 * headers so replay only demands ≤ 1 px agreement for sessions recorded with the same version.
 *  1 — M1 (reference-window depth)          2 — instant depth, no calibration gate (2026-11-07 fix item 2)
 */
export const PIPELINE_VERSION = 2;

export class FrameStep {
  readonly smoother = new LandmarkSmoother();
  readonly engine: FittingEngine;

  constructor(videoWidth: number, videoHeight: number) {
    this.engine = new FittingEngine(videoWidth, videoHeight);
  }

  /** Clears smoother + per-subject fitting state (recording start; replay starts from the same state). */
  reset(): void {
    this.smoother.reset();
    this.engine.resetSubjectState();
  }

  smooth(raw: LandmarkPoint[], timestampMs: number, world?: LandmarkPoint[]): BodyKeypoints | null {
    return this.smoother.process(raw, timestampMs, world);
  }

  fit(keypoints: BodyKeypoints, garment: GarmentMetadata, videoWidth: number, videoHeight: number): DetailedFittingResult {
    return this.engine.processFrame(keypoints, garment, videoWidth, videoHeight);
  }
}
