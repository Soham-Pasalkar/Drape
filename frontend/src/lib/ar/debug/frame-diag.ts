/**
 * Per-frame tracking diagnostics shared by the HUD, the session recorder and replay (one implementation, so
 * live and replayed numbers are comparable). Diagnostics only — no behaviour.
 */

import type { DetailedFittingResult } from '../fitting-engine';
import type { ThreeSceneManager } from '../three-scene';
import type { VideoDisplayTransform } from '../coordinates';
import type { SessionFrameDiag } from '../session/schema';

export function buildFrameDiag(
  fit: DetailedFittingResult | null,
  scene: ThreeSceneManager,
  display: VideoDisplayTransform | null,
  nowMs: number
): SessionFrameDiag {
  const ts = scene.trackingState(nowMs);
  const d = fit?.distance;
  return {
    distance: d
      ? {
          mode: d.mode,
          z: d.distanceM,
          referenceSpanPx: d.referenceSpanPx,
          referenceDistanceM: d.referenceDistanceM,
          samplesCollected: d.samplesCollected,
          samplesRequired: d.samplesRequired,
          reason: d.reason,
          lastWindowSpread: d.lastWindowSpread,
          shoulderVisibility: fit!.tracking.shoulderVisibility,
          yawDeg: (fit!.tracking.yawRad * 180) / Math.PI,
        }
      : null,
    setFrameTarget: !fit ? 'null' : fit.pnpResult.valid ? 'fit' : 'invalid',
    pnp: fit ? { valid: fit.pnpResult.valid, reason: fit.pnpResult.reason ?? null } : null,
    lastValidPoseAgeMs: ts.lastValidPoseAgeMs,
    snapPending: ts.snapPending,
    lerpA: ts.lerpA,
    bodyRootVisible: ts.bodyRootVisible,
    garment: display ? scene.garmentGeometry(display) : null,
  };
}
