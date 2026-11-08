/**
 * Replay tests (FR-19).
 * 1. Protocol round-trip: a session is recorded in Node with the live loop's protocol (SessionRecorder +
 *    FrameStep + real ThreeSceneManager via the harness), including pose frames the render loop skips and
 *    several renders per pose frame; replay must reproduce every recorded number (|Δ| < 1e-6 px).
 * 2. Every session committed under docs/aidlc/sessions/{rig,baseline}/ must replay within 1 px (FR-19).
 */
const fs = require('fs');
const path = require('path');
const { suite, test, assert, near, finish } = require('./lib/harness.cjs');
const { createScene } = require('./lib/scene-harness.cjs');
const { makeFixture } = require('./lib/landmark-fixture.cjs');
const { replaySession, diffAgainstRecorded, positionReport, parseObjectPosition } = require('./lib/replay.cjs');
const { FrameStep, PIPELINE_VERSION } = require('../dist_test/pipeline/frame-step.js');
const { SessionRecorder, toSessionLandmarks } = require('../dist_test/session/recorder.js');
const { validateSession } = require('../dist_test/session/schema.js');
const { getGarmentById } = require('../dist_test/garment-registry.js');
const { computeVideoDisplayTransform } = require('../dist_test/coordinates.js');
const { computeRegistration } = require('../dist_test/debug/registration.js');

async function recordInNode(fixture) {
  const { w: W, h: H } = fixture.video, { w: Cw, h: Ch } = fixture.container;
  const meta = getGarmentById(fixture.garmentId);
  const scene = createScene(Cw, Ch);
  await scene.loadGarment(meta);
  scene.setRegistrationVisible(true);
  const step = new FrameStep(W, H);
  const d = computeVideoDisplayTransform(W, H, Cw, Ch, 'cover');
  const K0 = step.engine.calibrationManager.getIntrinsics();
  const rec = new SessionRecorder();
  rec.start({
    schema: 'drape-ar-session/1', createdAt: '2026-11-07T00:00:00Z', appCommit: null, pipelineVersion: PIPELINE_VERSION, userAgent: 'node-harness', modelId: 'synthetic',
    poseOptions: {}, trackSettings: null, mirror: { value: true, source: 'requested-assumed' }, garmentId: meta.id,
    calibration: { fx: K0.fx, fy: K0.fy, cx: K0.cx, cy: K0.cy, width: W, height: H, method: K0.calibrationMethod },
    video: { objectFit: 'cover', objectPosition: '50% 50%' },
  }, 0);
  // Render ticks alternate 16.7 / 50 ms so some ticks see two new pose frames (one skipped by the loop).
  const ticks = [];
  for (let t = 0, i = 0; t < fixture.frames[fixture.frames.length - 1].t + 60; i++) { ticks.push(t); t += i % 9 === 4 ? 50 : 1000 / 60; }
  let latest = null, processed = -1, id = 0, pi = 0;
  for (const rt of ticks) {
    while (pi < fixture.frames.length && fixture.frames[pi].t <= rt) {
      const fr = fixture.frames[pi++];
      const kp = step.smooth(fr.raw, fr.t, fr.world);
      latest = { kp, fr, id: id++ };
      rec.notePoseFrame(fr.t, fr.raw, fr.world);
    }
    step.engine.calibrationManager.updateResolution(W, H);
    scene.setProjection(step.engine.calibrationManager.getIntrinsics(), d);
    let consumed = false, fit = null;
    if (latest && latest.id !== processed) {
      processed = latest.id; consumed = true;
      if (latest.kp) { fit = step.fit(latest.kp, meta, W, H); scene.setFrameTarget(fit, rt); } else scene.setFrameTarget(null, rt);
    }
    scene.render(rt);
    if (consumed) {
      const kp = latest.kp, K = step.engine.calibrationManager.getIntrinsics();
      const reg = computeRegistration({ display: d, mirrored: true, raw: latest.fr.raw,
        smoothed: { left_shoulder: kp?.leftShoulder, right_shoulder: kp?.rightShoulder, left_hip: kp?.leftHip, right_hip: kp?.rightHip },
        projected: scene.registrationPixels(d) });
      rec.consume({
        t: latest.fr.t, mediaTime: null, video: { w: W, h: H }, container: { w: Cw, h: Ch }, dpr: 1, displayMode: 'live', presentedMediaTime: null,
        render: { canvasClient: { w: Cw, h: Ch }, canvasBuffer: { w: Cw, h: Ch }, drawingBuffer: { w: Cw, h: Ch }, rendererPixelRatio: 1, dpr: 1, wrapperTransform: 'matrix(-1, 0, 0, 1, 0, 0)' },
        raw: toSessionLandmarks(latest.fr.raw), world: toSessionLandmarks(latest.fr.world), garmentId: meta.id, k: [K.fx, K.fy, K.cx, K.cy],
        out: {
          pose: fit ? { position: fit.bodyPose.position, quaternion: fit.bodyPose.quaternion, valid: fit.pnpResult.valid, reason: fit.pnpResult.reason ?? null, reprojPx: fit.pnpResult.reprojectionError, usedPoints: fit.pnpResult.usedPoints } : null,
          pnpKeypointsCam: fit ? fit.pnpKeypointsCamera : null,
          smoothedRoot: { position: scene.bodyRoot.position.toArray(), quaternion: scene.bodyRoot.quaternion.toArray() },
          registration: reg, distance: fit ? { z: fit.distance.distanceM, mode: fit.distance.mode } : null, timings: { inferMs: 0, fitMs: 0, renderMs: 0 },
        },
      }, latest.fr.t);
      if (fixture.frames[pi - 1] && fixture.frames.indexOf(latest.fr) % 24 === 9) rec.mark(latest.fr.segment);
    }
    rec.noteRender(rt);
  }
  scene.dispose();
  return rec.stop();
}

