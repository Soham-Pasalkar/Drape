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

export class FrameStep {
  readonly smoother = new LandmarkSmoother();
  readonly engine: FittingEngine;

  constructor(videoWidth: number, videoHeight: number) {
    this.engine = new FittingEngine(videoWidth, videoHeight);
  }

  smooth(raw: LandmarkPoint[], timestampMs: number, world?: LandmarkPoint[]): BodyKeypoints | null {
    return this.smoother.process(raw, timestampMs, world);
  }

  fit(keypoints: BodyKeypoints, garment: GarmentMetadata, videoWidth: number, videoHeight: number): DetailedFittingResult {
    return this.engine.processFrame(keypoints, garment, videoWidth, videoHeight);
  }
}
