/**
 * DRAPE Tracking & Fitting Status Banner
 *
 * Displays:
 * 1. Camera state (Active / Initializing / Permission Denied)
 * 2. Body Tracking state with confidence %
 * 3. Studio Operating Mode (Collar Preview, Bust Studio, Full-Body Studio)
 * 4. Metric Calibration State (ISO Card Calibrated vs. Estimated Prior)
 * 5. Garment Fit & Fabric Strain Assessment (Tailored / Relaxed / Snug / Too Small)
 */

import React from "react";
import {
  Sparkles,
  ShieldCheck,
  AlertCircle,
  Camera,
  CheckCircle2,
  Layers,
  Ruler,
  Maximize2,
} from "lucide-react";
import {
  TrackingStatus,
  BodyTrackingStatus,
  GarmentFittingStatus,
  CameraStatus,
  OperatingMode,
  GarmentEase,
} from "@/lib/ar/types";

interface TrackingStatusBannerProps {
  status?: TrackingStatus;
  cameraStatus?: CameraStatus;
  bodyTrackingStatus?: BodyTrackingStatus;
  garmentFittingStatus?: GarmentFittingStatus;
  activeGarmentName?: string;
  confidence?: number;
  operatingMode?: OperatingMode;
  isCalibrated?: boolean;
  estimatedDistanceZ?: number;
  ease?: GarmentEase | null;
}

export default function TrackingStatusBanner({
  status,
  cameraStatus = "idle",
  bodyTrackingStatus = "searching",
  garmentFittingStatus = "unloaded",
  activeGarmentName,
  confidence,
  operatingMode = "bust",
  isCalibrated = false,
  estimatedDistanceZ,
  ease,
}: TrackingStatusBannerProps) {
  const isCameraActive =
    cameraStatus === "active" ||
    status === "camera_active" ||
    status === "body_detected" ||
    status === "body_lost";
  const isBodyDetected =
    bodyTrackingStatus === "detected" || status === "body_detected";
  const isFittingActive =
    garmentFittingStatus === "fitting_active" ||
    (isBodyDetected && garmentFittingStatus === "ready");

  const modeLabels: Record<OperatingMode, string> = {
    collar: "COLLAR PREVIEW",
    bust: "BUST STUDIO",
    "full-body": "FULL-BODY STUDIO",
  };

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
      {/* 1. Camera Status Pill */}
      {cameraStatus === "denied" || status === "permission_denied" ? (
        <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-sm backdrop-blur-md border bg-red-950/80 text-red-200 border-red-500/30">
          <AlertCircle className="w-3 h-3 text-red-400" />
          <span className="text-[10px] tracking-wider uppercase font-medium">CAMERA DENIED</span>
        </div>
      ) : cameraStatus === "initializing" || status === "initializing" ? (
        <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-sm backdrop-blur-md border bg-ink-black/80 text-warm-ivory border-warm-ivory/20">
          <Sparkles className="w-3 h-3 text-acid-lime animate-spin" />
          <span className="text-[10px] tracking-wider uppercase font-medium">INITIALIZING VISION...</span>
        </div>
      ) : !isCameraActive ? (
        <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-sm backdrop-blur-md border bg-ink-black/80 text-warm-ivory/70 border-warm-ivory/20">
          <Camera className="w-3 h-3 text-warm-ivory/60" />
          <span className="text-[10px] tracking-wider uppercase font-medium">STUDIO STANDBY</span>
        </div>
      ) : null}

      {/* 2. Body Tracking Status Pill */}
      {isCameraActive && (
        <div
          className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-sm backdrop-blur-md border transition-all duration-300 ${
            isBodyDetected
              ? "bg-emerald-950/80 text-emerald-200 border-emerald-500/30"
              : "bg-amber-950/80 text-amber-200 border-amber-500/30"
          }`}
        >
          <span className="relative flex h-1.5 w-1.5">
            <span
              className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isBodyDetected ? "bg-emerald-400 animate-ping" : "bg-amber-400 animate-pulse"
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
                isBodyDetected ? "bg-emerald-400" : "bg-amber-400"
              }`}
            />
          </span>
          <span className="text-[10px] tracking-wider uppercase font-medium">
            {isBodyDetected
              ? `BODY TRACKED (${confidence ? Math.round(confidence * 100) : 95}%)`
              : "SEARCHING FOR BODY..."}
          </span>
        </div>
      )}

      {/* 3. Studio Operating Mode Pill */}
      {isCameraActive && (
        <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-sm backdrop-blur-md border bg-ink-black/70 text-warm-ivory/90 border-warm-ivory/20">
          <Maximize2 className="w-3 h-3 text-electric-blue" />
          <span className="text-[10px] tracking-wider uppercase font-medium">
            {modeLabels[operatingMode]}
            {estimatedDistanceZ ? ` • ${(estimatedDistanceZ).toFixed(1)}m` : ""}
          </span>
        </div>
      )}

      {/* 4. Metric Calibration State Pill */}
      {isCameraActive && (
        <div
          className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-sm backdrop-blur-md border ${
            isCalibrated
              ? "bg-electric-blue/20 text-electric-blue border-electric-blue/40"
              : "bg-warm-ivory/5 text-warm-ivory/60 border-warm-ivory/15"
          }`}
        >
          <Ruler className="w-3 h-3" />
          <span className="text-[10px] tracking-wider uppercase font-medium">
            {isCalibrated ? "METRIC CALIBRATED" : "ESTIMATED SCALE"}
          </span>
        </div>
      )}

      {/* 5. Physical Fit & Fabric Strain Pill */}
      {isFittingActive && ease && (
        <div
          className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-sm backdrop-blur-md border ${
            ease.isTooSmall
              ? "bg-red-950/90 text-red-300 border-red-500/50"
              : ease.fitAssessment === "snug" || ease.fitAssessment === "strained"
              ? "bg-amber-950/80 text-amber-200 border-amber-500/40"
              : "bg-emerald-950/70 text-emerald-200 border-emerald-500/30"
          }`}
        >
          {ease.isTooSmall ? (
            <AlertCircle className="w-3 h-3 text-red-400" />
          ) : (
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          )}
          <span className="text-[10px] tracking-wider uppercase font-semibold">
            {ease.isTooSmall
              ? `TOO SMALL (+${ease.estimatedStrainPercent}% STRAIN)`
              : `FIT: ${ease.fitAssessment.toUpperCase()}`}
          </span>
        </div>
      )}
    </div>
  );
}
