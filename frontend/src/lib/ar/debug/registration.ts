/**
 * Pixel registration metrics (FR-05), in ON-SCREEN pixels (after the single CSS mirror).
 * Cyan = landmark through the video display transform; magenta = projected 3D probe from the render camera.
 * Pure: no DOM, no WebGL — used by the live HUD, golden tests and replay.
 */

import { VideoDisplayTransform, Vec2, imageToDisplay } from '../coordinates';

export const REGISTRATION_KEYPOINTS = { left_shoulder: 11, right_shoulder: 12, left_hip: 23, right_hip: 24 } as const;
export type RegistrationKeypoint = keyof typeof REGISTRATION_KEYPOINTS;

export interface RegistrationReadout {
  /** |cyan − magenta| per keypoint vs raw landmarks (what is drawn) and vs the smoothed landmarks the solver
   *  used; null when the raw landmark is not visible (< 0.5) or a probe is missing. */
  errors: Record<string, { raw: number; smoothed: number } | null>;
  /** Garment anchor (rendered, smoothed pose) minus raw mid-shoulder, on-screen px. */
  anchorDx: number | null;
  anchorDy: number | null;
  midShoulderScreen: { x: number; y: number } | null;
}

export interface RegistrationInput {
  display: VideoDisplayTransform;
  mirrored: boolean;
  /** Raw normalized landmarks of the current pose frame (33). */
  raw: ({ x: number; y: number; visibility?: number } | undefined)[];
  /** Smoothed landmarks the solver used, by keypoint name. */
  smoothed: Partial<Record<RegistrationKeypoint, { x: number; y: number } | undefined>>;
  /** Container-pixel (pre-flip) projections from ThreeSceneManager.registrationPixels(). */
  projected: { keypoints: Record<string, Vec2>; garmentAnchor: Vec2 | null };
}

export function computeRegistration(inp: RegistrationInput): RegistrationReadout {
  const d = inp.display;
  const toScreen = (p: Vec2) => ({ x: inp.mirrored ? d.containerWidth - p.x : p.x, y: p.y });
  const lmDisp = (pt: { x: number; y: number }) => toScreen(imageToDisplay({ x: pt.x * d.videoWidth, y: pt.y * d.videoHeight }, d));
  const errors: Record<string, { raw: number; smoothed: number } | null> = {};
  for (const [name, i] of Object.entries(REGISTRATION_KEYPOINTS)) {
    const r = inp.raw[i];
    const mg = inp.projected.keypoints[name];
    const sm = inp.smoothed[name as RegistrationKeypoint];
    if (!r || (r.visibility ?? 0) < 0.5 || !mg || !sm) {
      errors[name] = null;
      continue;
    }
    const m2 = toScreen(mg), a = lmDisp(r), b = lmDisp(sm);
    errors[name] = { raw: Math.hypot(m2.x - a.x, m2.y - a.y), smoothed: Math.hypot(m2.x - b.x, m2.y - b.y) };
  }
  let anchorDx: number | null = null, anchorDy: number | null = null, mid: { x: number; y: number } | null = null;
  if (inp.raw[11] && inp.raw[12] && inp.projected.garmentAnchor) {
    const a = lmDisp(inp.raw[11]!), b = lmDisp(inp.raw[12]!);
    mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const g = toScreen(inp.projected.garmentAnchor);
    anchorDx = g.x - mid.x;
    anchorDy = g.y - mid.y;
  }
  return { errors, anchorDx, anchorDy, midShoulderScreen: mid };
}
