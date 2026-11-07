/**
 * Debug snapshot (G2 amendment 2): composite of the displayed video frame + the WebGL canvas + registration
 * dots, built in the SAME tick right after renderer.render() (drawing buffer still valid), then mirrored like
 * the on-screen layer stack. 320 px wide PNG data URL.
 */

import { VideoDisplayTransform, Vec2 } from '../coordinates';

export interface SnapshotInput {
  video: HTMLVideoElement;
  glCanvas: HTMLCanvasElement;
  display: VideoDisplayTransform;
  mirrored: boolean;
  /** Container px (pre-flip). */
  cyan: Vec2[];
  magenta: Vec2[];
  anchor: Vec2 | null;
  midShoulder: Vec2 | null;
}

export function composeSnapshot(inp: SnapshotInput, width = 320): string | null {
  const d = inp.display;
  const W = width, H = Math.round((width * d.containerHeight) / d.containerWidth);
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  const s = W / d.containerWidth;
  ctx.save();
  if (inp.mirrored) {
    ctx.translate(W, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(inp.video, d.offsetX * s, d.offsetY * s, d.videoWidth * d.scaleX * s, d.videoHeight * d.scaleY * s);
  ctx.drawImage(inp.glCanvas, 0, 0, W, H);
  const dot = (p: Vec2, color: string, r: number) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(p.x * s, p.y * s, r, 0, Math.PI * 2);
    ctx.fill();
  };
  inp.cyan.forEach((p) => dot(p, '#00ffff', 2.5));
  inp.magenta.forEach((p) => dot(p, '#ff00ff', 1.8));
  if (inp.anchor) {
    ctx.fillStyle = '#ff00ff';
    ctx.fillRect(inp.anchor.x * s - 2.5, inp.anchor.y * s - 2.5, 5, 5);
  }
  if (inp.midShoulder) {
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(inp.midShoulder.x * s - 4, inp.midShoulder.y * s);
    ctx.lineTo(inp.midShoulder.x * s + 4, inp.midShoulder.y * s);
    ctx.moveTo(inp.midShoulder.x * s, inp.midShoulder.y * s - 4);
    ctx.lineTo(inp.midShoulder.x * s, inp.midShoulder.y * s + 4);
    ctx.stroke();
  }
  ctx.restore();
  try {
    return c.toDataURL('image/png');
  } catch {
    return null; // tainted canvas or unsupported
  }
}
