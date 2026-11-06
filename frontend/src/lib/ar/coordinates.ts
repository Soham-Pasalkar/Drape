/**
 * DRAPE AR coordinate contract.
 *
 * Every AR computation states which of these spaces it is in:
 *
 *  1. NORMALIZED IMAGE  (MediaPipe output)  n = (x, y) ∈ [0,1]², origin top-left of the
 *     *unmirrored* sensor frame, +x right, +y down.
 *  2. IMAGE PIXELS      p = (u, v) = (x·W, y·H), W×H = video.videoWidth × videoHeight.
 *  3. CONTAINER (DOM)   d = (dx, dy) CSS pixels inside the viewport element, origin top-left,
 *     *before* the shared mirror transform is applied (see MIRRORING POLICY).
 *  4. NDC               (ndcX, ndcY) ∈ [-1,1]², +y up, covering the full container/canvas.
 *  5. CAMERA (metric)   Three.js convention: camera at origin, +X right, +Y up, looking down -Z.
 *     Pinhole model with depth d = -Z > 0:
 *        u = fx · X / d + cx
 *        v = -fy · Y / d + cy        (image v grows downward, camera Y grows upward)
 *
 * MIRRORING POLICY (single reflection):
 *   All math above operates on the true, unmirrored sensor image. The projection matrix,
 *   PnP, landmarks and overlays are never mirrored. For a selfie preview the UI applies ONE
 *   CSS `scaleX(-1)` to a wrapper that contains the <video>, the WebGL canvas and the 2D
 *   overlay canvases together. Because every layer receives the same reflection about the
 *   container's vertical centre line, they remain pixel-aligned. Do not mirror any layer
 *   individually and do not negate projection-matrix elements.
 *
 * VIDEO DISPLAY TRANSFORM:
 *   CSS object-fit maps image pixels to container pixels by a uniform scale plus offset:
 *      dx = u · s + ox,   dy = v · s + oy
 *   cover:   s = max(Cw/W, Ch/H)   (offset ≤ 0: the overflow is cropped)
 *   contain: s = min(Cw/W, Ch/H)   (offset ≥ 0: letter/pillar-boxing)
 *   fill:    sx = Cw/W, sy = Ch/H  (non-uniform; supported for completeness)
 *   Offsets follow CSS object-position: o = (C - displaySize) · fraction, default 0.5.
 *   Device pixel ratio does not enter: the WebGL canvas is sized in CSS pixels and NDC is
 *   resolution-independent.
 */

import * as THREE from 'three';
import { CameraIntrinsics } from './types';

export type ObjectFit = 'cover' | 'contain' | 'fill';

export interface VideoDisplayTransform {
  fit: ObjectFit;
  videoWidth: number;
  videoHeight: number;
  containerWidth: number;
  containerHeight: number;
  /** Horizontal / vertical scale image px → container px (equal unless fit = 'fill'). */
  scaleX: number;
  scaleY: number;
  /** Container-space position of image pixel (0,0). Negative = cropped (cover). */
  offsetX: number;
  offsetY: number;
  /** Size of the full (uncropped) video as laid out in the container. */
  displayWidth: number;
  displayHeight: number;
  /** Image-pixel rectangle that is actually visible in the container. */
  visibleImageRect: { u0: number; v0: number; u1: number; v1: number };
}

export interface Vec2 {
  x: number;
  y: number;
}

/**
 * Computes the CSS object-fit transform for a video inside a container.
 * `objectPosition` is the CSS object-position as fractions (0.5, 0.5 = centred, the default).
 */
export function computeVideoDisplayTransform(
  videoWidth: number,
  videoHeight: number,
  containerWidth: number,
  containerHeight: number,
  fit: ObjectFit = 'cover',
  objectPosition: Vec2 = { x: 0.5, y: 0.5 }
): VideoDisplayTransform {
  const W = Math.max(1, videoWidth);
  const H = Math.max(1, videoHeight);
  const Cw = Math.max(1, containerWidth);
  const Ch = Math.max(1, containerHeight);

  let scaleX: number;
  let scaleY: number;
  if (fit === 'fill') {
    scaleX = Cw / W;
    scaleY = Ch / H;
  } else {
    const s = fit === 'cover' ? Math.max(Cw / W, Ch / H) : Math.min(Cw / W, Ch / H);
    scaleX = s;
    scaleY = s;
  }

  const displayWidth = W * scaleX;
  const displayHeight = H * scaleY;
  const offsetX = (Cw - displayWidth) * objectPosition.x;
  const offsetY = (Ch - displayHeight) * objectPosition.y;

  const u0 = Math.max(0, -offsetX / scaleX);
  const v0 = Math.max(0, -offsetY / scaleY);
  const u1 = Math.min(W, (Cw - offsetX) / scaleX);
  const v1 = Math.min(H, (Ch - offsetY) / scaleY);

  return {
    fit,
    videoWidth: W,
    videoHeight: H,
    containerWidth: Cw,
    containerHeight: Ch,
    scaleX,
    scaleY,
    offsetX,
    offsetY,
    displayWidth,
    displayHeight,
    visibleImageRect: { u0, v0, u1, v1 },
  };
}

/** Normalized MediaPipe coordinates → image pixels. */
export function normalizedToImage(n: Vec2, videoWidth: number, videoHeight: number): Vec2 {
  return { x: n.x * videoWidth, y: n.y * videoHeight };
}

/** Image pixels → normalized MediaPipe coordinates. */
export function imageToNormalized(p: Vec2, videoWidth: number, videoHeight: number): Vec2 {
  return { x: p.x / videoWidth, y: p.y / videoHeight };
}

