/**
 * DRAPE AR session file, schema v1 (FR-18; AR_ARCHITECTURE.md §3 incl. G2 amendments 1–2).
 * Recorded locally, opt-in; never uploaded. Contains no account data, cookies, tokens, names, e-mail, location,
 * deviceId or groupId — the only device identifier is the user agent.
 */

export const SESSION_SCHEMA = 'drape-ar-session/1';

export type PositionKey = 'centre' | 'far_left' | 'far_right' | 'high' | 'low' | 'closer' | 'farther' | 'hips_out';
/** Hotkeys 1–8 in this order. */
export const POSITION_KEYS: PositionKey[] = ['centre', 'far_left', 'far_right', 'high', 'low', 'closer', 'farther', 'hips_out'];

export interface Size {
  w: number;
  h: number;
}
export type Vec3T = [number, number, number];
export type QuatT = [number, number, number, number];

export interface SessionHeader {
  schema: typeof SESSION_SCHEMA;
  createdAt: string;
  appCommit: string | null;
  /** FrameStep PIPELINE_VERSION at recording time (absent in sessions recorded before it existed = 1). */
  pipelineVersion?: number;
  userAgent: string;
  modelId: string;
  poseOptions: Record<string, number | string | boolean>;
  trackSettings: { width: number | null; height: number | null; frameRate: number | null; facingMode: string | null } | null;
  mirror: { value: boolean; source: 'getSettings' | 'requested-assumed' };
  garmentId: string;
  calibration: { fx: number; fy: number; cx: number; cy: number; width: number; height: number; method: string };
  /** getComputedStyle(<video>) */
  video: { objectFit: string; objectPosition: string };
}

export interface SessionLandmark {
  x: number;
  y: number;
  z: number;
  v: number;
  p?: number;
}

export interface SessionFrameOut {
  pose: { position: Vec3T; quaternion: QuatT; valid: boolean; reason: string | null; reprojPx: number | null; usedPoints: number } | null;
  pnpKeypointsCam: Record<string, Vec3T> | null;
  smoothedRoot: { position: Vec3T; quaternion: QuatT };
  registration: {
    errors: Record<string, { raw: number; smoothed: number } | null>;
    anchorDx: number | null;
    anchorDy: number | null;
    midShoulderScreen: { x: number; y: number } | null;
  } | null;
  distance: { z: number; mode: string } | null;
  timings: { inferMs: number; fitMs: number; renderMs: number };
  /** Diagnostics (optional; added for the user's 2026-11-07 hypotheses). */
  diag?: SessionFrameDiag;
}

export interface SessionFrameDiag {
  distance: {
    mode: string;
    z: number;
    referenceSpanPx: number | null;
    referenceDistanceM: number | null;
    samplesCollected: number;
    samplesRequired: number;
    reason: string | null;
    lastWindowSpread: number | null;
    shoulderVisibility: number;
    yawDeg: number;
  } | null;
  /** What this consumed frame did to the scene target. */
  setFrameTarget: 'fit' | 'invalid' | 'null';
  pnp: { valid: boolean; reason: string | null } | null;
  lastValidPoseAgeMs: number | null;
  snapPending: boolean;
  lerpA: number;
  bodyRootVisible: boolean;
  garment: {
    wrapperScale: Vec3T;
    anchorWorld: Vec3T;
    meshes: { name: string; role: string; sizeM: Vec3T; centreRelAnchorM: Vec3T; screen: { x: number; y: number; w: number; h: number } }[];
    /** Projected GLB shoulder seam (container px) — item 3 metric. */
    seam?: { widthPx: number; left: { x: number; y: number }; right: { x: number; y: number } } | null;
  } | null;
}

export interface SessionFrame {
  /** performance.now() of the pose frame (ms) — the timestamp the 1€ filter used. */
  t: number;
  mediaTime: number | null;
  video: Size;
  container: Size;
  dpr: number;
  displayMode: 'live' | 'inferred';
  presentedMediaTime: number | null;
  render: {
    canvasClient: Size;
    canvasBuffer: Size;
    drawingBuffer: Size;
    rendererPixelRatio: number;
    dpr: number;
    /** getComputedStyle(mirror wrapper).transform, e.g. "matrix(-1, 0, 0, 1, 0, 0)". */
    wrapperTransform: string;
  };
  /** 33 raw landmarks, or [] when MediaPipe detected no pose (the smoother is then not called). */
  raw: SessionLandmark[];
  world: SessionLandmark[] | null;
  /** Garment active for this frame (the user may switch while recording). */
  garmentId: string;
  /** Intrinsics used this frame [fx, fy, cx, cy] (card calibration can change them mid-session). */
  k: [number, number, number, number];
  /** Pose frames that the smoother consumed BEFORE this one but the render loop skipped (replay fidelity). */
  smoothedOnly: { t: number; raw: SessionLandmark[]; world: SessionLandmark[] | null }[];
  /** rAF timestamps of every render from this frame's consumption tick until the next consumed frame. */
  renderTimes: number[];
  out: SessionFrameOut;
}

