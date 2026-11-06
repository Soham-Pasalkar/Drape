/**
 * End-to-end fitting pipeline on SYNTHETIC landmarks.
 *
 * A known 3D subject (body-local skeleton + pose in camera space) is projected through the
 * pinhole model to produce what MediaPipe would report (normalized image landmarks + hip-centred
 * world landmarks). The pipeline (LandmarkSmoother → FittingEngine → GarmentInstance) must
 * recover pose, distance and arm directions, and place each garment so that its semantic
 * anchor projects onto the corresponding landmarks.
 *
 * This is NOT a live-webcam test: MediaPipe's real noise, bias and failure modes are not
 * reproduced beyond additive pixel noise.
 */
const fs = require('fs');
const path = require('path');
const THREE = require('three');
const { suite, test, assert, near, finish } = require('./lib/harness.cjs');
const { FittingEngine } = require('../dist_test/fitting-engine.js');
const { LandmarkSmoother } = require('../dist_test/landmark-smoother.js');
const { GARMENTS, getGarmentById } = require('../dist_test/garment-registry.js');
const { GarmentInstance } = require('../dist_test/garment-instance.js');
const { MHRBodyProxy } = require('../dist_test/mhr-body-proxy.js');
const { cameraToImage } = require('../dist_test/coordinates.js');
const { DISTANCE_ESTIMATOR_CONFIG } = require('../dist_test/distance-estimator.js');
const { loadGLB } = require('./lib/glb-node-loader.cjs');

const W = 1280, H = 720;
const SUBJECT = { B: 0.38, Hb: 0.285, L: 0.513, upper: 0.29, fore: 0.26, thigh: 0.43 };
let seed = 12345;
const rand = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const gauss = () => Math.sqrt(-2 * Math.log(rand() + 1e-12)) * Math.cos(2 * Math.PI * rand());

/**
 * @param pose {pos: Vector3 camera-space torso centre, yaw, pitch, roll, armL, armR (body-local dirs)}
 */
function synthFrame(engineK, pose, noisePx = 0) {
  const R = new THREE.Quaternion().setFromEuler(new THREE.Euler(pose.pitch || 0, pose.yaw || 0, pose.roll || 0, 'YXZ'));
  const S = SUBJECT;
  const local = {};
  local[11] = new THREE.Vector3(S.B / 2, S.L / 2, 0);
  local[12] = new THREE.Vector3(-S.B / 2, S.L / 2, 0);
  local[23] = new THREE.Vector3(S.Hb / 2, -S.L / 2, 0);
  local[24] = new THREE.Vector3(-S.Hb / 2, -S.L / 2, 0);
  const armL = (pose.armL || new THREE.Vector3(0.15, -1, 0)).clone().normalize();
  const armR = (pose.armR || new THREE.Vector3(-0.15, -1, 0)).clone().normalize();
  local[13] = local[11].clone().addScaledVector(armL, S.upper);
  local[14] = local[12].clone().addScaledVector(armR, S.upper);
  local[15] = local[13].clone().addScaledVector(pose.foreL || armL, S.fore);
  local[16] = local[14].clone().addScaledVector(pose.foreR || armR, S.fore);
  local[25] = local[23].clone().add(new THREE.Vector3(0, -S.thigh, 0));
  local[26] = local[24].clone().add(new THREE.Vector3(0, -S.thigh, 0));
  local[0] = new THREE.Vector3(0, S.L / 2 + 0.2, 0.08);

  const cam = {};
  for (const k of Object.keys(local)) cam[k] = local[k].clone().applyQuaternion(R).add(pose.pos);
  const hipC = cam[23].clone().add(cam[24]).multiplyScalar(0.5);

  const raw = [];
  const world = [];
  for (let i = 0; i < 33; i++) {
    if (!cam[i]) {
      raw.push({ x: 0.5, y: 0.5, z: 0, visibility: 0.01 });
      world.push({ x: 0, y: 0, z: 0, visibility: 0.01 });
      continue;
    }
    const uv = cameraToImage(cam[i], engineK);
    const vis = pose.visibility?.[i] ?? 0.97;
    raw.push({ x: (uv.x + gauss() * noisePx) / W, y: (uv.y + gauss() * noisePx) / H, z: 0, visibility: vis });
    const d = cam[i].clone().sub(hipC);
    world.push({ x: d.x, y: -d.y, z: -d.z, visibility: vis }); // camera axes → MediaPipe world axes
  }
  return { raw, world, cam, R };
}

