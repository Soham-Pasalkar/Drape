/** Session schema v1 validator tests (FR-18). */
const { suite, test, assert, finish } = require('./lib/harness.cjs');
const { validateSession, SESSION_SCHEMA } = require('../dist_test/session/schema.js');

const lm = () => Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, v: 0.9 }));
function minimal() {
  return {
    header: {
      schema: SESSION_SCHEMA, createdAt: '2026-11-07T00:00:00Z', appCommit: 'abc', userAgent: 'UA', modelId: 'pose_landmarker_lite',
      poseOptions: { numPoses: 1 }, trackSettings: { width: 1280, height: 720, frameRate: 30, facingMode: null },
      mirror: { value: true, source: 'requested-assumed' }, garmentId: 'tshirt-crewneck',
      calibration: { fx: 1000, fy: 1000, cx: 640, cy: 360, width: 1280, height: 720, method: 'prior' },
      video: { objectFit: 'cover', objectPosition: '50% 50%' },
    },
    markers: [{ frameIndex: 0, position: 'centre' }],
    frames: [{
      t: 0, mediaTime: 0, video: { w: 1280, h: 720 }, container: { w: 800, h: 450 }, dpr: 2, displayMode: 'live', presentedMediaTime: null,
      render: { canvasClient: { w: 800, h: 450 }, canvasBuffer: { w: 1600, h: 900 }, drawingBuffer: { w: 1600, h: 900 }, rendererPixelRatio: 2, dpr: 2, wrapperTransform: 'matrix(-1, 0, 0, 1, 0, 0)' },
      raw: lm(), world: lm(),
      out: { pose: null, pnpKeypointsCam: null, smoothedRoot: { position: [0, 0, -1.5], quaternion: [0, 0, 0, 1] }, registration: null, distance: null, timings: { inferMs: 10, fitMs: 1, renderMs: 3 } },
    }],
    images: [],
  };
}

suite('Session schema v1');
test('a complete minimal session validates', () => {
  const e = validateSession(minimal());
  assert(e.length === 0, e.join('; '));
});
test('missing render geometry is rejected (G2 amendment 1)', () => {
  const s = minimal(); delete s.frames[0].render.drawingBuffer;
  assert(validateSession(s).some((m) => /render geometry/.test(m)));
});
test('missing video object-fit/position is rejected', () => {
  const s = minimal(); delete s.header.video;
  assert(validateSession(s).some((m) => /objectFit/.test(m)));
});
test('raw landmarks must be 33 finite points', () => {
  const s = minimal(); s.frames[0].raw = lm().slice(0, 32);
  assert(validateSession(s).some((m) => /raw/.test(m)));
  const t = minimal(); t.frames[0].raw[3].x = NaN;
  assert(validateSession(t).some((m) => /raw/.test(m)));
});
test('privacy: deviceId in trackSettings is flagged', () => {
  const s = minimal(); s.header.trackSettings.deviceId = 'abc';
  assert(validateSession(s).some((m) => /forbidden key "deviceId"/.test(m)));
});
test('unknown position marker and non-PNG image are rejected', () => {
  const s = minimal(); s.markers.push({ frameIndex: 0, position: 'sideways' }); s.images.push({ frameIndex: 0, png: 'data:image/jpeg;base64,xx' });
  const e = validateSession(s);
  assert(e.some((m) => /markers\[1\]/.test(m)) && e.some((m) => /images\[0\]/.test(m)), e.join('; '));
});
finish('test-ar-session');
