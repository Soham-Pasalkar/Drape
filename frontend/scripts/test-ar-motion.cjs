/**
 * ADVERSARIAL motion test (user fix list 2026-11-07, item 6) — replaces the clean-subject motion test.
 * A synthetic subject moves CONTINUOUSLY for 10 s through the real pipeline (FrameStep + real scene via the Node
 * harness): distance 0.9–2.1 m, lateral sweeps of ±300 SCREEN px, ±15° yaw wobble, ±3 % shoulder-span noise,
 * shoulder visibility random in 0.5–0.9, 1.2 px landmark noise, and a segment with hips OUT of frame but reported
 * visible (MediaPipe behaviour seen on the M1 rig). Ground truth is the synthetic subject itself.
 * Assertions (after a 0.5 s warm-up):
 *   1. mode never blocks motion (only 'approximate' / 'metric'), Z is never frozen while the subject moves;
 *   2. Z follows distance: Z / (Z_true · W_prior / B_subject) within ±15 % on ≥ 95 % of frames AND within ±20 % on
 *      every frame. DECISION (user approved 2026-11-07, option 3): the ±15 %-every-frame form failed on 4 frames
 *      (< 0.1 s each) during approaches faster than 1.5 m/s, where the smoothed shoulder span lags; the alternatives
 *      (depth from the raw span, span-velocity prediction) add jitter or complexity. Frames with true approach speed
 *      > 1.5 m/s are reported separately (count + max error). No other threshold changed.
 *   3. projected garment shoulder-seam width / true shoulder pixel width within 1.05–1.20 on every frame;
 *   4. garment anchor within 8 px of the true mid-shoulder pixel (on screen) on every frame;
 *   5. sleeve seam gap (max over the ring) < 0.5 cm at every sample.
 * SYNTHETIC input — a pass does not confirm the live symptom is resolved.
 */
const THREE = require('three');
const { suite, test, assert, finish } = require('./lib/harness.cjs');
const { createScene } = require('./lib/scene-harness.cjs');
const { FrameStep } = require('../dist_test/pipeline/frame-step.js');
const { getGarmentById } = require('../dist_test/garment-registry.js');
const { computeVideoDisplayTransform, imageToDisplay, cameraToImage } = require('../dist_test/coordinates.js');
const { buildFrameDiag } = require('../dist_test/debug/frame-diag.js');
const { POPULATION_SHOULDER_BREADTH_M } = require('../dist_test/distance-estimator.js');

const W = 1280, H = 720, Cw = 960, Ch = 600, FPS = 30, SECONDS = 10;
const S = { B: 0.38, Hb: 0.285, L: 0.513 };
const SCALE = POPULATION_SHOULDER_BREADTH_M / S.B;
let seed = 4242;
const rand = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const gauss = () => Math.sqrt(-2 * Math.log(rand() + 1e-12)) * Math.cos(2 * Math.PI * rand());

function subjectAt(t, K, d) {
  // Continuous base motion
  let Z = 1.5 + 0.6 * Math.sin((2 * Math.PI * t) / 6);
  const screenShift = 300 * Math.sin((2 * Math.PI * t) / 4); // ±300 px on the mirrored screen
  let X = ((screenShift / d.scaleX) * Z) / K.fx; // camera +X = screen-left on the mirrored screen
  let Y = -0.05 + 0.03 * Math.sin((2 * Math.PI * t) / 3);
  const yaw = (15 * Math.PI) / 180 * Math.sin((2 * Math.PI * t) / 1.5);
  let segment = 'moving';
  // Hips-out segment (7.0–8.5 s): blend to a close, raised framing that crops the hips.
  if (t >= 7 && t < 8.5) {
    const u = Math.min(1, (t - 7) / 0.4);
    Z = Z + (0.85 - Z) * u; X = X * (1 - u); Y = Y + (-0.08 - Y) * u;
    segment = 'hips_out';
  } else if (t >= 8.5 && t < 8.9) {
    const u = (t - 8.5) / 0.4;
    Z = 0.85 + (Z - 0.85) * u; X = X * u; Y = -0.08 + (Y + 0.08) * u;
  }
  return { pos: new THREE.Vector3(X, Y, -Z), yaw, segment, Z };
}

