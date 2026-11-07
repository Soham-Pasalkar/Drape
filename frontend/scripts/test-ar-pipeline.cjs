/** Unit tests for the extracted per-frame pipeline pieces (M1 T2–T4). */
const THREE = require('three');
const { suite, test, assert, near, finish } = require('./lib/harness.cjs');
const { PoseSmoother } = require('../dist_test/pipeline/pose-smoother.js');

suite('PoseSmoother');
const pose = () => ({ position: new THREE.Vector3(), quaternion: new THREE.Quaternion() });
test('snap copies the target exactly and reports a = 1', () => {
  const s = new PoseSmoother(0.05), cur = pose(), tgt = pose();
  tgt.position.set(1, 2, -3);
  tgt.quaternion.setFromEuler(new THREE.Euler(0.1, 0.5, -0.2));
  s.requestSnap();
  const r = s.step(cur, tgt, 1 / 60);
  assert(r.snapped && r.a === 1);
  assert(cur.position.equals(tgt.position) && cur.quaternion.equals(tgt.quaternion));
  assert(!s.snapPending, 'snap is consumed');
});
test('ease factor a = 1 − exp(−dt/τ) and position moves by exactly a', () => {
  const s = new PoseSmoother(0.05), cur = pose(), tgt = pose();
  tgt.position.set(1, 0, 0);
  const r = s.step(cur, tgt, 1 / 60);
  near(r.a, 1 - Math.exp(-(1 / 60) / 0.05), 1e-15);
  near(cur.position.x, r.a, 1e-15);
});
test('converges without overshoot over 1 s at 60 Hz', () => {
  const s = new PoseSmoother(0.05), cur = pose(), tgt = pose();
  tgt.position.set(0.5, 0, 0);
  let prev = 0;
  for (let i = 0; i < 60; i++) { s.step(cur, tgt, 1 / 60); assert(cur.position.x >= prev && cur.position.x <= 0.5); prev = cur.position.x; }
  near(cur.position.x, 0.5, 1e-6);
});

finish('test-ar-pipeline');