(async () => {
  suite('Replay protocol round-trip (Node-recorded session)');
  const session = await recordInNode(makeFixture());
  test('recorded session validates', () => { const e = validateSession(session); assert(e.length === 0, e.join('; ')); });
  test('session exercises skipped pose frames and multi-render frames', () => {
    assert(session.frames.some((f) => f.smoothedOnly.length > 0), 'no skipped pose frames');
    assert(session.frames.some((f) => f.renderTimes.length > 1), 'no multi-render frames');
  });
  const replayed = await replaySession(session);
  const diff = diffAgainstRecorded(session, replayed);
  test('replay reproduces recorded registration, pose and smoothed root (|Δ| < 1e-6)', () => {
    console.log(`      max |Δ| px ${diff.maxPx.toExponential(2)}, pose ${diff.maxPoseM.toExponential(2)} m, root ${diff.maxRootM.toExponential(2)} m`);
    assert(diff.maxPx < 1e-6 && diff.maxPoseM < 1e-6 && diff.maxRootM < 1e-6, JSON.stringify(diff));
  });
  test('position report lists labelled positions', () => {
    const rows = positionReport(session, replayed);
    assert(rows.some((r) => r.position === 'hips_out') && rows.some((r) => r.position === 'far_right'), rows.map((r) => r.position).join());
  });
  test('object-position parsing', () => {
    const p = parseObjectPosition('50% 50%'); near(p.x, 0.5, 0); near(p.y, 0.5, 0);
    const q = parseObjectPosition('left top'); near(q.x, 0, 0); near(q.y, 0, 0);
  });

  suite('Committed sessions replay within 1 px when recorded with the current pipeline version (FR-19)');
  const roots = ['rig', 'baseline'].flatMap((d) => [
    path.join(__dirname, '..', '..', 'docs', 'archive', 'aidlc', 'sessions', d),
    path.join(__dirname, '..', '..', 'docs', 'aidlc', 'sessions', d),
  ]);
  const files = roots.flatMap((r) => (fs.existsSync(r) ? fs.readdirSync(r).filter((f) => f.endsWith('.json')).map((f) => path.join(r, f)) : []));
  if (!files.length) console.log('      (no committed sessions yet)');
  for (const f of files) {
    const s = JSON.parse(fs.readFileSync(f, 'utf8'));
    const r = await replaySession(s);
    const dd = diffAgainstRecorded(s, r);
    const v = s.header.pipelineVersion ?? 1;
    if (v === PIPELINE_VERSION) {
      test(`${path.basename(f)}: replay within 1 px (max ${dd.maxPx.toFixed(4)} px)`, () => assert(dd.maxPx <= 1, `${dd.maxPx} at ${dd.worstAt}`));
    } else {
      // Recorded with an older pipeline: replay still runs end-to-end (input compatibility) but the numbers are
      // expected to differ by design; reported, not asserted.
      test(`${path.basename(f)} (pipeline v${v} ≠ v${PIPELINE_VERSION}): replays end-to-end; Δ vs recorded ${dd.maxPx.toFixed(1)} px (informational)`, () => assert(r.length === s.frames.length));
    }
  }
  finish('test-ar-replay');
})();
