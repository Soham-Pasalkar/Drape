/**
 * Calibration + distance estimation tests: prior, card, reset, resolution change, reference
 * lifecycle, low-confidence rejection, outliers, relative distance, yaw, metric mode.
 */
const { suite, test, assert, near, finish } = require('./lib/harness.cjs');
const { CameraCalibrationManager, ISO_ID1_CARD, PRIOR_HFOV_DEGREES } = require('../dist_test/camera-calibration.js');
const {
  ShoulderDistanceEstimator,
  DISTANCE_ESTIMATOR_CONFIG,
  POPULATION_SHOULDER_BREADTH_M,
} = require('../dist_test/distance-estimator.js');

suite('Camera intrinsics');
test('population prior: 65° HFOV, square pixels, centred principal point', () => {
  const k = new CameraCalibrationManager(1280, 720).getIntrinsics();
  near(k.fx, 640 / Math.tan((PRIOR_HFOV_DEGREES * Math.PI) / 360), 1e-9);
  near(k.fy, k.fx, 0);
  near(k.cx, 640, 0);
  near(k.cy, 360, 0);
  assert(!k.isCalibrated && k.calibrationMethod === 'prior');
});

test('createPopulationPrior is pure (does not mutate the manager)', () => {
  const m = new CameraCalibrationManager(1280, 720);
  m.calibrateWithReferenceCard(300, 300 / ISO_ID1_CARD.ASPECT, 0.5);
  const v = m.version;
  m.createPopulationPrior(640, 480);
  assert(m.getIntrinsics().calibrationMethod === 'card', 'still card-calibrated');
  assert(m.version === v, 'version unchanged');
});

test('resetToPopulationPrior replaces the ACTIVE intrinsics (RC10)', () => {
  const m = new CameraCalibrationManager(1280, 720);
  m.calibrateWithReferenceCard(300, 300 / ISO_ID1_CARD.ASPECT, 0.5);
  const fxCard = m.getIntrinsics().fx;
  const v = m.version;
  m.resetToPopulationPrior(1280, 720);
  const k = m.getIntrinsics();
  assert(k.calibrationMethod === 'prior' && !k.isCalibrated, 'prior active');
  assert(Math.abs(k.fx - fxCard) > 1, 'fx changed');
  assert(m.version > v, 'version bumped so the projection refreshes');
});

test('card calibration: fx = w·Z / 0.0856', () => {
  const m = new CameraCalibrationManager(1280, 720);
  const k = m.calibrateWithReferenceCard(200, 200 / ISO_ID1_CARD.ASPECT, 0.5);
  near(k.fx, (200 * 0.5) / 0.0856, 1e-6);
  assert(k.isCalibrated && k.calibrationMethod === 'card');
});

test('invalid card input is rejected', () => {
  const m = new CameraCalibrationManager(1280, 720);
  let threw = false;
  try { m.calibrateWithReferenceCard(0, 10, 0.5); } catch { threw = true; }
  assert(threw);
});

test('resolution change keeps FOV (fx scales) and bumps version', () => {
  const m = new CameraCalibrationManager(1280, 720);
  const fx = m.getIntrinsics().fx;
  const v = m.version;
  assert(m.updateResolution(640, 360) === true);
  near(m.getIntrinsics().fx, fx / 2, 1e-9);
  near(m.getIntrinsics().cx, 320, 1e-9);
  assert(m.version > v);
  assert(m.updateResolution(640, 360) === false, 'no-op when unchanged');
});

test('aspect-ratio change rebuilds the prior for uncalibrated cameras', () => {
  const m = new CameraCalibrationManager(1280, 720);
  m.updateResolution(640, 480);
  const k = m.getIntrinsics();
  near(k.fx, 320 / Math.tan((PRIOR_HFOV_DEGREES * Math.PI) / 360), 1e-9);
  near(k.cy, 240, 1e-9);
});

// --------------------------------------------------------------------------------------
// Depth (2026-11-07 fix, item 2): instant Z = fx·W/S every frame, never gated or frozen. The previous
// reference-window tests were replaced because that behaviour was deliberately removed at the user's request.
const FX = new CameraCalibrationManager(1280, 720).getIntrinsics().fx;
const B_TRUE = 0.38; // the synthetic subject's real shoulder-joint span
const W = POPULATION_SHOULDER_BREADTH_M; // what the estimator assumes
const SCALE = W / B_TRUE;
const spanAt = (Z, yaw = 0) => ((FX * B_TRUE) / Z) * Math.cos(yaw);
let tMs = 0;
const obs = (Z, o = {}) => ({ shoulderSpanPx: spanAt(Z, o.yaw ?? 0), yawRad: o.yaw ?? 0, visibility: o.vis ?? 0.95, timestampMs: (tMs += 33.3) });
const feed = (est, Z, n, o) => { let r; for (let i = 0; i < n; i++) r = est.update(obs(Z, o), FX); return r; };