/** Image pixels → container CSS pixels (pre-mirror). */
export function imageToDisplay(p: Vec2, t: VideoDisplayTransform): Vec2 {
  return { x: p.x * t.scaleX + t.offsetX, y: p.y * t.scaleY + t.offsetY };
}

/** Container CSS pixels (pre-mirror) → image pixels. */
export function displayToImage(d: Vec2, t: VideoDisplayTransform): Vec2 {
  return { x: (d.x - t.offsetX) / t.scaleX, y: (d.y - t.offsetY) / t.scaleY };
}

/** Container CSS pixels → NDC of a canvas covering the whole container. */
export function displayToNDC(d: Vec2, t: VideoDisplayTransform): Vec2 {
  return { x: (2 * d.x) / t.containerWidth - 1, y: 1 - (2 * d.y) / t.containerHeight };
}

export function ndcToDisplay(ndc: Vec2, t: VideoDisplayTransform): Vec2 {
  return { x: ((ndc.x + 1) / 2) * t.containerWidth, y: ((1 - ndc.y) / 2) * t.containerHeight };
}

/** Image pixels → NDC (through the display transform). */
export function imageToNDC(p: Vec2, t: VideoDisplayTransform): Vec2 {
  return displayToNDC(imageToDisplay(p, t), t);
}

/** NDC → image pixels (through the display transform). */
export function ndcToImage(ndc: Vec2, t: VideoDisplayTransform): Vec2 {
  return displayToImage(ndcToDisplay(ndc, t), t);
}

/**
 * Back-projects an image pixel to a camera-space point at positive depth d (metres).
 * Returns (X, Y, Z) with Z = -d.
 */
export function imageToCamera(
  p: Vec2,
  depth: number,
  K: Pick<CameraIntrinsics, 'fx' | 'fy' | 'cx' | 'cy'>,
  out: THREE.Vector3 = new THREE.Vector3()
): THREE.Vector3 {
  const d = Math.max(1e-6, depth);
  return out.set(((p.x - K.cx) * d) / K.fx, (-(p.y - K.cy) * d) / K.fy, -d);
}

/**
 * Projects a camera-space point to image pixels. Returns null for points at or behind
 * the camera plane (d ≤ 1e-6), instead of silently clamping depth.
 */
export function cameraToImage(
  P: { x: number; y: number; z: number },
  K: Pick<CameraIntrinsics, 'fx' | 'fy' | 'cx' | 'cy'>
): Vec2 | null {
  const d = -P.z;
  if (d <= 1e-6) return null;
  return { x: (K.fx * P.x) / d + K.cx, y: (-K.fy * P.y) / d + K.cy };
}

/**
 * Builds the Three.js projection matrix that maps camera space to the NDC of a canvas
 * covering the container, such that a camera point lands exactly where its image pixel is
 * displayed by the <video> element (including object-fit crop / letterbox).
 *
 * Derivation (x shown, y analogous with the sign flip for v):
 *   ndcX = 2(sx·u + ox)/Cw − 1,  u = fx·X/d + cx,  d = −Z, clipW = d
 *   clipX = ndcX·d = (2·sx·fx/Cw)·X + (1 − 2(sx·cx + ox)/Cw)·Z
 *   ⇒ P00 = 2·sx·fx/Cw,  P02 = 1 − 2(sx·cx + ox)/Cw
 *   ndcY = 1 − 2(sy·v + oy)/Ch,  v = −fy·Y/d + cy
 *   ⇒ P11 = 2·sy·fy/Ch,  P12 = 2(sy·cy + oy)/Ch − 1
 * With s = 1, o = 0 and C = W×H this reduces to the standard intrinsics frustum.
 */
export function buildProjectionMatrix(
  K: Pick<CameraIntrinsics, 'fx' | 'fy' | 'cx' | 'cy'>,
  t: VideoDisplayTransform,
  near = 0.05,
  far = 20.0,
  out: THREE.Matrix4 = new THREE.Matrix4()
): THREE.Matrix4 {
  const Cw = t.containerWidth;
  const Ch = t.containerHeight;
  const p00 = (2 * t.scaleX * K.fx) / Cw;
  const p02 = 1 - (2 * (t.scaleX * K.cx + t.offsetX)) / Cw;
  const p11 = (2 * t.scaleY * K.fy) / Ch;
  const p12 = (2 * (t.scaleY * K.cy + t.offsetY)) / Ch - 1;
  const p22 = -(far + near) / (far - near);
  const p23 = -(2 * far * near) / (far - near);

  // Matrix4.set takes row-major arguments.
  out.set(
    p00, 0, p02, 0,
    0, p11, p12, 0,
    0, 0, p22, p23,
    0, 0, -1, 0
  );
  return out;
}

/**
 * Converts a MediaPipe world-landmark *vector* (difference of two world landmarks, metres,
 * image-aligned axes: +x right, +y down, +z away from camera) to camera axes.
 */
export function worldLandmarkToCameraAxes(
  v: { x: number; y: number; z: number },
  out: THREE.Vector3 = new THREE.Vector3()
): THREE.Vector3 {
  return out.set(v.x, -v.y, -v.z);
}

/** Pixel distance between two normalized landmarks, honouring non-square frames. */
export function normalizedPixelDistance(
  a: Vec2,
  b: Vec2,
  videoWidth: number,
  videoHeight: number
): number {
  return Math.hypot((a.x - b.x) * videoWidth, (a.y - b.y) * videoHeight);
}