function frameFor(t, K, d) {
  const sub = subjectAt(t, K, d);
  const R = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, sub.yaw, 0));
  const spanNoise = 1 + (rand() * 2 - 1) * 0.03;
  const local = {
    0: [0, S.L / 2 + 0.2, 0.08],
    11: [(S.B / 2) * spanNoise, S.L / 2, 0], 12: [(-S.B / 2) * spanNoise, S.L / 2, 0],
    23: [S.Hb / 2, -S.L / 2, 0], 24: [-S.Hb / 2, -S.L / 2, 0],
    13: [S.B / 2 + 0.05, S.L / 2 - 0.28, 0], 14: [-S.B / 2 - 0.05, S.L / 2 - 0.28, 0],
    15: [S.B / 2 + 0.07, S.L / 2 - 0.53, 0.05], 16: [-S.B / 2 - 0.07, S.L / 2 - 0.53, 0.05],
    25: [S.Hb / 2, -S.L / 2 - 0.43, 0], 26: [-S.Hb / 2, -S.L / 2 - 0.43, 0],
  };
  const truth = {}; // noise-free shoulders for ground truth
  for (const k of [11, 12]) truth[k] = new THREE.Vector3((k === 11 ? 1 : -1) * S.B / 2, S.L / 2, 0).applyQuaternion(R).add(sub.pos);
  const cam = {};
  for (const k of Object.keys(local)) cam[k] = new THREE.Vector3(...local[k]).applyQuaternion(R).add(sub.pos);
  const hip = cam[23].clone().add(cam[24]).multiplyScalar(0.5);
  const shoulderVis = 0.5 + 0.4 * rand();
  const raw = [], world = [];
  for (let i = 0; i < 33; i++) {
    if (!cam[i]) { raw.push({ x: 0.5, y: 0.5, z: 0, visibility: 0.01, presence: 0.01 }); world.push({ x: 0, y: 0, z: 0, visibility: 0.01 }); continue; }
    const p = cameraToImage(cam[i], K);
    const x = (p.x + gauss() * 1.2) / W, y = (p.y + gauss() * 1.2) / H;
    const inFrame = x >= 0 && x <= 1 && y >= 0 && y <= 1;
    const vis = i === 11 || i === 12 ? shoulderVis : i === 23 || i === 24 ? 0.93 : inFrame ? 0.9 : 0.2;
    raw.push({ x, y, z: 0, visibility: vis, presence: vis });
    const w = cam[i].clone().sub(hip);
    world.push({ x: w.x, y: -w.y, z: -w.z, visibility: vis });
  }
  return { raw, world, truth, sub };
}

async function run() {
  const meta = getGarmentById('tshirt-crewneck');
  const scene = createScene(Cw, Ch);
  await scene.loadGarment(meta);
  scene.setRegistrationVisible(true);
  const step = new FrameStep(W, H);
  const K = step.engine.calibrationManager.getIntrinsics();
  const d = computeVideoDisplayTransform(W, H, Cw, Ch, 'cover');
  const screen = (img) => { const p = imageToDisplay(img, d); return { x: Cw - p.x, y: p.y }; }; // single CSS mirror
  const rows = [];
  let prevZ = null, frozen = 0;
  for (let f = 0; f < SECONDS * FPS; f++) {
    const t = f / FPS, tMs = t * 1000;
    const fr = frameFor(t, K, d);
    step.engine.calibrationManager.updateResolution(W, H);
    scene.setProjection(K, d);
    const kp = step.smooth(fr.raw, tMs, fr.world);
    const fit = kp ? step.fit(kp, meta, W, H) : null;
    scene.setFrameTarget(fit, tMs);
    scene.render(tMs);
    scene.render(tMs + 1000 / 60);
    if (t < 0.5 || !fit) continue;
    const diag = buildFrameDiag(fit, scene, d, tMs);
    const ls = screen(cameraToImage(fr.truth[11], K)), rs = screen(cameraToImage(fr.truth[12], K));
    const mid = { x: (ls.x + rs.x) / 2, y: (ls.y + rs.y) / 2 };
    const shoulderScreenPx = Math.hypot(ls.x - rs.x, ls.y - rs.y);
    const anchor = scene.registrationPixels(d).garmentAnchor;
    const a = { x: Cw - anchor.x, y: anchor.y };
    const z = fit.distance.distanceM;
    if (prevZ !== null && Math.abs(z - prevZ) < 1e-9) frozen++;
    prevZ = z;
    rows.push({
      t, segment: fr.sub.segment, mode: fit.distance.mode, bust: fit.tracking.bustMode,
      zRatio: z / (fr.sub.Z * SCALE),
      approachMps: (subjectAt(t - 0.005, K, d).Z - subjectAt(t + 0.005, K, d).Z) / 0.01, // > 0 = moving toward camera
      widthRatio: diag.garment.seam.widthPx / shoulderScreenPx,
      anchorErr: Math.hypot(a.x - mid.x, a.y - mid.y),
      gapMaxCm: f % 15 === 0 ? Math.max(...scene.sleeveGaps().map((g) => g.maxCm)) : null,
    });
  }
  scene.dispose();
  return { rows, frozen };
}

