/**
 * DRAPE Developer AR Diagnostics
 *
 * Two parts, because of the mirroring policy (lib/ar/coordinates.ts):
 *  - DiagnosticCanvasLayer: 2D landmark / shoulder-hip overlay. Rendered INSIDE the mirrored
 *    layer stack and mapped through the same video display transform as the <video>, so it
 *    lines up with both the video and the WebGL canvas.
 *  - DeveloperDiagnosticOverlay (default export): the text HUD + layer toggles, rendered
 *    OUTSIDE the mirrored stack so it stays readable.
 * Every number shown comes from a live runtime object; nothing is synthesised here.
 */

"use client";

import React, { useEffect, useRef } from "react";
import {
  LandmarkPoint,
  OperatingMode,
  FramingGuidance,
  BodyMeasurements,
  GarmentEase,
  DistanceMode,
} from "@/lib/ar/types";
import { VideoDisplayTransform, imageToDisplay } from "@/lib/ar/coordinates";
import type { GarmentDiagnostics } from "@/lib/ar/garment-instance";
import type { DebugMaterialMode, OrientationProbe } from "@/lib/ar/debug/stage1-probe";
import type { RegistrationReadout } from "@/lib/ar/debug/registration";
import type { SessionFrameDiag } from "@/lib/ar/session/schema";
export type { RegistrationReadout } from "@/lib/ar/debug/registration";

export interface DiagnosticLayers {
  landmarks: boolean;
  shoulderHipLines: boolean;
  bodyProxy: boolean;
  bounds: boolean;
  anchors: boolean;
  correspondence: boolean;
  collisionNormals: boolean;
  axesGizmo: boolean;
  registration: boolean;
}

export const DEFAULT_DIAGNOSTIC_LAYERS: DiagnosticLayers = {
  landmarks: true,
  shoulderHipLines: true,
  bodyProxy: false,
  bounds: false,
  anchors: true,
  correspondence: false,
  collisionNormals: false,
  axesGizmo: true,
  registration: true,
};


/** Stage-1 per-frame diagnosis readout (all values from live runtime objects). */
export interface Stage1Readout {
  renderFrame: number;
  poseFrameId: number;
  poseTimestampMs: number | null;
  dtMs: number;
  lerpA: number;
  snapped: boolean;
  targetPos: [number, number, number];
  bodyRootPos: [number, number, number];
  parented: boolean;
  visible: boolean;
  rootEulerDeg: { yaw: number; pitch: number; roll: number };
  meanVisibility: number;
  pnpSolveMs: number;
  orientation: OrientationProbe | null;
  probeRgb: [number, number, number] | null;
  materialMode: DebugMaterialMode;
}

/** Session recording controls (FR-18). */
export interface SessionControls {
  recording: boolean;
  elapsedS: number;
  frames: number;
  lastMarker: string | null;
  includeSnapshots: boolean;
  savedName: string | null;
  onRecord: () => void;
  onStopSave: () => void;
  onToggleSnapshots: () => void;
  onCopyDebugReport: () => void;
  debugCopyStatus: string | null;
}

export interface DiagnosticMetrics {
  camera: {
    videoWidth: number;
    videoHeight: number;
    containerWidth: number;
    containerHeight: number;
    canvasWidth: number;
    canvasHeight: number;
    dpr: number;
    fit: string;
    displayScale: number;
    offsetX: number;
    offsetY: number;
    mirrored: boolean;
    mirrorSource: string;
    fx: number;
    fy: number;
    cx: number;
    cy: number;
    calibrationMethod: string;
    isCalibrated: boolean;
  };
  tracking: {
    status: string;
    landmarkConfidence: number;
    shoulderSpanPx: number;
    shoulderVisibility: number;
    hipVisibility: number;
    yawDeg: number;
    yawSource: string;
    jitterPx: number;
    proportionSource: string;
    pnpValid: boolean;
    pnpReason?: string;
    reprojectionErrorPx: number;
    pnpIterations: number;
    rootPosition: [number, number, number];
  };
  distance: {
    mode: DistanceMode;
    distanceM: number;
    confidence: number;
    rawSpanPx: number;
    correctedSpanPx: number;
    referenceSpanPx: number | null;
    referenceDistanceM: number | null;
    shoulderBreadthM: number;
    breadthSource: string;
    samplesCollected: number;
    samplesRequired: number;
  };
  garment: GarmentDiagnostics | null;
  vision: {
    callbackCount: number;
    inferenceCount: number;
    detectionCount: number;
    emptyCount: number;
    lastMediaTime: number | null;
    msSinceLastInference: number;
  };
  performance: {
    renderFps: number;
    inferenceFps: number;
    inferenceMs: number;
    fitMs: number;
    garmentUpdateMs: number;
    simStepMs: number;
    renderMs: number;
    frameMs: number;
    drawCalls: number;
    triangles: number;
    delegate: string;
  };
  operatingMode: OperatingMode;
  framingGuidance: FramingGuidance;
  measurements: BodyMeasurements | null;
  ease: GarmentEase | null;
  stage1: Stage1Readout;
  registration: RegistrationReadout | null;
  frameDiag: SessionFrameDiag;
}

