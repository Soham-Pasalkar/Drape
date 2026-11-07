/**
 * Plain-text debug report (user request 2026-11-07, item 1): header + the last N tracking-state lines.
 * No images, no landmark arrays — safe to paste into a chat.
 */

import type { SessionFrameDiag } from '../session/schema';
import type { RegistrationReadout } from './registration';

const f = (v: number | null | undefined, d = 2) => (v === null || v === undefined || !Number.isFinite(v) ? '—' : v.toFixed(d));

export function formatDiagLine(t: number, diag: SessionFrameDiag, reg: RegistrationReadout | null, extra: { bustMode?: boolean; shoulderSpanPx?: number; displayScale?: number } = {}): string {
  const d = diag.distance;
  const e = reg?.errors ?? {};
  const kp = ['left_shoulder', 'right_shoulder', 'left_hip', 'right_hip'].map((k) => (e[k] ? f(e[k]!.raw, 1) : '–')).join('/');
  const torso = diag.garment?.meshes.find((m) => m.name === 'torso' || m.role === 'simulated');
  const sleeves = diag.garment?.meshes.filter((m) => /sleeve/.test(m.name)).map((m) => `${m.name}Δ[${m.centreRelAnchorM.map((v) => f(v)).join(',')}]`).join(' ') ?? '';
  return [
    `t=${f(t, 0)}`,
    `tgt=${diag.setFrameTarget}`,
    `pnp=${diag.pnp ? (diag.pnp.valid ? 'ok' : `invalid(${diag.pnp.reason})`) : '—'}`,
    `Z=${f(d?.z)}`,
    `mode=${d?.mode ?? '—'}`,
    `why=${d?.reason ?? 'live'}`,
    `vis=${f(d?.shoulderVisibility)}`,
    `yaw=${f(d?.yawDeg, 0)}`,
    `span=${f(extra.shoulderSpanPx, 1)}px`,
    `bust=${extra.bustMode === undefined ? '—' : extra.bustMode ? 'yes' : 'no'}`,
    `age=${f(diag.lastValidPoseAgeMs, 0)}ms`,
    `snap=${diag.snapPending ? 'pending' : 'no'}`,
    `a=${f(diag.lerpA, 3)}`,
    `vis3d=${diag.bodyRootVisible ? 'yes' : 'no'}`,
    `anchor=${f(reg?.anchorDx, 1)},${f(reg?.anchorDy, 1)}px`,
    `kpErr=${kp}px`,
    `scale=${diag.garment ? diag.garment.wrapperScale.map((v) => f(v, 3)).join(',') : '—'}`,
    `torsoW=${torso ? f(torso.screen.w, 0) : '—'}px`,
    `seamW=${diag.garment?.seam ? f(diag.garment.seam.widthPx, 0) : '—'}px`,
    `seam/shoulder=${diag.garment?.seam && extra.shoulderSpanPx && extra.displayScale ? f(diag.garment.seam.widthPx / (extra.shoulderSpanPx * extra.displayScale), 3) : '—'}`,
    sleeves,
    diag.garment?.sleeveGaps?.length ? `seamGapMax=${diag.garment.sleeveGaps.map((g) => f(g.maxCm, 2)).join('/')}cm` : '',
  ].join(' ');
}

export function buildDebugReport(header: Record<string, unknown>, lines: string[]): string {
  const h = Object.entries(header).map(([k, v]) => `${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`);
  return ['DRAPE AR DEBUG REPORT', ...h, `frames (last ${lines.length}):`, ...lines].join('\n');
}

/** Clipboard write with a textarea fallback (Safari / older browsers). */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}
