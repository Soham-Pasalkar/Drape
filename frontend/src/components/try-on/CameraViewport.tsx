/**
 * DRAPE Interactive 3D AR Camera Viewport
 *
 * Implements:
 * 1. Synchronized video stream & WebGL2 canvas viewport alignment.
 *    MIRRORING POLICY: the <video>, the WebGL container and every 2D overlay canvas live in ONE
 *    wrapper that receives a single CSS scaleX(-1) for selfie cameras. Nothing inside is
 *    mirrored individually and the projection matrix is never mirrored (lib/ar/coordinates.ts).
 *    Overlays map landmarks through the same object-fit display transform as the video.
 * 2. Visual Calibration Skeleton & MHR Body Proxy Overlay.
 * 3. Real-time Studio Framing Guidance (Step Back / Move Closer / Center).
 * 4. ISO ID-1 Reference Card Calibration Tool Trigger.
 */

"use client";

import React, { useRef, useEffect } from "react";
import {
  Camera,
  RotateCw,
  Eye,
  EyeOff,
  Sparkles,
  UserCheck,
  Ruler,
  AlertTriangle,
  Layers,
  Activity,
} from "lucide-react";
import { LandmarkPoint, TrackingStatus, FramingGuidance } from "@/lib/ar/types";
import { VideoDisplayTransform, imageToDisplay } from "@/lib/ar/coordinates";
import DeveloperDiagnosticOverlay, {
  DiagnosticCanvasLayer,
  DiagnosticLayers,
  DiagnosticMetrics,
} from "./DeveloperDiagnosticOverlay";

interface CameraViewportProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  threeContainerRef: React.RefObject<HTMLDivElement>;
  isMirrored?: boolean;
  trackingStatus: TrackingStatus;
  rawLandmarks?: LandmarkPoint[];
  showSkeleton?: boolean;
  onToggleSkeleton?: () => void;
  showDiagnostics?: boolean;
  onToggleDiagnostics?: () => void;
  diagnosticMetrics?: DiagnosticMetrics | null;
  diagnosticLayers: DiagnosticLayers;
  onDiagnosticLayersChange: (layers: DiagnosticLayers) => void;
  /** CSS object-fit transform of the video inside this viewport (null until video metadata). */
  displayTransform?: VideoDisplayTransform | null;
  onSwitchCamera?: () => void;
  onOpenCalibration?: () => void;
  aspectRatio?: number;
  framingGuidance?: FramingGuidance;
  framingMessage?: string;
  isCalibrated?: boolean;
}