export interface SessionMarker {
  frameIndex: number;
  position: PositionKey;
}

export interface SessionImage {
  frameIndex: number;
  /** data:image/png;base64 composite, 320 px wide (debug, opt-in). */
  png: string;
}

export interface SessionFile {
  header: SessionHeader;
  markers: SessionMarker[];
  frames: SessionFrame[];
  images: SessionImage[];
}

// ------------------------------------------------------------------------------------------- validator

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isSize = (v: unknown): v is Size => !!v && typeof v === 'object' && isNum((v as Size).w) && isNum((v as Size).h);
const FORBIDDEN_KEYS = ['deviceId', 'groupId', 'email', 'token', 'cookie', 'password', 'name'];

/** Returns up to `max` human-readable problems; empty array = valid. */
export function validateSession(obj: unknown, max = 25): string[] {
  const errs: string[] = [];
  const push = (m: string) => {
    if (errs.length < max) errs.push(m);
  };
  if (!obj || typeof obj !== 'object') return ['not an object'];
  const s = obj as SessionFile;
  const h = s.header;
  if (!h || h.schema !== SESSION_SCHEMA) push(`header.schema must be ${SESSION_SCHEMA}`);
  if (h) {
    if (typeof h.userAgent !== 'string') push('header.userAgent missing');
    if (typeof h.createdAt !== 'string') push('header.createdAt missing');
    if (!h.mirror || typeof h.mirror.value !== 'boolean' || !['getSettings', 'requested-assumed'].includes(h.mirror.source)) push('header.mirror invalid');
    if (!h.calibration || !isNum(h.calibration.fx) || !isNum(h.calibration.cx)) push('header.calibration invalid');
    if (!h.video || typeof h.video.objectFit !== 'string' || typeof h.video.objectPosition !== 'string') push('header.video (objectFit/objectPosition) missing');
    if (typeof h.garmentId !== 'string') push('header.garmentId missing');
  }
  if (!Array.isArray(s.frames) || s.frames.length === 0) push('frames must be a non-empty array');
  if (!Array.isArray(s.markers)) push('markers must be an array');
  if (!Array.isArray(s.images)) push('images must be an array');
  (s.frames ?? []).forEach((f, i) => {
    const at = `frames[${i}]`;
    if (!isNum(f.t)) push(`${at}.t`);
    if (!isSize(f.video) || !isSize(f.container)) push(`${at}.video/container`);
    if (!isNum(f.dpr)) push(`${at}.dpr`);
    if (f.displayMode !== 'live' && f.displayMode !== 'inferred') push(`${at}.displayMode`);
    const r = f.render;
    if (!r || !isSize(r.canvasClient) || !isSize(r.canvasBuffer) || !isSize(r.drawingBuffer) || !isNum(r.rendererPixelRatio) || typeof r.wrapperTransform !== 'string') {
      push(`${at}.render geometry incomplete`);
    }
    if (!Array.isArray(f.raw) || (f.raw.length !== 33 && f.raw.length !== 0) || f.raw.some((l) => !isNum(l.x) || !isNum(l.y) || !isNum(l.z) || !isNum(l.v))) push(`${at}.raw must be 33 finite landmarks (or empty = no detection)`);
    if (f.world !== null && (!Array.isArray(f.world) || f.world.length !== 33)) push(`${at}.world must be null or 33 landmarks`);
    if (!f.out || !f.out.smoothedRoot || !f.out.timings) push(`${at}.out incomplete`);
    if (typeof f.garmentId !== 'string') push(`${at}.garmentId`);
    if (!Array.isArray(f.k) || f.k.length !== 4 || !f.k.every(isNum)) push(`${at}.k must be [fx, fy, cx, cy]`);
    if (!Array.isArray(f.smoothedOnly)) push(`${at}.smoothedOnly must be an array`);
    if (!Array.isArray(f.renderTimes) || f.renderTimes.length === 0 || !f.renderTimes.every(isNum)) push(`${at}.renderTimes must be a non-empty number array`);
  });
  (s.markers ?? []).forEach((m, i) => {
    if (!isNum(m.frameIndex) || !POSITION_KEYS.includes(m.position)) push(`markers[${i}] invalid`);
  });
  (s.images ?? []).forEach((im, i) => {
    if (!isNum(im.frameIndex) || typeof im.png !== 'string' || !im.png.startsWith('data:image/png;base64,')) push(`images[${i}] invalid`);
  });
  // Privacy: forbidden keys anywhere in the header.
  const scan = (o: unknown, p: string) => {
    if (!o || typeof o !== 'object') return;
    for (const k of Object.keys(o)) {
      if (FORBIDDEN_KEYS.includes(k)) push(`forbidden key "${k}" at ${p}`);
      scan((o as Record<string, unknown>)[k], `${p}.${k}`);
    }
  };
  scan(h, 'header');
  return errs;
}