function makeRig(garmentId) {
  const engine = new FittingEngine(W, H);
  const smoother = new LandmarkSmoother();
  const meta = getGarmentById(garmentId);
  const dir = path.join(__dirname, '..', 'public', 'garments', garmentId);
  const { scene } = loadGLB(path.join(dir, 'model.glb'));
  const inst = new GarmentInstance(scene, meta, JSON.parse(fs.readFileSync(path.join(dir, 'simulation-data.json'), 'utf8')));
  const proxy = new MHRBodyProxy();
  const bodyRoot = new THREE.Group();
  bodyRoot.add(proxy.group);
  inst.attach(bodyRoot);
  return { engine, smoother, meta, inst, proxy, bodyRoot, t: 0 };
}

/** One pose frame through the whole pipeline. Applies the fitted pose directly (no render lag). */
function step(rig, pose, noisePx = 0) {
  rig.t += 33.3;
  const K = rig.engine.calibrationManager.getIntrinsics();
  const f = synthFrame(K, pose, noisePx);
  const kp = rig.smoother.process(f.raw, rig.t, f.world);
  if (!kp) return { fit: null, frame: f };
  const fit = rig.engine.processFrame(kp, rig.meta, W, H);
  if (fit.pnpResult.valid) {
    rig.bodyRoot.position.fromArray(fit.bodyPose.position);
    rig.bodyRoot.quaternion.fromArray(fit.bodyPose.quaternion);
    rig.bodyRoot.updateMatrixWorld(true);
    rig.proxy.setShape(fit.bodyShape);
    rig.inst.update({
      bodyProxy: rig.proxy, bodyRoot: rig.bodyRoot, dt: 1 / 30, nowMs: rig.t,
      armDirsBody: { left: fit.armDirectionsBody.left && new THREE.Vector3(...fit.armDirectionsBody.left), right: fit.armDirectionsBody.right && new THREE.Vector3(...fit.armDirectionsBody.right) },
      fullArmDirsBody: { left: fit.fullArmDirectionsBody.left && new THREE.Vector3(...fit.fullArmDirectionsBody.left), right: fit.fullArmDirectionsBody.right && new THREE.Vector3(...fit.fullArmDirectionsBody.right) },
      targetScale: new THREE.Vector3(...fit.garmentScale), tracking: true, frameAccelWorld: new THREE.Vector3(),
    });
  }
  return { fit, frame: f };
}

const run = (rig, pose, n, noise = 0) => { let r; for (let i = 0; i < n; i++) r = step(rig, pose, noise); return r; };
const angleBetween = (qa, qb) => 2 * Math.acos(Math.min(1, Math.abs(qa.dot(qb))));
const DEG = Math.PI / 180;

suite('Static subject at 1.5 m (reference initialization)');
{
  const rig = makeRig('tshirt-crewneck');
  const pose = { pos: new THREE.Vector3(0.05, -0.05, -1.5) };
  const early = run(rig, pose, 5);
  test('first frames are explicitly uninitialized', () => assert(early.fit.distance.mode === 'uninitialized'));
  const r = run(rig, pose, DISTANCE_ESTIMATOR_CONFIG.REFERENCE_WINDOW + 20);
  test('reference initializes automatically → relative mode', () => assert(r.fit.distance.mode === 'relative', r.fit.distance.mode));
  test('distance ≈ 1.5 m (world-landmark breadth prior matches the subject)', () => near(r.fit.distance.distanceM, 1.5, 0.02));
  test('PnP recovers position (< 1.5 cm) and rotation (< 1.5°)', () => {
    const p = new THREE.Vector3(...r.fit.bodyPose.position);
    assert(p.distanceTo(pose.pos) < 0.015, `pos err ${(p.distanceTo(pose.pos) * 100).toFixed(2)} cm`);
    assert(angleBetween(new THREE.Quaternion(...r.fit.bodyPose.quaternion), new THREE.Quaternion()) < 1.5 * DEG);
  });
  test('reprojection error < 0.5 px on noise-free input', () => assert(r.fit.pnpResult.reprojectionError < 0.5, `${r.fit.pnpResult.reprojectionError}`));
  test('body proportions observed from the image (not the population default)', () => {
    assert(r.fit.tracking.proportionSource === 'observed');
    near(r.fit.bodyShape.hipBreadthM / r.fit.bodyShape.shoulderBreadthM, SUBJECT.Hb / SUBJECT.B, 0.01);
    near(r.fit.bodyShape.torsoLengthM / r.fit.bodyShape.shoulderBreadthM, SUBJECT.L / SUBJECT.B, 0.02);
  });
  test('measurements are labelled prior-scaled and the fit verdict is not claimed reliable', () => {
    assert(r.fit.measurements.scaleSource === 'anthropometric_prior');
    assert(r.fit.ease.reliable === false);
    assert(r.fit.garmentScale.every((v) => v === 1), 'no fit scaling from unreliable measurements');
  });
  test('shoulder span is measured in true pixels', () => {
    const K = rig.engine.calibrationManager.getIntrinsics();
    near(r.fit.tracking.shoulderSpanPx, (K.fx * SUBJECT.B) / 1.5, 1.0);
  });
}