const stats = (a) => {
  const s = [...a].sort((x, y) => x - y);
  return { min: s[0], p50: s[s.length >> 1], p95: s[Math.floor(0.95 * (s.length - 1))], max: s[s.length - 1] };
};
const fmt = (o, d = 3) => `min ${o.min.toFixed(d)} · p50 ${o.p50.toFixed(d)} · p95 ${o.p95.toFixed(d)} · max ${o.max.toFixed(d)}`;

module.exports = { frameFor, subjectAt, W, H, Cw, Ch, FPS, SCALE };
if (require.main === module) (async () => {
  const { rows, frozen } = await run();
  suite('Adversarial moving subject (10 s, noise, yaw wobble, low visibility, hips out of frame)');
  const z = stats(rows.map((r) => r.zRatio));
  const zIn15 = rows.filter((r) => Math.abs(r.zRatio - 1) <= 0.15).length / rows.length;
  const fast = rows.filter((r) => r.approachMps > 1.5);
  const fastMaxErr = fast.length ? Math.max(...fast.map((r) => Math.abs(r.zRatio - 1))) : 0;
  const w = stats(rows.map((r) => r.widthRatio));
  const an = stats(rows.map((r) => r.anchorErr));
  const anH = stats(rows.filter((r) => r.segment === 'hips_out').map((r) => r.anchorErr));
  const gaps = stats(rows.filter((r) => r.gapMaxCm !== null).map((r) => r.gapMaxCm));
  const modes = [...new Set(rows.map((r) => r.mode))];
  const bustFrames = rows.filter((r) => r.bust).length, hipsOutFrames = rows.filter((r) => r.segment === 'hips_out').length;
  console.log(`      frames ${rows.length} | modes ${modes.join(',')} | frozen-Z frames ${frozen} | bust mode ${bustFrames} (hips-out segment ${hipsOutFrames})`);
  console.log(`      Z ratio            ${fmt(z)}`);
  console.log(`      Z within ±15 %     ${(100 * zIn15).toFixed(1)} % of frames | approach > 1.5 m/s: ${fast.length} frames, max |err| ${(100 * fastMaxErr).toFixed(1)} %`);
  console.log(`      seam/shoulder px   ${fmt(w)}`);
  console.log(`      anchor err px      ${fmt(an, 1)}   (hips-out segment: ${fmt(anH, 1)})`);
  console.log(`      seam gap max cm    ${fmt(gaps, 2)}`);
  test('1. mode never blocks motion; Z never frozen', () => {
    assert(modes.every((m) => m === 'approximate' || m === 'metric'), `modes ${modes}`);
    assert(frozen === 0, `${frozen} frames with identical Z`);
  });
  test('2a. Z within ±15 % on ≥ 95 % of frames', () => assert(zIn15 >= 0.95, `${(100 * zIn15).toFixed(1)} %`));
  test('2b. Z within ±20 % on every frame', () => assert(z.min >= 0.8 && z.max <= 1.2, fmt(z)));
  test('3. garment seam width = 1.05–1.20 × shoulder pixel width on every frame', () => assert(w.min >= 1.05 && w.max <= 1.2, fmt(w)));
  test('4. anchor within 8 px of the true mid-shoulder on every frame', () => assert(an.max <= 8, fmt(an, 1)));
  test('5. sleeve seam gap < 0.5 cm at every sample', () => assert(gaps.max < 0.5, fmt(gaps, 2)));
  test('hips out of frame ⇒ bust mode in that segment', () => assert(bustFrames >= hipsOutFrames * 0.8, `${bustFrames}/${hipsOutFrames}`));
  finish('test-ar-motion');
})();
