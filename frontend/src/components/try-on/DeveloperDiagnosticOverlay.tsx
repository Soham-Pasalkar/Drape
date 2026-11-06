/**
 * DRAPE Developer AR Diagnostic Overlay
 *
 * Real-time diagnostic visualization:
 * 1. 2D MediaPipe landmarks & anatomical bone connections.
 * 2. 3D coordinate axes at garment root (X: Red, Y: Green, Z: Blue).
 * 3. Live telemetry metrics HUD:
 *    - Stream resolution & display resolution
 *    - Estimated metric distance Z(t)
 *    - Operating Mode & Framing Guidance
 *    - Anthropometric measurements (Chest, Waist, Hips, Shoulders)
 *    - Garment ease clearance & fabric strain percentage
 *    - PnP 6-DoF root pose & reprojection error
 *    - Inference & render frame rates
 */

"use client";

import React, { useRef, useEffect } from "react";
import {
  LandmarkPoint,
  OperatingMode,
  FramingGuidance,
  BodyMeasurements,
  GarmentEase,
} from "@/lib/ar/types";

export interface DiagnosticMetrics {
  videoResolution: { width: number; height: number };
  canvasResolution: { width: number; height: number; dpr: number };
  trackingFps: number;
  renderFps: number;
  operatingMode: OperatingMode;
  framingGuidance: FramingGuidance;
  estimatedDistanceZ: number;
  pnpRootPosition: [number, number, number];
  pnpRootRotation: [number, number, number, number];
  pnpReprojectionError: number;
  measurements: BodyMeasurements | null;
  ease: GarmentEase | null;
  activeGarmentId: string;
}

interface DeveloperDiagnosticOverlayProps {
  active: boolean;
  rawLandmarks: LandmarkPoint[];
  metrics: DiagnosticMetrics;
  isMirrored?: boolean;
}

