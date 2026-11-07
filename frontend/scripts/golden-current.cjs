/**
 * Driver for the CURRENT (refactored) pipeline, compared by test-ar-golden.cjs against the pre-refactor golden.
 * Same loop shape as the live app: FrameStep (T4) for smoothing + fitting, PoseSmoother inside the scene (T2),
 * registration via debug/registration.ts (T3).
 */
const { createScene } = require('./lib/scene-harness.cjs');
const { FrameStep } = require('../dist_test/pipeline/frame-step.js');
const { getGarmentById } = require('../dist_test/garment-registry.js');
const { computeVideoDisplayTransform } = require('../dist_test/coordinates.js');
const { computeRegistration } = require('../dist_test/debug/registration.js');

async function run(fixture) {
  const { w: W, h: H } = fixture.video;
  const { w: Cw, h: Ch } = fixture.container;
  const meta = getGarmentById(fixture.garmentId);
  const scene = createScene(Cw, Ch);
  await scene.loadGarment(meta);
  scene.setRegistrationVisible(true);
  const step = new FrameStep(W, H);
  const engine = step.engine;
  const d = computeVideoDisplayTransform(W, H, Cw, Ch, 'cover');
  const out = [];
  for (const fr of fixture.frames) {
    const now = fr.t;
    engine.calibrationManager.updateResolution(W, H);
    scene.setProjection(engine.calibrationManager.getIntrinsics(), d);
    const kp = step.smooth(fr.raw, now, fr.world);
    let fit = null;
    if (kp) {
      fit = step.fit(kp, meta, W, H);
      scene.setFrameTarget(fit, now);
    } else {
      scene.setFrameTarget(null, now);
    }
    scene.render(now);
    scene.render(now + 1000 / 60);
    const registration = computeRegistration({
      display: d,
      mirrored: fixture.mirrored,
      raw: fr.raw,
      smoothed: { left_shoulder: kp?.leftShoulder, right_shoulder: kp?.rightShoulder, left_hip: kp?.leftHip, right_hip: kp?.rightHip },
      projected: scene.registrationPixels(d),
    });
    const inst = scene.activeGarment;
    out.push({
      segment: fr.segment,
      pose: fit ? { position: fit.bodyPose.position, quaternion: fit.bodyPose.quaternion, valid: fit.pnpResult.valid } : null,
      pnpKeypointsCamera: fit ? fit.pnpKeypointsCamera : null,
      smoothedRoot: { position: scene.bodyRoot.position.toArray(), quaternion: scene.bodyRoot.quaternion.toArray() },
      anchorWorld: inst.anchorGroup.localToWorld(inst.anchor.anchor.clone()).toArray(),
      registration,
    });
  }
  scene.dispose();
  return out;
}

module.exports = { run };
