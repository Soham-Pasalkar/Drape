/**
 * Motion assertions on a SYNTHETIC moving subject through the real pipeline (FrameStep + real scene via the
 * Node harness), user request 2026-11-07:
 *  - shoulder span halves (1.0 m → 2.0 m)  ⇒  Z ≈ ×2 and the garment's projected width ≈ ×0.5
 *  - subject moves 300 px LEFT on the mirrored screen  ⇒  garment anchor moves left with them
 *  - the distance estimator leaves "uninitialized" while the subject holds still
 * Numbers are measured at the end of each 1.5 s hold. Synthetic input: NOT a substitute for live sessions.
 */
const { suite, test, assert, finish } = require('./lib/harness.cjs');
const { createScene } = require('./lib/scene-harness.cjs');
const { makeFixture, K, W, H } = require('./lib/landmark-fixture.cjs');
const { FrameStep } = require('../dist_test/pipeline/frame-step.js');
const { getGarmentById } = require('../dist_test/garment-registry.js');
const { computeVideoDisplayTransform, imageToDisplay } = require('../dist_test/coordinates.js');
const { buildFrameDiag } = require('../dist_test/debug/frame-diag.js');

const Cw = 960, Ch = 600;
const d = computeVideoDisplayTransform(W, H, Cw, Ch, 'cover');
// 300 screen px left on the mirrored screen = +300 container px = +300/s image px = camera +X at depth 1.6 m.
const dxCam = ((300 / d.scaleX) * 1.6) / K.fx;
const SEGMENTS = [
  ['near_1.0m', [0, -0.05, -1.0], 0],
  ['far_2.0m', [0, -0.05, -2.0], 0],
  ['mid_1.6m', [0, -0.05, -1.6], 0],
  ['left_300px', [dxCam, -0.05, -1.6], 0],
];

async function run() {
  const fixture = makeFixture({ segments: SEGMENTS, framesPerSegment: 45, moveFrames: 15 });
  const meta = getGarmentById('tshirt-crewneck');
  const scene = createScene(Cw, Ch);
  await scene.loadGarment(meta);
  scene.setRegistrationVisible(true);
  const step = new FrameStep(W, H);
  const at = {};
  for (let i = 0; i < fixture.frames.length; i++) {
    const fr = fixture.frames[i];
    step.engine.calibrationManager.updateResolution(W, H);
    scene.setProjection(step.engine.calibrationManager.getIntrinsics(), d);
    const kp = step.smooth(fr.raw, fr.t, fr.world);
    const fit = kp ? step.fit(kp, meta, W, H) : null;
    scene.setFrameTarget(fit, fr.t);
    scene.render(fr.t);
    scene.render(fr.t + 1000 / 60);
    const next = fixture.frames[i + 1];
    if (!next || next.segment !== fr.segment) {
      const diag = buildFrameDiag(fit, scene, d, fr.t);
      const torso = diag.garment.meshes.find((m) => m.name === 'torso');
      const screenX = (p) => Cw - p.x; // single CSS mirror
      const ls = imageToDisplay({ x: fr.raw[11].x * W, y: fr.raw[11].y * H }, d), rs = imageToDisplay({ x: fr.raw[12].x * W, y: fr.raw[12].y * H }, d);
      const reg = scene.registrationPixels(d);
      at[fr.segment] = {
        spanPx: Math.hypot((fr.raw[11].x - fr.raw[12].x) * W, (fr.raw[11].y - fr.raw[12].y) * H),
        z: fit.distance.distanceM,
        mode: fit.distance.mode,
        reason: fit.distance.reason,
        torsoWidthPx: torso.screen.w,
        anchorScreenX: screenX(reg.garmentAnchor),
        midShoulderScreenX: screenX({ x: (ls.x + rs.x) / 2 }),
      };
    }
  }
  scene.dispose();
  return at;
}

(async () => {
  const r = await run();
  suite('Synthetic moving subject (real pipeline)');
  for (const [k, v] of Object.entries(r)) {
    console.log(`      ${k.padEnd(11)} span ${v.spanPx.toFixed(1)} px | Z ${v.z.toFixed(3)} m (${v.mode}${v.reason ? ': ' + v.reason : ''}) | torso width ${v.torsoWidthPx.toFixed(1)} px | anchor x ${v.anchorScreenX.toFixed(1)} | mid-shoulder x ${v.midShoulderScreenX.toFixed(1)}`);
  }
  const a = r['near_1.0m'], b = r['far_2.0m'], m = r['mid_1.6m'], l = r['left_300px'];
  test('distance estimator leaves "uninitialized" while the subject holds still', () => assert(a.mode !== 'uninitialized' || b.mode !== 'uninitialized', `${a.mode}/${b.mode}`));
  test(`span halves (ratio ${(b.spanPx / a.spanPx).toFixed(3)}) ⇒ Z ratio in [1.8, 2.2]`, () => {
    const zr = b.z / a.z;
    assert(zr >= 1.8 && zr <= 2.2, `Z ratio ${zr.toFixed(3)} (${a.z.toFixed(3)} → ${b.z.toFixed(3)} m)`);
  });
  test('garment projected width ratio in [0.45, 0.55]', () => {
    const wr = b.torsoWidthPx / a.torsoWidthPx;
    assert(wr >= 0.45 && wr <= 0.55, `width ratio ${wr.toFixed(3)} (${a.torsoWidthPx.toFixed(1)} → ${b.torsoWidthPx.toFixed(1)} px)`);
  });
  test('subject moves ~300 px left on screen ⇒ anchor moves left by the same amount (±10 %)', () => {
    const subj = l.midShoulderScreenX - m.midShoulderScreenX, anc = l.anchorScreenX - m.anchorScreenX;
    assert(subj < -250, `subject moved ${subj.toFixed(1)} px`);
    assert(Math.abs(anc - subj) <= 0.1 * Math.abs(subj), `anchor moved ${anc.toFixed(1)} px vs subject ${subj.toFixed(1)} px`);
  });
  finish('test-ar-motion');
})();