export default function CameraViewport({
  videoRef,
  threeContainerRef,
  isMirrored = true,
  trackingStatus,
  rawLandmarks = [],
  showSkeleton = false,
  onToggleSkeleton,
  showDiagnostics = false,
  onToggleDiagnostics,
  diagnosticMetrics = null,
  diagnosticLayers,
  onDiagnosticLayersChange,
  displayTransform = null,
  onSwitchCamera,
  onOpenCalibration,
  aspectRatio = 16 / 9,
  framingGuidance = "good_framing",
  framingMessage,
  isCalibrated = false,
}: CameraViewportProps) {
  const skeletonCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Keyboard shortcut listener ('D' toggles Developer Diagnostics)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "d" || e.key === "D") && !e.metaKey && !e.ctrlKey) {
        // Only if not focused on an input element
        if (
          document.activeElement?.tagName !== "INPUT" &&
          document.activeElement?.tagName !== "TEXTAREA"
        ) {
          onToggleDiagnostics?.();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onToggleDiagnostics]);

  // Calibration skeleton, drawn in container CSS pixels through the video display transform.
  // The canvas sits inside the mirrored layer stack, so no per-point mirroring is applied.
  useEffect(() => {
    const canvas = skeletonCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    const cssW = displayTransform?.containerWidth ?? canvas.clientWidth;
    const cssH = displayTransform?.containerHeight ?? canvas.clientHeight;
    if (canvas.width !== Math.round(cssW * dpr) || canvas.height !== Math.round(cssH * dpr)) {
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);
    if (!showSkeleton || !displayTransform || rawLandmarks.length < 25) return;

    const getPos = (pt: LandmarkPoint) =>
      imageToDisplay({ x: pt.x * displayTransform.videoWidth, y: pt.y * displayTransform.videoHeight }, displayTransform);

    const connections: [number, number][] = [
      [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
      [11, 23], [12, 24], [23, 24], [23, 25], [24, 26], [25, 27], [26, 28],
    ];
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "rgba(41, 75, 255, 0.85)";
    connections.forEach(([i, j]) => {
      const p1 = rawLandmarks[i];
      const p2 = rawLandmarks[j];
      if (p1 && p2 && (p1.visibility ?? 1) > 0.35 && (p2.visibility ?? 1) > 0.35) {
        const a = getPos(p1);
        const b = getPos(p2);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    });
    [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28].forEach((idx) => {
      const pt = rawLandmarks[idx];
      if (pt && (pt.visibility ?? 1) > 0.35) {
        const p = getPos(pt);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4.5, 0, 2 * Math.PI);
        ctx.fillStyle = "#D4FF00";
        ctx.fill();
        ctx.strokeStyle = "#0A0A0A";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    });
  }, [rawLandmarks, showSkeleton, displayTransform]);

  return (
    <div
      className="relative w-full bg-ink-black rounded-sm overflow-hidden border border-warm-ivory/20 shadow-2xl group"
      style={{ aspectRatio: `${aspectRatio}` }}
    >
      {/* 1–3. Mirrored layer stack: video, WebGL canvas and 2D overlays share ONE reflection. */}
      <div
        className="absolute inset-0"
        style={{ transform: isMirrored ? "scaleX(-1)" : undefined }}
        data-testid="ar-layer-stack"
      >
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: "50% 50%" }}
          playsInline
          muted
          autoPlay
        />
        <div ref={threeContainerRef} className="absolute inset-0 w-full h-full pointer-events-none z-10" />
        <canvas ref={skeletonCanvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-20" />
        <DiagnosticCanvasLayer
          active={showDiagnostics}
          rawLandmarks={rawLandmarks}
          display={displayTransform}
          layers={diagnosticLayers}
        />
      </div>

      {/* 3b. Developer diagnostics HUD (outside the mirrored stack so text stays readable) */}
      <DeveloperDiagnosticOverlay
        active={showDiagnostics}
        metrics={diagnosticMetrics}
        layers={diagnosticLayers}
        onLayersChange={onDiagnosticLayersChange}
      />

      {/* 4. Real-Time Framing Guidance HUD (When user needs to step back / center) */}
      {framingGuidance !== "good_framing" && framingMessage && (
        <div className="absolute top-4 left-4 right-16 z-30 pointer-events-none flex items-center">
          <div className="px-3.5 py-1.5 bg-ink-black/85 backdrop-blur-md border border-acid-lime/50 text-acid-lime text-xs font-mono flex items-center space-x-2 shadow-xl animate-pulse rounded-sm">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="uppercase tracking-wider font-medium">{framingMessage}</span>
          </div>
        </div>
      )}

      {/* 5. Silhouette Pose Guide (When camera active but body not yet centered) */}
      {(trackingStatus === "camera_active" || trackingStatus === "body_lost") && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20 bg-ink-black/20 backdrop-blur-[1px]">
          <div className="w-48 sm:w-64 h-72 sm:h-96 border-2 border-dashed border-warm-ivory/30 rounded-full flex flex-col items-center justify-center p-6 text-center animate-pulse">
            <UserCheck className="w-10 h-10 text-warm-ivory/60 mb-3" />
            <p className="font-mono text-[11px] uppercase tracking-widest text-warm-ivory font-medium">
              Step into Camera Frustum
            </p>
            <p className="font-sans text-[10px] text-warm-ivory/60 mt-1 max-w-[180px]">
              Align upper body and waist within view
            </p>
          </div>
        </div>
      )}

      {/* 6. In-Viewport Quick Controls */}
      <div className="absolute top-4 right-4 z-30 flex items-center space-x-2">
        {onOpenCalibration && (
          <button
            onClick={onOpenCalibration}
            title={isCalibrated ? "Calibrated with ISO Card" : "Calibrate Camera Scale"}
            className={`p-2 rounded-sm backdrop-blur-md border transition-all ${
              isCalibrated
                ? "bg-electric-blue text-white border-electric-blue font-semibold"
                : "bg-ink-black/60 text-warm-ivory/80 border-warm-ivory/20 hover:text-warm-ivory hover:bg-ink-black/80"
            }`}
          >
            <Ruler className="w-4 h-4" />
          </button>
        )}

        {onToggleDiagnostics && (
          <button
            onClick={onToggleDiagnostics}
            title={showDiagnostics ? "Hide Developer Diagnostics [D]" : "Show Developer Diagnostics [D]"}
            className={`p-2 rounded-sm backdrop-blur-md border transition-all ${
              showDiagnostics
                ? "bg-acid-lime text-ink-black border-acid-lime font-bold shadow-md"
                : "bg-ink-black/60 text-warm-ivory/80 border-warm-ivory/20 hover:text-warm-ivory hover:bg-ink-black/80"
            }`}
          >
            <Activity className="w-4 h-4" />
          </button>
        )}

        {onToggleSkeleton && (
          <button
            onClick={onToggleSkeleton}
            title={showSkeleton ? "Hide Skeleton & Colliders" : "Show Calibration Skeleton"}
            className={`p-2 rounded-sm backdrop-blur-md border transition-all ${
              showSkeleton
                ? "bg-electric-blue text-white border-electric-blue font-bold shadow-md"
                : "bg-ink-black/60 text-warm-ivory/80 border-warm-ivory/20 hover:text-warm-ivory hover:bg-ink-black/80"
            }`}
          >
            {showSkeleton ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
        )}

        {onSwitchCamera && (
          <button
            onClick={onSwitchCamera}
            title="Switch Camera (Front / Rear)"
            className="p-2 rounded-sm bg-ink-black/60 backdrop-blur-md border border-warm-ivory/20 text-warm-ivory/80 hover:text-warm-ivory hover:bg-ink-black/80 transition-all"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 7. Studio Corner Watermark & Privacy Pill */}
      <div className="absolute bottom-4 left-4 z-30 pointer-events-none flex items-center space-x-3 text-[10px] font-mono text-warm-ivory/70">
        <span className="bg-ink-black/70 backdrop-blur-md px-2.5 py-1 border border-warm-ivory/15">
          DRAPE PARAMETRIC ATELIER • MHR PROXY
        </span>
      </div>
    </div>
  );
}