suite('Moving closer / farther');
{
  const rig = makeRig('tshirt-crewneck');
  run(rig, { pos: new THREE.Vector3(0, 0, -1.5) }, 40);
  for (const Z of [1.2, 1.0, 1.8, 2.4, 1.5]) {
    test(`distance and PnP depth follow the subject to ${Z} m`, () => {
      // Walk there over ~1 s.
      const cur = -new THREE.Vector3(...rig.bodyRoot.position.toArray()).z;
      for (let i = 1; i <= 30; i++) step(rig, { pos: new THREE.Vector3(0, 0, -(cur + ((Z - cur) * i) / 30)) });
      const r = run(rig, { pos: new THREE.Vector3(0, 0, -Z) }, 30);
      near(r.fit.distance.distanceM, Z, 0.03 * Z, 'distance');
      near(-r.fit.bodyPose.position[2], Z, 0.03 * Z, 'PnP depth');
    });
  }
}

suite('Turning left / right');
{
  const rig = makeRig('tshirt-crewneck');
  run(rig, { pos: new THREE.Vector3(0, 0, -1.5) }, 40);
  for (const yawDeg of [25, 45, -25, -45, 0]) {
    test(`yaw ${yawDeg}°: rotation recovered (< 3°), distance stable (< 3 %)`, () => {
      const pose = { pos: new THREE.Vector3(0, 0, -1.5), yaw: yawDeg * DEG };
      const r = run(rig, pose, 40);
      const q = new THREE.Quaternion(...r.fit.bodyPose.quaternion);
      const err = angleBetween(q, new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yawDeg * DEG, 0)));
      assert(err < 3 * DEG, `rotation error ${(err / DEG).toFixed(2)}°`);
      near(r.fit.distance.distanceM, 1.5, 0.045);
      near(r.fit.tracking.yawRad, yawDeg * DEG, 2 * DEG, 'yaw estimate');
    });
  }
}