suite('Instant depth — no calibration gate');
test('the very first frame yields Z = fx·W/S (no "calibrating" state)', () => {
  const e = new ShoulderDistanceEstimator();
  const r = e.update(obs(1.5), FX);
  assert(r.mode === 'approximate', r.mode);
  near(r.distanceM, 1.5 * SCALE, 1e-9);
  near(r.instantDistanceM, 1.5 * SCALE, 1e-9);
});
test('moving closer / farther: Z follows within 3 % after 1 s (step changes up to 1.4 m; rate cap 2.5 m/s)', () => {
  const e = new ShoulderDistanceEstimator();
  feed(e, 1.5, 10);
  for (const Z of [1.0, 2.2, 0.8, 1.5]) {
    const r = feed(e, Z, 30);
    near(r.distanceM, Z * SCALE, 0.03 * Z * SCALE, `Z=${Z}`);
  }
});
test('yaw correction keeps Z stable while turning (±45°)', () => {
  const e = new ShoulderDistanceEstimator();
  feed(e, 1.5, 10);
  for (const yaw of [0.3, 0.6, 0.785, -0.785, 0]) near(feed(e, 1.5, 20, { yaw }).distanceM, 1.5 * SCALE, 0.03 * 1.5 * SCALE, `yaw ${yaw}`);
});
test('low visibility never freezes Z: blends, then returns to the instant estimate after the timeout', () => {
  const e = new ShoulderDistanceEstimator();
  feed(e, 1.5, 10);
  const r1 = feed(e, 1.0, 5, { vis: 0.35 }); // weight ≈ 0.125: moves only a little at first
  assert(r1.distanceM < 1.5 * SCALE - 0.01, `Z must move toward the new value even at low weight: ${r1.distanceM}`);
  assert(/blending/.test(r1.reason), r1.reason);
  const r2 = feed(e, 1.0, 45, { vis: 0.35 }); // 1.5 s of low weight
  near(r2.distanceM, 1.0 * SCALE, 0.03, 'returned to instant estimate');
  assert(/instant estimate/.test(r2.reason), r2.reason);
});
test('|yaw| > 60°: weight 0 but never held longer than the timeout (returns to the instant estimate)', () => {
  // Beyond 60° the 1/cos correction is floored at cos = 0.5, so the instant estimate itself is biased far;
  // the requirement here is only that Z is not frozen.
  const e = new ShoulderDistanceEstimator();
  feed(e, 1.5, 10);
  const r = feed(e, 2.0, 50, { yaw: 1.2 });
  assert(r.mode === 'approximate');
  near(r.distanceM, r.instantDistanceM, 0.05 * r.instantDistanceM, 'follows the instant estimate after the timeout');
  assert(Math.abs(r.distanceM - 1.5 * SCALE) > 0.3, 'not held at the previous value');
});
test('a single-frame span spike is bounded by the max rate of change', () => {
  const e = new ShoulderDistanceEstimator();
  feed(e, 1.5, 10);
  const before = e.getLastEstimate().distanceM;
  const r = e.update(obs(0.5), FX);
  const maxStep = DISTANCE_ESTIMATOR_CONFIG.MAX_RATE_MPS * 0.0333 + 1e-6;
  assert(before - r.distanceM <= maxStep + 1e-6, `step ${(before - r.distanceM).toFixed(4)} m > ${maxStep.toFixed(4)} m`);
  assert(/rate-limited/.test(r.reason), r.reason);
});
test('known reference distance only corrects the scale (metric mode), motion unaffected', () => {
  const e = new ShoulderDistanceEstimator();
  assert(e.setKnownReferenceDistance(1.5, FX) === false, 'needs a measured span');
  feed(e, 1.5, 10);
  assert(e.setKnownReferenceDistance(1.5, FX));
  const r = feed(e, 1.0, 30);
  assert(r.mode === 'metric' && r.breadthSource === 'known_distance');
  near(r.shoulderBreadthM, B_TRUE, 1e-6, 'breadth recovered');
  near(r.distanceM, 1.0, 0.02);
  e.resetReference();
  assert(e.update(obs(1.0), FX).mode === 'approximate');
});

suite('Mirror decision (FR-02, assumption A6)');
const { decideMirror } = require('../dist_test/camera.js');
test('reported facingMode wins and is labelled getSettings', () => {
  const a = decideMirror('user', { width: 1280, height: 720, frameRate: 30, facingMode: 'environment' });
  assert(a.value === false && a.source === 'getSettings');
  const b = decideMirror('environment', { width: 1280, height: 720, frameRate: 30, facingMode: 'user' });
  assert(b.value === true && b.source === 'getSettings');
});
test('missing facingMode (desktop Safari) falls back to the requested mode, labelled requested-assumed', () => {
  const a = decideMirror('user', { width: 1280, height: 720, frameRate: 30, facingMode: null });
  assert(a.value === true && a.source === 'requested-assumed');
  const b = decideMirror('environment', null);
  assert(b.value === false && b.source === 'requested-assumed');
});

finish('test-ar-calibration');
