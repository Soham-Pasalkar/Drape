/**
 * In-memory session recorder (FR-18). Opt-in, local only: no network path exists in this module.
 * Frame protocol (mirrors the live loop so replay can reproduce it within 1 px):
 *   notePoseFrame()  — every inferred pose frame (the smoother sees all of them)
 *   consume()        — when the render loop consumes the latest pose frame; earlier unconsumed pose frames become
 *                      `smoothedOnly` of the new frame
 *   noteRender()     — after every render; appended to the current frame's `renderTimes`
 */

import {
  POSITION_KEYS,
  PositionKey,
  SessionFile,
  SessionFrame,
  SessionHeader,
  SessionImage,
  SessionLandmark,
  SessionMarker,
} from './schema';

export const RECORDER_LIMITS = { MAX_DURATION_MS: 120_000, IMAGE_INTERVAL_MS: 1000 };

type LandmarkIn = { x: number; y: number; z: number; visibility?: number; presence?: number };

export function toSessionLandmarks(l: LandmarkIn[] | undefined | null): SessionLandmark[] | null {
  if (!l) return null;
  return l.map((p) => ({ x: p.x, y: p.y, z: p.z, v: p.visibility ?? 0, p: p.presence ?? 0 }));
}

export class SessionRecorder {
  private header: SessionHeader | null = null;
  private frames: SessionFrame[] = [];
  private markers: SessionMarker[] = [];
  private images: SessionImage[] = [];
  private pending: { t: number; raw: SessionLandmark[]; world: SessionLandmark[] | null }[] = [];
  private startedAt = 0;
  private lastImageAt = -Infinity;
  private _active = false;

  get active(): boolean {
    return this._active;
  }
  get frameCount(): number {
    return this.frames.length;
  }
  get lastMarker(): PositionKey | null {
    return this.markers.length ? this.markers[this.markers.length - 1].position : null;
  }
  elapsedMs(nowMs: number): number {
    return this._active ? nowMs - this.startedAt : 0;
  }
  /** True once the 120 s limit is reached (the caller then stops and saves). */
  limitReached(nowMs: number): boolean {
    return this._active && nowMs - this.startedAt >= RECORDER_LIMITS.MAX_DURATION_MS;
  }

  start(header: SessionHeader, nowMs: number): void {
    this.header = header;
    this.frames = [];
    this.markers = [];
    this.images = [];
    this.pending = [];
    this.startedAt = nowMs;
    this.lastImageAt = -Infinity;
    this._active = true;
  }

  notePoseFrame(t: number, raw: LandmarkIn[], world: LandmarkIn[] | undefined): void {
    if (!this._active) return;
    this.pending.push({ t, raw: toSessionLandmarks(raw) ?? [], world: toSessionLandmarks(world) });
  }

  /** `frame` without smoothedOnly / renderTimes; `consumedT` = timestamp of the consumed pose frame. */
  consume(frame: Omit<SessionFrame, 'smoothedOnly' | 'renderTimes'>, consumedT: number): void {
    if (!this._active) return;
    const idx = this.pending.findIndex((p) => p.t === consumedT);
    const smoothedOnly = idx >= 0 ? this.pending.slice(0, idx) : this.pending.slice();
    this.pending = idx >= 0 ? this.pending.slice(idx + 1) : [];
    this.frames.push({ ...frame, smoothedOnly, renderTimes: [] });
  }

  noteRender(nowMs: number): void {
    if (!this._active || this.frames.length === 0) return;
    this.frames[this.frames.length - 1].renderTimes.push(nowMs);
  }

  mark(position: PositionKey): void {
    if (!this._active) return;
    this.markers.push({ frameIndex: Math.max(0, this.frames.length - 1), position });
  }

  markByHotkey(key: string): PositionKey | null {
    const n = Number(key);
    if (!Number.isInteger(n) || n < 1 || n > POSITION_KEYS.length) return null;
    const p = POSITION_KEYS[n - 1];
    this.mark(p);
    return p;
  }

  wantsImage(nowMs: number): boolean {
    return this._active && this.frames.length > 0 && nowMs - this.lastImageAt >= RECORDER_LIMITS.IMAGE_INTERVAL_MS;
  }

  addImage(png: string, nowMs: number): void {
    if (!this._active) return;
    this.lastImageAt = nowMs;
    this.images.push({ frameIndex: this.frames.length - 1, png });
  }

  /** Ends the recording; frames without a render are dropped (cannot be replayed). */
  stop(): SessionFile | null {
    if (!this.header) return null;
    this._active = false;
    const frames = this.frames.filter((f) => f.renderTimes.length > 0);
    const file: SessionFile = { header: this.header, markers: this.markers, frames, images: this.images };
    this.header = null;
    this.frames = [];
    this.pending = [];
    return file;
  }
}