suite('Arm articulation');
{
  const rig = makeRig('tshirt-crewneck');
  const base = { pos: new THREE.Vector3(0, 0, -1.5) };
  run(rig, base, 40);
  test('both arms raised: body-local arm directions recovered, sleeves rotate up', () => {
    const up = { ...base, armL: new THREE.Vector3(0.6, 0.8, 0), armR: new THREE.Vector3(-0.6, 0.8, 0) };
    const r = run(rig, up, 40);
    const l = new THREE.Vector3(...r.fit.armDirectionsBody.left);
    const rr = new THREE.Vector3(...r.fit.armDirectionsBody.right);
    assert(l.angleTo(new THREE.Vector3(0.6, 0.8, 0)) < 2 * DEG, `left ${l.toArray()}`);
    assert(rr.angleTo(new THREE.Vector3(-0.6, 0.8, 0)) < 2 * DEG, `right ${rr.toArray()}`);
    assert(rig.inst.sleeveRig.currentAxis('left').y > 0.6 && rig.inst.sleeveRig.currentAxis('right').y > 0.6);
  });
  test('arm directions are body-local: unchanged when the whole body is yawed 30°', () => {
    const up = { ...base, yaw: 30 * DEG, armL: new THREE.Vector3(0.6, 0.8, 0), armR: new THREE.Vector3(-0.6, 0.8, 0) };
    const r = run(rig, up, 40);
    const l = new THREE.Vector3(...r.fit.armDirectionsBody.left);
    assert(l.angleTo(new THREE.Vector3(0.6, 0.8, 0)) < 3 * DEG, `left ${l.toArray().map((v) => v.toFixed(3))}`);
  });
  test('one arm raised: only that sleeve rises', () => {
    const one = { ...base, armL: new THREE.Vector3(0.3, 0.95, 0.1) };
    const r = run(rig, one, 40);
    assert(rig.inst.sleeveRig.currentAxis('left').y > 0.5);
    assert(rig.inst.sleeveRig.currentAxis('right').y < 0, 'right sleeve still down');
    assert(r.fit.armDirectionsBody.right[1] < -0.9);
  });
  test('arm forward (toward camera) uses world-landmark depth, not image x/y mixed with z', () => {
    const fwd = { ...base, armL: new THREE.Vector3(0.1, -0.2, 1) };
    const r = run(rig, fwd, 40);
    const l = new THREE.Vector3(...r.fit.armDirectionsBody.left);
    assert(l.z > 0.9, `forward component ${l.z}`);
  });
  test('return to neutral', () => {
    const r = run(rig, base, 60);
    assert(r.fit.armDirectionsBody.left[1] < -0.95);
    assert(rig.inst.sleeveRig.currentAxis('left').y < -0.5);
  });
  test('limb joints project exactly onto their observed landmarks (occluders line up with the real arm)', () => {
    const bent = { ...base, armL: new THREE.Vector3(0.3, -1, 0.2), foreL: new THREE.Vector3(-0.6, 0.2, 0.8).normalize() };
    const r = run(rig, bent, 30, 1.0);
    const K = rig.engine.calibrationManager.getIntrinsics();
    const q = new THREE.Quaternion(...r.fit.bodyPose.quaternion);
    const t = new THREE.Vector3(...r.fit.bodyPose.position);
    for (const [name, idx] of [['left_elbow', 13], ['left_wrist', 15]]) {
      const P = new THREE.Vector3(...r.fit.limbJoints[name]).applyQuaternion(q).add(t);
      const uv = cameraToImage(P, K);
      const lm = r.frame.raw[idx];
      // Compare against the smoothed landmark the engine used (raw + 1 px noise, so allow a few px).
      const err = Math.hypot(uv.x - lm.x * W, uv.y - lm.y * H);
      assert(err < 4, `${name} projects ${err.toFixed(2)} px from its landmark`);
    }
  });
  test('low-visibility elbow ⇒ no arm direction (sleeve eases to rest)', () => {
    const r = run(rig, { ...base, visibility: { 13: 0.2 } }, 5);
    assert(r.fit.armDirectionsBody.left === null);
  });
}

suite('Long sleeves with a bent elbow');
test('rigid long sleeve aims along the shoulder→wrist chord; short sleeve along the upper arm', () => {
  const pose = { pos: new THREE.Vector3(0, 0, -1.5), armL: new THREE.Vector3(0.35, -1, 0.1), foreL: new THREE.Vector3(-0.2, 0.3, 1).normalize() };
  const S = SUBJECT;
  const upper = pose.armL.clone().normalize();
  const elbow = upper.clone().multiplyScalar(S.upper);
  const chord = elbow.clone().addScaledVector(pose.foreL, S.fore).normalize();
  const longRig = makeRig('top-longsleeve');
  run(longRig, pose, 80);
  const aLong = longRig.inst.sleeveRig.currentAxis('left');
  assert(aLong.angleTo(chord) < 4 * DEG, `long sleeve ${(aLong.angleTo(chord) / DEG).toFixed(1)}° from chord`);
  const shortRig = makeRig('tshirt-crewneck');
  run(shortRig, pose, 80);
  const s = shortRig.inst.sleeveRig.sleeves.find((x) => x.side === 'left');
  const expected = require('../dist_test/garment-rig.js').clampAbduction(upper.clone(), 'left', s.minAbductionRad);
  const aShort = shortRig.inst.sleeveRig.currentAxis('left');
  assert(aShort.angleTo(expected) < 4 * DEG, `short sleeve ${(aShort.angleTo(expected) / DEG).toFixed(1)}° from upper arm`);
});