const BONES: [number, number][] = [
  [11, 13], [13, 15], [12, 14], [14, 16],
  [11, 23], [12, 24], [23, 25], [25, 27], [24, 26], [26, 28],
];

// ---------------------------------------------------------------------------------------

export function DiagnosticCanvasLayer({
  active,
  rawLandmarks,
  display,
  layers,
}: {
  active: boolean;
  rawLandmarks: LandmarkPoint[];
  display: VideoDisplayTransform | null;
  layers: DiagnosticLayers;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    const cssW = display?.containerWidth ?? canvas.clientWidth;
    const cssH = display?.containerHeight ?? canvas.clientHeight;
    if (canvas.width !== Math.round(cssW * dpr) || canvas.height !== Math.round(cssH * dpr)) {
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);
    if (!active || !display || rawLandmarks.length < 25) return;

    const toCss = (pt: LandmarkPoint) =>
      imageToDisplay({ x: pt.x * display.videoWidth, y: pt.y * display.videoHeight }, display);
    const vis = (i: number) => (rawLandmarks[i]?.visibility ?? 0) > 0.4;

    if (layers.landmarks) {
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "rgba(41, 75, 255, 0.85)";
      for (const [a, b] of BONES) {
        if (!vis(a) || !vis(b)) continue;
        const p = toCss(rawLandmarks[a]);
        const q = toCss(rawLandmarks[b]);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(q.x, q.y);
        ctx.stroke();
      }
      for (const i of [11, 12, 13, 14, 15, 16, 23, 24, 25, 26]) {
        if (!vis(i)) continue;
        const p = toCss(rawLandmarks[i]);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = i === 11 || i === 12 ? "#FF3B30" : "#D4FF00";
        ctx.fill();
      }
    }

    if (layers.registration) {
      // Cyan = raw landmark through the SAME display transform as the video.
      ctx.fillStyle = "#00FFFF";
      for (const i of [11, 12, 23, 24]) {
        if (!vis(i)) continue;
        const p = toCss(rawLandmarks[i]);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
      if (vis(11) && vis(12)) {
        const a = toCss(rawLandmarks[11]), b = toCss(rawLandmarks[12]);
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        ctx.strokeStyle = "#00FFFF";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(mx - 8, my); ctx.lineTo(mx + 8, my); ctx.moveTo(mx, my - 8); ctx.lineTo(mx, my + 8);
        ctx.stroke();
      }
    }

    if (layers.shoulderHipLines) {
      ctx.lineWidth = 2;
      for (const [a, b, color] of [[11, 12, "#FF3B30"], [23, 24, "#00E0FF"]] as [number, number, string][]) {
        if (!vis(a) || !vis(b)) continue;
        const p = toCss(rawLandmarks[a]);
        const q = toCss(rawLandmarks[b]);
        ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(q.x, q.y);
        ctx.stroke();
        // Midpoints: the 2D targets for the shoulder / waist anchors.
        ctx.fillStyle = color;
        ctx.fillRect((p.x + q.x) / 2 - 3, (p.y + q.y) / 2 - 3, 6, 6);
      }
    }
  }, [active, rawLandmarks, display, layers]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-30" />;
}

// ---------------------------------------------------------------------------------------

const f = (v: number | null | undefined, d = 2) => (v === null || v === undefined || !Number.isFinite(v) ? "—" : v.toFixed(d));
const v3 = (v: [number, number, number] | undefined, d = 3) => (v ? `[${v.map((x) => f(x, d)).join(", ")}]` : "—");

function Row({ k, v, warn }: { k: string; v: React.ReactNode; warn?: boolean }) {
  return (
    <>
      <span className="text-warm-ivory/55">{k}</span>
      <span className={warn ? "text-amber-300" : "text-warm-ivory/95"}>{v}</span>
    </>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-warm-ivory/15 pt-1">
      <div className="text-acid-lime font-semibold mb-0.5">{title}</div>
      <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5">{children}</div>
    </div>
  );
}

export default function DeveloperDiagnosticOverlay({
  active,
  metrics,
  layers,
  onLayersChange,
  materialMode,
  onMaterialModeChange,
  session,
}: {
  active: boolean;
  metrics: DiagnosticMetrics | null;
  layers: DiagnosticLayers;
  onLayersChange: (layers: DiagnosticLayers) => void;
  materialMode: DebugMaterialMode;
  onMaterialModeChange: (mode: DebugMaterialMode) => void;
  session: SessionControls;
}) {
  if (!active) return null;
  const m = metrics;
  const toggle = (k: keyof DiagnosticLayers) => onLayersChange({ ...layers, [k]: !layers[k] });
  const LAYER_LABELS: [keyof DiagnosticLayers, string][] = [
    ["landmarks", "Landmarks"],
    ["shoulderHipLines", "Shoulder/hip"],
    ["bodyProxy", "Body proxy"],
    ["bounds", "Garment bbox"],
    ["anchors", "Anchors"],
    ["correspondence", "Correspondence"],
    ["collisionNormals", "Collision normals"],
    ["axesGizmo", "Axes + F"],
    ["registration", "Registration"],
  ];
  const MODES: [DebugMaterialMode, string][] = [
    ["normal", "Mat: normal"],
    ["frontOnly", "FrontSide"],
    ["faceColors", "Front G / Back R"],
    ["midGrey", "Mid-grey"],
  ];

  return (
    <div className="absolute top-14 left-2 bottom-12 z-40 w-[290px] overflow-y-auto pointer-events-auto bg-ink-black/90 backdrop-blur-md border border-acid-lime/40 p-2.5 rounded-sm font-mono text-[9px] leading-tight text-warm-ivory/90 space-y-1.5 shadow-2xl">
      <div className="flex items-center justify-between font-semibold text-acid-lime text-[10px]">
        <span>AR DIAGNOSTICS</span>
        <span className="text-[8px] bg-acid-lime/20 px-1 rounded">LIVE</span>
      </div>

      <div className="flex flex-wrap gap-1">
        {LAYER_LABELS.map(([k, label]) => (
          <button
            key={k}
            onClick={() => toggle(k)}
            className={`px-1.5 py-0.5 border rounded-sm ${layers[k] ? "border-acid-lime text-acid-lime bg-acid-lime/10" : "border-warm-ivory/20 text-warm-ivory/50"}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1.5">
        <button onClick={session.onCopyDebugReport} className="px-2 py-0.5 border border-electric-blue text-electric-blue rounded-sm" data-testid="copy-debug-report">
          Copy debug report
        </button>
        {session.debugCopyStatus && <span className="text-acid-lime">{session.debugCopyStatus}</span>}
      </div>

      <div className="border border-warm-ivory/20 rounded-sm p-1.5 space-y-1" data-testid="session-panel">
        <div className="flex items-center gap-1.5">
          {!session.recording ? (
            <button onClick={session.onRecord} className="px-2 py-0.5 border border-red-400 text-red-300 rounded-sm" data-testid="session-record">
              ● Record
            </button>
          ) : (
            <button onClick={session.onStopSave} className="px-2 py-0.5 border border-acid-lime text-acid-lime rounded-sm" data-testid="session-stop">
              ■ Stop &amp; save
            </button>
          )}
          <label className="flex items-center gap-1 text-warm-ivory/70">
            <input type="checkbox" checked={session.includeSnapshots} onChange={session.onToggleSnapshots} disabled={session.recording} />
            include snapshots
          </label>
        </div>
        {session.recording && (
          <div className="text-red-300">
            REC {session.elapsedS.toFixed(1)} s / 120 s · {session.frames} frames · last key: {session.lastMarker ?? "—"}
          </div>
        )}
        <div className="text-warm-ivory/50">Keys 1–8: centre · far left · far right · high · low · closer · farther · hips out</div>
        {session.savedName && <div className="text-acid-lime break-all">Saved: {session.savedName}</div>}
      </div>

      <div className="flex flex-wrap gap-1">
        {MODES.map(([k, label]) => (
          <button
            key={k}
            onClick={() => onMaterialModeChange(k)}
            className={`px-1.5 py-0.5 border rounded-sm ${materialMode === k ? "border-electric-blue text-electric-blue bg-electric-blue/10" : "border-warm-ivory/20 text-warm-ivory/50"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {!m ? (
        <div className="text-warm-ivory/50 pt-2">Waiting for the first tracked frame…</div>
      ) : (
        <>
          <Group title="Tracking state">
            <Row k="setFrameTarget" v={m.frameDiag.setFrameTarget} warn={m.frameDiag.setFrameTarget !== "fit"} />
            <Row k="PnP" v={m.frameDiag.pnp ? (m.frameDiag.pnp.valid ? "valid" : `invalid: ${m.frameDiag.pnp.reason}`) : "—"} />
            <Row k="Valid pose age" v={m.frameDiag.lastValidPoseAgeMs === null ? "—" : `${f(m.frameDiag.lastValidPoseAgeMs, 0)} ms`} warn={(m.frameDiag.lastValidPoseAgeMs ?? 0) > 200} />
            <Row k="snap / a / vis" v={`${m.frameDiag.snapPending ? "pending" : "no"} / ${f(m.frameDiag.lerpA, 3)} / ${m.frameDiag.bodyRootVisible ? "yes" : "no"}`} />
            {m.frameDiag.distance && (
              <>
                <Row k="Dist mode / Z" v={`${m.frameDiag.distance.mode} / ${f(m.frameDiag.distance.z, 3)} m`} />
                <Row k="Ref S0 / Z0" v={`${f(m.frameDiag.distance.referenceSpanPx, 1)} px / ${f(m.frameDiag.distance.referenceDistanceM, 3)} m`} />
                <Row k="Window" v={`${m.frameDiag.distance.samplesCollected}/${m.frameDiag.distance.samplesRequired} · spread ${m.frameDiag.distance.lastWindowSpread === null ? "—" : f(m.frameDiag.distance.lastWindowSpread * 100, 1) + "%"}`} />
                <Row k="Why" v={m.frameDiag.distance.reason ?? "live (relative)"} warn={m.frameDiag.distance.reason !== null} />
                <Row k="Sh. vis / yaw" v={`${f(m.frameDiag.distance.shoulderVisibility, 2)} / ${f(m.frameDiag.distance.yawDeg, 0)}°`} />
              </>
            )}
            {m.frameDiag.garment && (
              <>
                <Row k="Wrapper scale" v={v3(m.frameDiag.garment.wrapperScale, 3)} />
                {m.frameDiag.garment.sleeveGaps?.map((g) => (
                  <Row key={"gap-" + g.name} k={`${g.name} seam gap`} v={`min ${f(g.minCm, 2)} · med ${f(g.medianCm, 2)} · max ${f(g.maxCm, 2)} cm`} warn={g.maxCm >= 0.5} />
                ))}
                {m.frameDiag.garment.meshes.map((g) => (
                  <Row key={g.name} k={g.name} v={`size ${v3(g.sizeM, 2)} · Δanchor ${v3(g.centreRelAnchorM, 2)} · ${f(g.screen.w, 0)} px wide`} />
                ))}
              </>
            )}
          </Group>

          {m.registration && (
            <Group title="Registration (screen px)">
              {(["left_shoulder", "right_shoulder", "left_hip", "right_hip"] as const).map((k) => {
                const e = m.registration!.errors[k];
                return <Row key={k} k={`err ${k}`} v={e ? `${f(e.raw, 1)} raw / ${f(e.smoothed, 1)} sm` : "not visible"} warn={!!e && e.raw > 8} />;
              })}
              <Row k="anchor dx,dy" v={`${f(m.registration.anchorDx, 1)}, ${f(m.registration.anchorDy, 1)}`} warn={Math.hypot(m.registration.anchorDx ?? 0, m.registration.anchorDy ?? 0) > 8} />
              <Row k="mid-shoulder" v={m.registration.midShoulderScreen ? `${f(m.registration.midShoulderScreen.x, 0)}, ${f(m.registration.midShoulderScreen.y, 0)}` : "—"} />
            </Group>
          )}

          <Group title="Stage 1 probe">
            <Row k="Frames r/p" v={`${m.stage1.renderFrame} / ${m.stage1.poseFrameId}`} />
            <Row k="Pose ts" v={m.stage1.poseTimestampMs === null ? "—" : `${f(m.stage1.poseTimestampMs, 0)} ms`} />
            <Row k="dt / a" v={`${f(m.stage1.dtMs, 1)} ms / ${f(m.stage1.lerpA, 3)}${m.stage1.snapped ? " snap" : ""}`} warn={m.stage1.lerpA < 0.01} />
            <Row k="Target pos" v={v3(m.stage1.targetPos)} />
            <Row k="Root pos" v={v3(m.stage1.bodyRootPos)} />
            <Row k="Parented/vis" v={`${m.stage1.parented ? "yes" : "NO"} / ${m.stage1.visible ? "yes" : "no"}`} warn={!m.stage1.parented} />
            <Row k="Yaw/Pit/Roll" v={`${f(m.stage1.rootEulerDeg.yaw, 1)} / ${f(m.stage1.rootEulerDeg.pitch, 1)} / ${f(m.stage1.rootEulerDeg.roll, 1)}°`} />
            <Row k="Mean vis" v={f(m.stage1.meanVisibility, 2)} />
            <Row k="PnP solve" v={`${f(m.stage1.pnpSolveMs, 2)} ms`} warn={m.stage1.pnpSolveMs > 2} />
            {m.stage1.orientation && (
              <>
                <Row k="X cam" v={v3(m.stage1.orientation.xCam, 2)} />
                <Row k="Y cam" v={v3(m.stage1.orientation.yCam, 2)} warn={m.stage1.orientation.yCam[1] < 0} />
                <Row k="Z cam" v={v3(m.stage1.orientation.zCam, 2)} warn={m.stage1.orientation.zCam[2] < 0} />
                <Row k="X ndc·shoulder" v={f(m.stage1.orientation.xVsShoulders, 3)} warn={(m.stage1.orientation.xVsShoulders ?? 1) < 0} />
                <Row k="Front CCW" v={`${f(m.stage1.orientation.frontHalfFrontFacingPct, 1)} %`} warn={(m.stage1.orientation.frontHalfFrontFacingPct ?? 100) < 50} />
              </>
            )}
            <Row k="Probe RGB" v={m.stage1.probeRgb ? m.stage1.probeRgb.join(", ") : "—"} />
            <Row k="Material" v={m.stage1.materialMode} />
          </Group>

          <Group title="Camera">
            <Row k="Video" v={`${m.camera.videoWidth}×${m.camera.videoHeight}`} />
            <Row k="Container" v={`${f(m.camera.containerWidth, 0)}×${f(m.camera.containerHeight, 0)} css`} />
            <Row k="Canvas" v={`${m.camera.canvasWidth}×${m.camera.canvasHeight} px @${f(m.camera.dpr, 2)}x`} />
            <Row k="Fit" v={`${m.camera.fit} s=${f(m.camera.displayScale, 4)}`} />
            <Row k="Offset" v={`${f(m.camera.offsetX, 1)}, ${f(m.camera.offsetY, 1)} css`} />
            <Row k="Mirrored" v={`${m.camera.mirrored ? "yes (CSS layer stack)" : "no"} · ${m.camera.mirrorSource}`} warn={m.camera.mirrorSource !== "getSettings"} />
            <Row k="fx, fy" v={`${f(m.camera.fx, 1)}, ${f(m.camera.fy, 1)}`} />
            <Row k="cx, cy" v={`${f(m.camera.cx, 1)}, ${f(m.camera.cy, 1)}`} />
            <Row k="Calibration" v={m.camera.calibrationMethod} warn={!m.camera.isCalibrated} />
          </Group>

          <Group title="Tracking">
            <Row k="Status" v={m.tracking.status} />
            <Row k="Confidence" v={f(m.tracking.landmarkConfidence, 2)} />
            <Row k="Shoulder span" v={`${f(m.tracking.shoulderSpanPx, 1)} px`} />
            <Row k="Vis S / H" v={`${f(m.tracking.shoulderVisibility)} / ${f(m.tracking.hipVisibility)}`} />
            <Row k="Yaw" v={`${f(m.tracking.yawDeg, 1)}° (${m.tracking.yawSource})`} />
            <Row k="Jitter" v={`${f(m.tracking.jitterPx, 2)} px/frame`} warn={m.tracking.jitterPx > 3} />
            <Row k="Proportions" v={m.tracking.proportionSource} />
            <Row k="PnP" v={m.tracking.pnpValid ? `ok, ${m.tracking.pnpIterations} it` : `invalid (${m.tracking.pnpReason})`} warn={!m.tracking.pnpValid} />
            <Row k="Reproj RMS" v={`${f(m.tracking.reprojectionErrorPx, 2)} px`} warn={m.tracking.reprojectionErrorPx > 8} />
            <Row k="Root" v={v3(m.tracking.rootPosition)} />
          </Group>

          <Group title="Distance">
            <Row k="Mode" v={m.distance.mode === "approximate" ? "approximate scale" : "metric"} />
            <Row k="Z" v={`${f(m.distance.distanceM, 3)} m`} />
            <Row k="Confidence" v={f(m.distance.confidence, 2)} />
            <Row k="Span raw/corr" v={`${f(m.distance.rawSpanPx, 1)} / ${f(m.distance.correctedSpanPx, 1)} px`} />
            <Row k="Ref span S0" v={m.distance.referenceSpanPx === null ? `collecting ${m.distance.samplesCollected}/${m.distance.samplesRequired}` : `${f(m.distance.referenceSpanPx, 1)} px`} />
            <Row k="Ref Z0" v={m.distance.referenceDistanceM === null ? "—" : `${f(m.distance.referenceDistanceM, 3)} m`} />
            <Row k="Breadth B" v={`${f(m.distance.shoulderBreadthM, 3)} m (${m.distance.breadthSource})`} />
          </Group>

          {m.garment && (
            <Group title="Garment">
              <Row k="Active" v={m.garment.id} />
              <Row k="BBox min" v={v3(m.garment.bboxMin)} />
              <Row k="BBox max" v={v3(m.garment.bboxMax)} />
              <Row k="Anchor (G)" v={`${v3(m.garment.garmentAnchorLocal)} ${m.garment.anchorSource}`} />
              <Row k="Δ metadata" v={`${f(m.garment.anchorMetadataDeltaM * 1000, 1)} mm`} warn={m.garment.anchorMetadataDeltaM > 0.01} />
              <Row k="Anchor (B)" v={`${v3(m.garment.bodyAnchorLocal)} ${m.garment.bodyAnchorType}`} />
              <Row k="Align error" v={`${f(m.garment.anchorAlignmentErrorM * 1000, 3)} mm`} warn={m.garment.anchorAlignmentErrorM > 1e-3} />
              {m.garment.neckline && (
                <>
                  <Row k="Neckline (G)" v={v3(m.garment.neckline.garmentNecklineBodyLocal ?? m.garment.neckline.garmentNecklineLocal)} />
                  <Row k="Neck base (B)" v={v3(m.garment.neckline.bodyBaseOfNeckLocal ?? m.garment.neckline.bodyNeckLocal)} />
                  <Row
                    k="Neckline Δ"
                    v={
                      m.garment.neckline.necklineVerticalDeltaMm !== undefined
                        ? `${m.garment.neckline.necklineVerticalDeltaMm >= 0 ? "+" : ""}${f(m.garment.neckline.necklineVerticalDeltaMm, 1)} mm`
                        : `${f(m.garment.neckline.necklineDispMm ?? 0, 1)} mm`
                    }
                  />
                  <Row
                    k="Neck offset"
                    v={`${f(m.garment.neckline.appliedOffsetY * 1000, 1)} mm (eff ${f(m.garment.neckline.effectiveWorldOffsetMm ?? m.garment.neckline.appliedOffsetY * 1000, 1)} mm)`}
                  />
                  {m.garment.neckline.collarDropMm !== undefined && (
                    <Row
                      k="Collar curve"
                      v={`drop ${f(m.garment.neckline.collarDropMm, 1)} mm · ${m.garment.neckline.collarCurveVertexCount ?? 0} vtx`}
                    />
                  )}
                </>
              )}
              <Row k="World pos" v={v3(m.garment.worldPosition)} />
              <Row k="World rot" v={`${v3(m.garment.worldEulerDeg, 1)}°`} />
              <Row k="Scale" v={v3(m.garment.scale, 3)} />
              <Row k="Deformation" v={`${m.garment.deformation.mode} (${m.garment.deformation.validCorrespondences}/${m.garment.deformation.totalVertices} corr, ${m.garment.deformation.displacedVertices} moved)`} />
              <Row
                k="Simulation"
                v={
                  m.garment.simulation.state === "disabled"
                    ? `disabled: ${m.garment.simulation.reason}`
                    : `${m.garment.simulation.state} · ${m.garment.simulation.particles}p · ${m.garment.simulation.pinned} pinned · strain ${f(m.garment.simulation.maxStrainPct, 1)}% · coll ${m.garment.simulation.collisions}`
                }
                warn={m.garment.simulation.state === "disabled"}
              />
              <Row k="Meshes" v={m.garment.meshes.map((x) => `${x.name}:${x.role}`).join(" ")} />
            </Group>
          )}

          <Group title="Vision Telemetry">
            <Row k="Callbacks" v={`${m.vision.callbackCount} frames`} />
            <Row k="Inferences" v={`${m.vision.inferenceCount} calls`} />
            <Row k="Detections" v={`${m.vision.detectionCount} poses`} />
            <Row k="Empty / Lost" v={`${m.vision.emptyCount} frames`} />
            <Row k="Media time" v={m.vision.lastMediaTime !== null ? `${f(m.vision.lastMediaTime, 3)} s` : "— (live stream / RAF)"} />
            <Row k="Last infer age" v={`${f(m.vision.msSinceLastInference, 0)} ms`} warn={m.vision.msSinceLastInference > 500} />
          </Group>

          <Group title="Performance">
            <Row k="Render" v={`${f(m.performance.renderFps, 0)} fps · ${f(m.performance.renderMs, 2)} ms`} warn={m.performance.renderFps < 25} />
            <Row k="Pose" v={`${f(m.performance.inferenceFps, 0)} fps · ${f(m.performance.inferenceMs, 1)} ms (${m.performance.delegate})`} />
            <Row k="Fitting" v={`${f(m.performance.fitMs, 2)} ms`} />
            <Row k="Garment upd" v={`${f(m.performance.garmentUpdateMs, 2)} ms (sim ${f(m.performance.simStepMs, 2)})`} />
            <Row k="Frame" v={`${f(m.performance.frameMs, 2)} ms`} />
            <Row k="GPU" v={`${m.performance.drawCalls} calls · ${m.performance.triangles} tris`} />
          </Group>

          {m.measurements && (
            <Group title="Body estimate">
              <Row k="Scale source" v={m.measurements.scaleSource ?? "—"} warn={m.measurements.scaleSource !== "known_distance"} />
              <Row k="Chest/Waist/Hip" v={`${f(m.measurements.chestCircumferenceCm, 0)}/${f(m.measurements.waistCircumferenceCm, 0)}/${f(m.measurements.hipCircumferenceCm, 0)} ±${f(m.measurements.uncertaintyCm, 0)} cm`} />
              {m.ease && <Row k="Fit" v={`${m.ease.fitAssessment}${m.ease.reliable ? "" : " (not reliable)"}`} warn={!m.ease.reliable} />}
            </Group>
          )}
        </>
      )}
    </div>
  );
}
