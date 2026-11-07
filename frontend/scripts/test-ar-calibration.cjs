/**
 * Calibration + distance estimation tests: prior, card, reset, resolution change, reference
 * lifecycle, low-confidence rejection, outliers, relative distance, yaw, metric mode.
 */
const { suite, test, assert, near, finish } = require('./lib/harness.cjs');
const { CameraCalibrationManager, ISO_ID1_CARD, PRIOR_HFOV_DEGREES } = require('../dist_test/camera-calibration.js');
const {
  ShoulderDistanceEstimator,
  DISTANCE_ESTIMATOR_CONFIG: CFG,
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
const FX = new CameraCalibrationManager(1280, 720).getIntrinsics().fx;
const B_TRUE = 0.38; // world-landmark shoulder breadth of the synthetic subject
const spanAt = (Z, yaw = 0) => ((FX * B_TRUE) / Z) * Math.cos(yaw);
let tMs = 0;
const obs = (Z, o = {}) => ({
  shoulderSpanPx: spanAt(Z, o.yaw ?? 0),
  yawRad: o.yaw ?? 0,
  visibility: o.vis ?? 0.95,
  worldShoulderBreadthM: o.world === false ? undefined : B_TRUE,
  timestampMs: (tMs += 33.3),
});
const feed = (est, Z, n, o) => { let r; for (let i = 0; i < n; i++) r = est.update(obs(Z, o), o?.fx ?? FX); return r; };

suite('Distance reference lifecycle (RC2)');
test('starts uninitialized and never reports the 1.6 m default as measured', () => {
  const e = new ShoulderDistanceEstimator();
  const r = e.update(obs(1.5), FX);
  assert(r.mode === 'uninitialized', r.mode);
  assert(r.confidence <= 0.25);
});

test(`initializes automatically after ${CFG.REFERENCE_WINDOW} stable frames`, () => {
  const e = new ShoulderDistanceEstimator();
  const r1 = feed(e, 1.5, CFG.REFERENCE_WINDOW - 1);
  assert(r1.mode === 'uninitialized');
  const r2 = feed(e, 1.5, 1);
  assert(e.isInitialized, 'reference set');
  assert(r2.mode === 'relative', r2.mode);
  assert(r2.breadthSource === 'world_landmarks');
  near(r2.referenceDistanceM, 1.5, 1e-6, 'Z0 = fx·B/S0');
});

test('uses the population prior breadth when world landmarks are missing', () => {
  const e = new ShoulderDistanceEstimator();
  const r = feed(e, 1.5, CFG.REFERENCE_WINDOW + 2, { world: false });
  assert(r.breadthSource === 'population_prior');
  near(r.shoulderBreadthM, POPULATION_SHOULDER_BREADTH_M, 0);
  near(r.referenceDistanceM, (1.5 * POPULATION_SHOULDER_BREADTH_M) / B_TRUE, 1e-6, 'scale-ambiguous Z0');
});

test('low-visibility frames are not collected', () => {
  const e = new ShoulderDistanceEstimator();
  feed(e, 1.5, 60, { vis: 0.4 });
  assert(!e.isInitialized);
  const r = e.update(obs(1.5, { vis: 0.4 }), FX);
  assert(r.mode === 'uninitialized');
});

test('large yaw frames are not used for the reference', () => {
  const e = new ShoulderDistanceEstimator();
  feed(e, 1.5, 60, { yaw: 0.6 });
  assert(!e.isInitialized);
});

test('an unstable window (subject walking) delays initialization', () => {
  const e = new ShoulderDistanceEstimator();
  for (let i = 0; i < CFG.REFERENCE_WINDOW; i++) e.update(obs(1.0 + i * 0.05), FX);
  assert(!e.isInitialized, 'moving subject must not set a reference');
  feed(e, 1.8, CFG.REFERENCE_WINDOW);
  assert(e.isInitialized);
});

test('resetReference returns to uninitialized and re-initializes', () => {
  const e = new ShoulderDistanceEstimator();
  feed(e, 1.5, CFG.REFERENCE_WINDOW);
  e.resetReference();
  assert(!e.isInitialized);
  const r = feed(e, 2.0, CFG.REFERENCE_WINDOW);
  near(r.referenceDistanceM, 2.0, 1e-6);
});

suite('Relative distance tracking Z(t) = Z0·S0/S(t)');
test('moving closer / farther tracks the true distance', () => {
  const e = new ShoulderDistanceEstimator();
  feed(e, 1.5, CFG.REFERENCE_WINDOW);
  for (const Z of [1.0, 2.2, 0.8, 1.5]) {
    // Approach gradually (≤ 20 % jumps) so the outlier gate does not trigger.
    let r;
    for (let i = 0; i < 60; i++) r = e.update(obs(Z), FX);
    near(r.distanceM, Z, 0.01, `Z=${Z}`);
    assert(r.mode === 'relative');
  }
});

test('yaw correction keeps distance stable while turning (±45°)', () => {
  const e = new ShoulderDistanceEstimator();
  feed(e, 1.5, CFG.REFERENCE_WINDOW);
  for (const yaw of [0.3, 0.6, 0.785, -0.785, 0]) {
    let r;
    for (let i = 0; i < 20; i++) r = e.update(obs(1.5, { yaw }), FX);
    near(r.distanceM, 1.5, 0.01, `yaw ${yaw}`);
  }
});

test('|yaw| > 60° is reported as low_confidence and the value is held', () => {
  const e = new ShoulderDistanceEstimator();
  feed(e, 1.5, CFG.REFERENCE_WINDOW + 10);
  const r = e.update(obs(1.5, { yaw: 1.2 }), FX);
  assert(r.mode === 'low_confidence', r.mode);
  near(r.distanceM, 1.5, 0.01);
});

test('single-frame span outliers are rejected; persistent changes are accepted', () => {
  const e = new ShoulderDistanceEstimator();
  feed(e, 1.5, CFG.REFERENCE_WINDOW + 10);
  const spike = e.update(obs(0.7), FX); // span doubles in one frame
  assert(spike.mode === 'low_confidence');
  near(spike.distanceM, 1.5, 0.01, 'held');
  const back = feed(e, 1.5, 3);
  near(back.distanceM, 1.5, 0.01);
  let r;
  for (let i = 0; i < CFG.OUTLIER_PERSIST_FRAMES + 40; i++) r = e.update(obs(0.9), FX);
  near(r.distanceM, 0.9, 0.02, 'persistent change accepted');
});

test('focal-length change re-derives Z0 (relative mode)', () => {
  const e = new ShoulderDistanceEstimator();
  feed(e, 1.5, CFG.REFERENCE_WINDOW);
  const r = e.update(obs(1.5), FX * 1.2);
  near(r.referenceDistanceM, 1.5 * 1.2, 1e-6);
});

test('known reference distance switches to metric mode', () => {
  const e = new ShoulderDistanceEstimator();
  assert(e.setKnownReferenceDistance(1.4, FX) === false, 'needs a reference first');
  feed(e, 1.5, CFG.REFERENCE_WINDOW, { world: false });
  assert(e.setKnownReferenceDistance(1.5, FX));
  let r;
  for (let i = 0; i < 60; i++) r = e.update(obs(1.0, { world: false }), FX);
  assert(r.mode === 'metric');
  assert(r.breadthSource === 'known_distance');
  near(r.shoulderBreadthM, B_TRUE, 1e-6, 'breadth recovered from the known distance');
  near(r.distanceM, 1.0, 0.01);
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