suite('Garment placement for every asset (projected anchor alignment)');
for (const g of GARMENTS) {
  test(`${g.id}: anchor aligned in 3D and projects onto the landmarks`, () => {
    const rig = makeRig(g.id);
    const pose = { pos: new THREE.Vector3(-0.08, 0.02, -1.7), yaw: 10 * DEG, roll: 4 * DEG };
    const r = run(rig, pose, 45, 1.0);
    const d = rig.inst.diagnostics(rig.proxy, rig.bodyRoot, true);
    near(d.anchorAlignmentErrorM, 0, 1e-6, 'anchor alignment');
    const K = rig.engine.calibrationManager.getIntrinsics();
    const anchorCam = rig.inst.anchorGroup.localToWorld(rig.inst.anchor.anchor.clone());
    const uv = cameraToImage(anchorCam, K);
    const c = r.frame.cam;
    let target;
    if (g.modelAnchor.type === 'shoulder_center') target = c[11].clone().add(c[12]).multiplyScalar(0.5);
    else {
      // Waist anchor: body-local (0, waistY, 0) of the TRUE subject.
      const waistY = SUBJECT.L / 2 - 0.68 * SUBJECT.L;
      target = new THREE.Vector3(0, waistY, 0).applyQuaternion(r.frame.R).add(pose.pos);
    }
    const tuv = cameraToImage(target, K);
    const errPx = Math.hypot(uv.x - tuv.x, uv.y - tuv.y);
    assert(errPx < 4, `anchor projects ${errPx.toFixed(2)} px from the expected landmark point`);
  });
}

suite('Robustness');
test('insufficient / degenerate landmarks are rejected instead of producing a pose', () => {
  const rig = makeRig('tshirt-crewneck');
  const r = run(rig, { pos: new THREE.Vector3(0, 0, -1.5), visibility: { 11: 0.3, 12: 0.3 } }, 3);
  // The smoother rejects frames whose shoulders are invisible.
  assert(r.fit === null || r.fit.pnpResult.valid === false);
});
test('camera resolution change resets the distance reference', () => {
  const rig = makeRig('tshirt-crewneck');
  const r1 = run(rig, { pos: new THREE.Vector3(0, 0, -1.5) }, 40);
  assert(r1.fit.distance.mode === 'relative');
  const f = synthFrame(rig.engine.calibrationManager.getIntrinsics(), { pos: new THREE.Vector3(0, 0, -1.5) });
  const kp = rig.smoother.process(f.raw, (rig.t += 33), f.world);
  const r2 = rig.engine.processFrame(kp, rig.meta, 640, 480);
  assert(r2.distance.mode === 'uninitialized', r2.distance.mode);
});

suite('60-second session (1800 frames @ 30 fps, 1.5 px noise, motion)');
test('no NaN, no drift, stable garment geometry, bounded simulation', () => {
  const rig = makeRig('tshirt-crewneck');
  const sizes = [];
  let modes = new Set();
  for (let f = 0; f < 1800; f++) {
    const t = f / 30;
    const pose = {
      pos: new THREE.Vector3(0.1 * Math.sin(t * 0.5), 0.03 * Math.sin(t), -1.5 - 0.3 * Math.sin(t * 0.2)),
      yaw: 0.35 * Math.sin(t * 0.3),
      armL: new THREE.Vector3(0.3 + 0.3 * Math.sin(t), -0.9 + 0.8 * Math.max(0, Math.sin(t * 0.25)), 0),
    };
    const { fit } = step(rig, pose, 1.5);
    if (f > 40) modes.add(fit.distance.mode);
    for (const v of fit.bodyPose.position) assert(Number.isFinite(v), `NaN at frame ${f}`);
    if (f % 30 === 0) {
      const torso = rig.inst.meshes.find((m) => m.mesh.name === 'torso').mesh.geometry;
      torso.computeBoundingBox();
      sizes.push(torso.boundingBox.getSize(new THREE.Vector3()));
    }
  }
  const w = sizes.slice(2).map((s) => s.x);
  const spread = Math.max(...w) - Math.min(...w);
  assert(spread < 0.02, `torso width varies by ${(spread * 100).toFixed(1)} cm (ballooning?)`);
  const d = rig.inst.diagnostics(rig.proxy, rig.bodyRoot, true);
  assert(d.simulation.maxStrainPct < 5, `strain ${d.simulation.maxStrainPct}`);
  assert(!modes.has('uninitialized'), `modes ${[...modes]}`);
});

finish('test-ar-fitting-pipeline');
