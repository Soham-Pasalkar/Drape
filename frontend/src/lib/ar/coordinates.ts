/**
 * DRAPE Explicit Coordinate Transformations & Projection Subsystem
 *
 * Provides mathematically exact, bidirectional transformations between:
 * - MediaPipe Normalized Image Space [0, 1] x [0, 1]
 * - Uncropped Camera Sensor Image Pixels [0, W] x [0, H]
 * - Viewport Display Coordinates (with letterbox / contain alignment)
 * - Three.js Metric Camera Space (X: Right, Y: Up, -Z: Forward into scene)
 * - Normalized Device Coordinates (NDC) [-1, 1] x [-1, 1]
 * - Screen / DOM Canvas Pixels
 */

import * as THREE from 'three';
import { CameraIntrinsics } from './types';

export interface ViewportRect {
  left: number;
  top: number;
  width: number;
  height: number;
  scale: number;
}

/**
 * Computes exact render bounds for 'contain' fitting of a video stream
 * inside an arbitrary container without stretching or cropping.
 */
export function computeContainViewport(
  videoWidth: number,
  videoHeight: number,
  containerWidth: number,
  containerHeight: number
): ViewportRect {
  if (videoWidth <= 0 || videoHeight <= 0 || containerWidth <= 0 || containerHeight <= 0) {
    return { left: 0, top: 0, width: containerWidth, height: containerHeight, scale: 1.0 };
  }

  const videoAspect = videoWidth / videoHeight;
  const containerAspect = containerWidth / containerHeight;

  let renderWidth: number;
  let renderHeight: number;
  let left = 0;
  let top = 0;

  if (containerAspect > videoAspect) {
    // Container is wider than video => pillarbox (black bars on left & right)
    renderHeight = containerHeight;
    renderWidth = containerHeight * videoAspect;
    left = (containerWidth - renderWidth) / 2.0;
  } else {
    // Container is taller than video => letterbox (bars on top & bottom)
    renderWidth = containerWidth;
    renderHeight = containerWidth / videoAspect;
    top = (containerHeight - renderHeight) / 2.0;
  }

  const scale = renderWidth / videoWidth;

  return {
    left,
    top,
    width: renderWidth,
    height: renderHeight,
    scale,
  };
}

/**
 * Maps MediaPipe normalized landmark (pt.x, pt.y) in [0, 1] to camera sensor pixels (u, v).
 * In mirrored mode (standard front-facing webcam preview), x is flipped: u = (1 - x) * width.
 */
export function imageToPixel(
  pt: { x: number; y: number },
  width: number,
  height: number,
  isMirrored = true
): [number, number] {
  const u = isMirrored ? (1.0 - pt.x) * width : pt.x * width;
  const v = pt.y * height;
  return [u, v];
}

/**
 * Back-projects a sensor pixel (u, v) into a 3D ray direction in camera space.
 * In camera space:
 *   +X is Right
 *   +Y is Up (opposite to image pixel v which points Down)
 *   -Z is Forward into the scene
 */
export function pixelToCameraRay(
  u: number,
  v: number,
  intrinsics: CameraIntrinsics,
  isMirrored = true
): THREE.Vector3 {
  const { fx, fy, cx, cy, width } = intrinsics;

  // Account for mirror mode in ray direction
  const effectiveU = isMirrored ? width - u : u;
  const dirX = (effectiveU - cx) / fx;
  const dirY = -(v - cy) / fy;
  const dirZ = -1.0;

  return new THREE.Vector3(dirX, dirY, dirZ).normalize();
}

/**
 * Projects a 3D camera-space point (X, Y, Z) with Z < 0 onto sensor pixels (u, v).
 */
export function cameraToPixel(
  point: THREE.Vector3,
  intrinsics: CameraIntrinsics,
  isMirrored = true
): [number, number] {
  const { fx, fy, cx, cy, width } = intrinsics;
  const depthZ = Math.max(0.01, -point.z);

  let u = (fx * point.x) / depthZ + cx;
  if (isMirrored) {
    u = width - u;
  }
  const v = (-fy * point.y) / depthZ + cy;

  return [u, v];
}

/**
 * Converts camera-space 3D point directly to screen pixel coordinates
 * using a Three.js Camera and viewport dimensions.
 */
export function cameraToScreen(
  point: THREE.Vector3,
  camera: THREE.Camera,
  viewportWidth: number,
  viewportHeight: number
): { x: number; y: number } {
  const p = point.clone().project(camera);
  const x = (p.x * 0.5 + 0.5) * viewportWidth;
  const y = (-p.y * 0.5 + 0.5) * viewportHeight;
  return { x, y };
}

/**
 * Computes the reprojection distance in pixels between a 3D point in camera space
 * and a 2D detected image landmark.
 */
export function computeReprojectionError(
  point3D: THREE.Vector3,
  landmark2D: { x: number; y: number },
  intrinsics: CameraIntrinsics,
  isMirrored = true
): number {
  const [projU, projV] = cameraToPixel(point3D, intrinsics, isMirrored);
  const [obsU, obsV] = imageToPixel(landmark2D, intrinsics.width, intrinsics.height, isMirrored);

  return Math.hypot(projU - obsU, projV - obsV);
}