export default function DeveloperDiagnosticOverlay({
  active,
  rawLandmarks,
  metrics,
  isMirrored = true,
}: DeveloperDiagnosticOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !active) {
      if (canvas) {
        const ctx = canvas.getContext("2d");
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Resize canvas internal buffer to client dimensions
    const rect = canvas.getBoundingClientRect();
    if (canvas.width !== rect.width || canvas.height !== rect.height) {
      canvas.width = rect.width;
      canvas.height = rect.height;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const w = canvas.width;
    const h = canvas.height;

    const toScreen = (pt: LandmarkPoint) => {
      const x = isMirrored ? (1.0 - pt.x) * w : pt.x * w;
      const y = pt.y * h;
      return { x, y };
    };

    // Draw 2D skeletal anatomical connections
    if (rawLandmarks.length >= 25) {
      const connections: [number, number][] = [
        [11, 12], // Shoulder line
        [11, 13], [13, 15], // Left arm
        [12, 14], [14, 16], // Right arm
        [11, 23], [12, 24], // Torso sides
        [23, 24], // Hip line
        [23, 25], [25, 27], // Left leg
        [24, 26], [26, 28], // Right leg
      ];

      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "rgba(41, 75, 255, 0.85)";

      connections.forEach(([i, j]) => {
        const p1 = rawLandmarks[i];
        const p2 = rawLandmarks[j];
        if (p1 && p2 && (p1.visibility ?? 1) > 0.4 && (p2.visibility ?? 1) > 0.4) {
          const pos1 = toScreen(p1);
          const pos2 = toScreen(p2);
          ctx.beginPath();
          ctx.moveTo(pos1.x, pos1.y);
          ctx.lineTo(pos2.x, pos2.y);
          ctx.stroke();
        }
      });

      // Draw spine line (mid-shoulder to mid-hip)
      const ls = rawLandmarks[11];
      const rs = rawLandmarks[12];
      const lh = rawLandmarks[23];
      const rh = rawLandmarks[24];
      if (ls && rs && lh && rh) {
        const midShoulder = { x: (ls.x + rs.x) / 2, y: (ls.y + rs.y) / 2 };
        const midHip = { x: (lh.x + rh.x) / 2, y: (lh.y + rh.y) / 2 };
        const s1 = toScreen(midShoulder as LandmarkPoint);
        const s2 = toScreen(midHip as LandmarkPoint);

        ctx.strokeStyle = "rgba(212, 255, 0, 0.85)";
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(s1.x, s1.y);
        ctx.lineTo(s2.x, s2.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Draw Landmark Dots
      [11, 12, 13, 14, 15, 16, 23, 24, 25, 26].forEach((idx) => {
        const pt = rawLandmarks[idx];
        if (pt && (pt.visibility ?? 1) > 0.4) {
          const pos = toScreen(pt);
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, 4, 0, 2 * Math.PI);
          ctx.fillStyle = idx === 11 || idx === 12 ? "#FF3B30" : "#D4FF00";
          ctx.fill();
          ctx.strokeStyle = "#000000";
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      });

      // Draw Projected 3D Axes at Mid-Shoulder Anchor
      if (ls && rs) {
        const shoulderCenter = toScreen({
          x: (ls.x + rs.x) / 2,
          y: (ls.y + rs.y) / 2,
        } as LandmarkPoint);

        const axisLength = 36;

        // X Axis (Red - pointing Right relative to body)
        ctx.strokeStyle = "#FF3333";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(shoulderCenter.x, shoulderCenter.y);
        ctx.lineTo(shoulderCenter.x + (isMirrored ? -axisLength : axisLength), shoulderCenter.y);
        ctx.stroke();

        // Y Axis (Green - pointing Up relative to body)
        ctx.strokeStyle = "#33FF33";
        ctx.beginPath();
        ctx.moveTo(shoulderCenter.x, shoulderCenter.y);
        ctx.lineTo(shoulderCenter.x, shoulderCenter.y - axisLength);
        ctx.stroke();

        // Z Axis (Blue - pointing Forward toward camera)
        ctx.strokeStyle = "#3388FF";
        ctx.beginPath();
        ctx.moveTo(shoulderCenter.x, shoulderCenter.y);
        ctx.lineTo(shoulderCenter.x - 12, shoulderCenter.y + 12);
        ctx.stroke();
      }
    }
  }, [active, rawLandmarks, metrics, isMirrored]);

  if (!active) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden font-mono text-[10px]">
      {/* 2D Diagnostic Canvas for Skeleton & Axes */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* Live Telemetry HUD Panel */}
      <div className="absolute bottom-12 left-4 bg-ink-black/90 backdrop-blur-md border border-acid-lime/40 p-3 rounded-sm text-warm-ivory/90 max-w-xs shadow-2xl space-y-1.5 pointer-events-auto">
        <div className="flex items-center justify-between border-b border-warm-ivory/15 pb-1 font-semibold text-acid-lime">
          <span>AR DIAGNOSTIC HUD</span>
          <span className="text-[9px] bg-acid-lime/20 px-1 py-0.5 rounded text-acid-lime">DEV</span>
        </div>

        <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[9.5px]">
          <span className="text-warm-ivory/60">Stream Res:</span>
          <span>{metrics.videoResolution.width}x{metrics.videoResolution.height}</span>

          <span className="text-warm-ivory/60">Display Res:</span>
          <span>{metrics.canvasResolution.width}x{metrics.canvasResolution.height} (@{metrics.canvasResolution.dpr.toFixed(1)}x)</span>

          <span className="text-warm-ivory/60">Render FPS:</span>
          <span className={metrics.renderFps < 25 ? "text-yellow-400" : "text-emerald-400"}>
            {metrics.renderFps.toFixed(0)} fps
          </span>

          <span className="text-warm-ivory/60">Mode:</span>
          <span className="text-electric-blue uppercase font-bold">{metrics.operatingMode}</span>

          <span className="text-warm-ivory/60">Distance Z:</span>
          <span className="text-acid-lime font-bold">{metrics.estimatedDistanceZ.toFixed(2)} m</span>

          <span className="text-warm-ivory/60">PnP Pos:</span>
          <span>
            [{metrics.pnpRootPosition[0].toFixed(2)}, {metrics.pnpRootPosition[1].toFixed(2)}, {metrics.pnpRootPosition[2].toFixed(2)}]
          </span>

          <span className="text-warm-ivory/60">Reproj Error:</span>
          <span>{metrics.pnpReprojectionError.toFixed(1)} px</span>
        </div>

        {metrics.measurements && (
          <div className="border-t border-warm-ivory/15 pt-1 space-y-0.5 text-[9px]">
            <div className="text-warm-ivory/60 font-semibold text-acid-lime">Anthropometry:</div>
            <div className="grid grid-cols-2 gap-x-2">
              <span>Chest: {metrics.measurements.chestCircumferenceCm.toFixed(1)} cm</span>
              <span>Waist: {metrics.measurements.waistCircumferenceCm.toFixed(1)} cm</span>
              <span>Hips: {metrics.measurements.hipCircumferenceCm.toFixed(1)} cm</span>
              <span>Shoulders: {metrics.measurements.shoulderBreadthCm.toFixed(1)} cm</span>
            </div>
          </div>
        )}

        {metrics.ease && (
          <div className="border-t border-warm-ivory/15 pt-1 space-y-0.5 text-[9px]">
            <div className="flex justify-between">
              <span className="text-warm-ivory/60">Ease / Strain:</span>
              <span className={metrics.ease.estimatedStrainPercent > 10 ? "text-red-400 font-bold" : "text-emerald-400"}>
                {((metrics.ease.chestEaseCm ?? metrics.ease.waistEaseCm ?? 0) >= 0 ? "+" : "") +
                  (metrics.ease.chestEaseCm ?? metrics.ease.waistEaseCm ?? 0).toFixed(1)} cm
                ({metrics.ease.estimatedStrainPercent.toFixed(1)}% strain)
              </span>
            </div>
            <div className="text-[8.5px] text-warm-ivory/70 uppercase">
              Fit: <span className="font-semibold text-acid-lime">{metrics.ease.fitAssessment}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
