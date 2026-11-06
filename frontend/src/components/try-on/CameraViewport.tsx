/**
 * DRAPE Interactive 3D AR Camera Viewport
 *
 * Implements:
 * 1. Synchronized video stream & WebGL2 canvas viewport alignment.
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
import DeveloperDiagnosticOverlay, { DiagnosticMetrics } from "./DeveloperDiagnosticOverlay";

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

  // Draw 2D skeletal anatomical connections for calibration
  useEffect(() => {
    const canvas = skeletonCanvasRef.current;
    if (!canvas || !showSkeleton || rawLandmarks.length < 25) {
      if (canvas) {
        const ctx = canvas.getContext("2d");
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    if (canvas.width !== rect.width || canvas.height !== rect.height) {
      canvas.width = rect.width;
      canvas.height = rect.height;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const w = canvas.width;
    const h = canvas.height;

    const getPos = (pt: LandmarkPoint) => {
      const x = isMirrored ? (1 - pt.x) * w : pt.x * w;
      const y = pt.y * h;
      return { x, y };
    };

    const connections: [number, number][] = [
      [11, 12], // Shoulders
      [11, 13], // Left upper arm
      [13, 15], // Left forearm
      [12, 14], // Right upper arm
      [14, 16], // Right forearm
      [11, 23], // Left torso
      [12, 24], // Right torso
      [23, 24], // Hips
      [23, 25], // Left thigh
      [24, 26], // Right thigh
      [25, 27], // Left calf
      [26, 28], // Right calf
    ];

    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "rgba(41, 75, 255, 0.85)"; // Electric blue

    connections.forEach(([i, j]) => {
      const p1 = rawLandmarks[i];
      const p2 = rawLandmarks[j];
      if (p1 && p2 && (p1.visibility ?? 1) > 0.35 && (p2.visibility ?? 1) > 0.35) {
        const pos1 = getPos(p1);
        const pos2 = getPos(p2);
        ctx.beginPath();
        ctx.moveTo(pos1.x, pos1.y);
        ctx.lineTo(pos2.x, pos2.y);
        ctx.stroke();
      }
    });

    // Draw joints
    [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28].forEach((idx) => {
      const pt = rawLandmarks[idx];
      if (pt && (pt.visibility ?? 1) > 0.35) {
        const pos = getPos(pt);
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 4.5, 0, 2 * Math.PI);
        ctx.fillStyle = "#D4FF00"; // Acid lime
        ctx.fill();
        ctx.strokeStyle = "#0A0A0A";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    });
  }, [rawLandmarks, showSkeleton, isMirrored]);

  return (
    <div
      className="relative w-full bg-ink-black rounded-sm overflow-hidden border border-warm-ivory/20 shadow-2xl group"
      style={{ aspectRatio: `${aspectRatio}` }}
    >
      {/* 1. Underlying HTML5 Video Stream */}
      <video
        ref={videoRef}
        className={`absolute inset-0 w-full h-full object-cover ${
          isMirrored ? "scale-x-[-1]" : ""
        }`}
        playsInline
        muted
        autoPlay
      />

      {/* 2. WebGL2 Three.js 3D Render Canvas Container */}
      <div
        ref={threeContainerRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-10"
      />

      {/* 3. Calibration Skeleton Overlay Canvas */}
      <canvas
        ref={skeletonCanvasRef}
        width={1280}
        height={720}
        className="absolute inset-0 w-full h-full pointer-events-none z-20"
      />

      {/* 3b. Developer AR Diagnostic Overlay */}
      {diagnosticMetrics && (
        <DeveloperDiagnosticOverlay
          active={showDiagnostics}
          rawLandmarks={rawLandmarks}
          metrics={diagnosticMetrics}
          isMirrored={isMirrored}
        />
      )}

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
