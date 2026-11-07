/**
 * GOLDEN GENERATOR — run ONLY at tag `m1-pre-refactor` (G3 amendment 1).
 * Drives the PRE-refactor code exactly like the live loop in VirtualTryOnExperience.tsx@m1-pre-refactor
 * (per rAF: setProjection → on a new pose frame smoother.process → engine.processFrame → scene.setFrameTarget →
 * scene.render), two renders per pose frame (60 Hz render, 30 Hz pose).
 * The registration block below is a verbatim JS transliteration of the component's `registration: (() => {…})()`
 * closure (VirtualTryOnExperience.tsx lines 300–330 at that tag), because it is not importable.
 * Usage: node scripts/golden-pre-refactor.cjs  (after `npx tsc -p scripts/tsconfig.ar-test.json`)
 */
const fs = require('fs');
const path = require('path');
const { createScene } = require('./lib/scene-harness.cjs');
const { makeFixture } = require('./lib/landmark-fixture.cjs');
const { FittingEngine } = require('../dist_test/fitting-engine.js');
const { LandmarkSmoother } = require('../dist_test/landmark-smoother.js');
const { getGarmentById } = require('../dist_test/garment-registry.js');
const { computeVideoDisplayTransform, imageToDisplay } = require('../dist_test/coordinates.js');

async function run(fixture) {
  const { w: W, h: H } = fixture.video;
  const { w: Cw, h: Ch } = fixture.container;
  const meta = getGarmentById(fixture.garmentId);
  const scene = createScene(Cw, Ch);
  await scene.loadGarment(meta);
  scene.setRegistrationVisible(true);
  const engine = new FittingEngine(W, H);
  const smoother = new LandmarkSmoother();
  const d = computeVideoDisplayTransform(W, H, Cw, Ch, 'cover');
  const out = [];
  for (const fr of fixture.frames) {
    const now = fr.t;
    engine.calibrationManager.updateResolution(W, H);
    scene.setProjection(engine.calibrationManager.getIntrinsics(), d);
    const kp = smoother.process(fr.raw, now, fr.world);
    let fit = null;
    if (kp) {
      fit = engine.processFrame(kp, meta, W, H);
      scene.setFrameTarget(fit, now);
    } else {
      scene.setFrameTarget(null, now);
    }
    scene.render(now);
    scene.render(now + 1000 / 60);

    // ---- verbatim registration closure (pre-refactor component) ----
    const registration = (() => {
      if (!d) return null;
      const reg = scene.registrationPixels(d);
      const raw = fr.raw;
      const mirrored = fixture.mirrored;
      const toScreen = (p) => ({ x: mirrored ? d.containerWidth - p.x : p.x, y: p.y });
      const lmDisp = (pt) => toScreen(imageToDisplay({ x: pt.x * d.videoWidth, y: pt.y * d.videoHeight }, d));
      const smoothedOf = { left_shoulder: kp?.leftShoulder, right_shoulder: kp?.rightShoulder, left_hip: kp?.leftHip, right_hip: kp?.rightHip };
      const idx = { left_shoulder: 11, right_shoulder: 12, left_hip: 23, right_hip: 24 };
      const errors = {};
      for (const [name, i] of Object.entries(idx)) {
        const r = raw[i];
        const mg = reg.keypoints[name];
        const sm = smoothedOf[name];
        if (!r || (r.visibility ?? 0) < 0.5 || !mg || !sm) { errors[name] = null; continue; }
        const m2 = toScreen(mg), a = lmDisp(r), b = lmDisp(sm);
        errors[name] = { raw: Math.hypot(m2.x - a.x, m2.y - a.y), smoothed: Math.hypot(m2.x - b.x, m2.y - b.y) };
      }
      let anchorDx = null, anchorDy = null, mid = null;
      if (raw[11] && raw[12] && reg.garmentAnchor) {
        const a = lmDisp(raw[11]), b = lmDisp(raw[12]);
        mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        const g = toScreen(reg.garmentAnchor);
        anchorDx = g.x - mid.x;
        anchorDy = g.y - mid.y;
      }
      return { errors, anchorDx, anchorDy, midShoulderScreen: mid };
    })();
    // ---- end verbatim ----

    const inst = scene.activeGarment;
    const anchorWorld = inst.anchorGroup.localToWorld(inst.anchor.anchor.clone());
    out.push({
      segment: fr.segment,
      pose: fit ? { position: fit.bodyPose.position, quaternion: fit.bodyPose.quaternion, valid: fit.pnpResult.valid } : null,
      pnpKeypointsCamera: fit ? fit.pnpKeypointsCamera : null,
      smoothedRoot: { position: scene.bodyRoot.position.toArray(), quaternion: scene.bodyRoot.quaternion.toArray() },
      anchorWorld: anchorWorld.toArray(),
      registration,
    });
  }
  scene.dispose();
  return out;
}

module.exports = { run };
if (require.main === module) {
  run(makeFixture()).then((frames) => {
    const file = path.join(__dirname, 'fixtures', 'golden-pre-refactor.json');
    fs.writeFileSync(file, JSON.stringify({ generatedAt: 'm1-pre-refactor', frames }, null, 0));
    console.log('wrote', file, frames.length, 'frames');
  });
}
