/**
 * Coordinate contract tests: object-fit display transforms, inverses, NDC, pinhole camera,
 * projection-matrix consistency through crop / letterbox, mirroring policy, DPR independence.
 */
const THREE = require('three');
const { suite, test, assert, near, finish } = require('./lib/harness.cjs');
const C = require('../dist_test/coordinates.js');
const { CameraCalibrationManager } = require('../dist_test/camera-calibration.js');

const TOL_PX = 1e-6;
const CASES = [
  { name: '16:9 video in 16:9 container', W: 1280, H: 720, Cw: 960, Ch: 540 },
  { name: '4:3 video in 16:9 container', W: 640, H: 480, Cw: 1280, Ch: 720 },
  { name: '16:9 video in 4:3 container', W: 1920, H: 1080, Cw: 800, Ch: 600 },
  { name: 'portrait 9:16 video in 16:9 container', W: 720, H: 1280, Cw: 1280, Ch: 720 },
  { name: 'portrait video in portrait container', W: 1080, H: 1920, Cw: 390, Ch: 844 },
];

suite('Video display transform (object-fit)');
for (const c of CASES) {
  for (const fit of ['cover', 'contain', 'fill']) {
    test(`${c.name} — ${fit}: geometry and inverse`, () => {
      const t = C.computeVideoDisplayTransform(c.W, c.H, c.Cw, c.Ch, fit);
      if (fit === 'cover') {
        const s = Math.max(c.Cw / c.W, c.Ch / c.H);
        near(t.scaleX, s, 1e-12);
        near(t.offsetX, -(c.W * s - c.Cw) / 2, 1e-9, 'cropX');
        near(t.offsetY, -(c.H * s - c.Ch) / 2, 1e-9, 'cropY');
        assert(t.offsetX <= 1e-9 && t.offsetY <= 1e-9, 'cover never letterboxes');
      } else if (fit === 'contain') {
        const s = Math.min(c.Cw / c.W, c.Ch / c.H);
        near(t.scaleX, s, 1e-12);
        near(t.offsetX, (c.Cw - c.W * s) / 2, 1e-9, 'offsetX');
        near(t.offsetY, (c.Ch - c.H * s) / 2, 1e-9, 'offsetY');
        assert(t.offsetX >= -1e-9 && t.offsetY >= -1e-9, 'contain never crops');
      } else {
        near(t.scaleX, c.Cw / c.W, 1e-12);
        near(t.scaleY, c.Ch / c.H, 1e-12);
      }
      for (let i = 0; i < 50; i++) {
        const p = { x: Math.random() * c.W, y: Math.random() * c.H };
        const back = C.displayToImage(C.imageToDisplay(p, t), t);
        near(back.x, p.x, TOL_PX, 'u round-trip');
        near(back.y, p.y, TOL_PX, 'v round-trip');
        const back2 = C.ndcToImage(C.imageToNDC(p, t), t);
        near(back2.x, p.x, TOL_PX, 'NDC u round-trip');
        near(back2.y, p.y, TOL_PX, 'NDC v round-trip');
      }
    });
  }
}

test('cover: image centre maps to container centre; visible rect is centred crop', () => {
  const t = C.computeVideoDisplayTransform(1280, 720, 600, 600, 'cover');
  const d = C.imageToDisplay({ x: 640, y: 360 }, t);
  near(d.x, 300, 1e-9);
  near(d.y, 300, 1e-9);
  near(t.visibleImageRect.u0, 280, 1e-9, 'u0');
  near(t.visibleImageRect.u1, 1000, 1e-9, 'u1');
  near(t.visibleImageRect.v0, 0, 1e-9);
});

test('object-position (0, 0) aligns the image top-left with the container', () => {
  const t = C.computeVideoDisplayTransform(1280, 720, 600, 600, 'cover', { x: 0, y: 0 });
  const d = C.imageToDisplay({ x: 0, y: 0 }, t);
  near(d.x, 0, 1e-9);
  near(d.y, 0, 1e-9);
});

test('normalized ↔ image pixels', () => {
  const p = C.normalizedToImage({ x: 0.25, y: 0.75 }, 1280, 720);
  near(p.x, 320, 1e-12);
  near(p.y, 540, 1e-12);
  const n = C.imageToNormalized(p, 1280, 720);
  near(n.x, 0.25, 1e-12);
  near(n.y, 0.75, 1e-12);
});

test('normalizedPixelDistance honours non-square frames', () => {
  // 0.1 normalized in x and in y are 128 px and 72 px on 1280×720.
  near(C.normalizedPixelDistance({ x: 0, y: 0 }, { x: 0.1, y: 0 }, 1280, 720), 128, 1e-9);
  near(C.normalizedPixelDistance({ x: 0, y: 0 }, { x: 0, y: 0.1 }, 1280, 720), 72, 1e-9);
});

suite('Pinhole camera');
const K = { fx: 1005.3, fy: 1001.7, cx: 652.1, cy: 351.4 };
test('imageToCamera / cameraToImage are inverse at any depth', () => {
  for (let i = 0; i < 100; i++) {
    const p = { x: Math.random() * 1280, y: Math.random() * 720 };
    const d = 0.3 + Math.random() * 4;
    const P = C.imageToCamera(p, d, K);
    near(P.z, -d, 1e-12, 'Z = -depth');
    const q = C.cameraToImage(P, K);
    near(q.x, p.x, 1e-9);
    near(q.y, p.y, 1e-9);
  }
});
test('camera +Y projects upward (smaller v), +X projects right (larger u)', () => {
  const up = C.cameraToImage({ x: 0, y: 0.1, z: -1 }, K);
  const right = C.cameraToImage({ x: 0.1, y: 0, z: -1 }, K);
  assert(up.y < K.cy, 'up ⇒ v < cy');
  assert(right.x > K.cx, 'right ⇒ u > cx');
});
test('points behind the camera are rejected, not clamped', () => {
  assert(C.cameraToImage({ x: 0, y: 0, z: 0.5 }, K) === null);
});

suite('Projection matrix ≡ displayed video');
for (const c of CASES) {
  for (const fit of ['cover', 'contain']) {
    test(`${c.name} — ${fit}`, () => {
      const calib = new CameraCalibrationManager(c.W, c.H);
      calib.setIntrinsics({ cx: c.W / 2 + 23.5, cy: c.H / 2 - 17.25 }); // off-centre principal point
      const k = calib.getIntrinsics();
      const t = C.computeVideoDisplayTransform(c.W, c.H, c.Cw, c.Ch, fit);
      const P = C.buildProjectionMatrix(k, t, 0.05, 20);
      for (let i = 0; i < 40; i++) {
        const X = new THREE.Vector3((Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 1.2, -(0.4 + Math.random() * 4));
        const ndc = X.clone().applyMatrix4(P); // includes perspective divide
        const viaMatrix = C.ndcToDisplay({ x: ndc.x, y: ndc.y }, t);
        const viaVideo = C.imageToDisplay(C.cameraToImage(X, k), t);
        near(viaMatrix.x, viaVideo.x, 1e-6, 'display x');
        near(viaMatrix.y, viaVideo.y, 1e-6, 'display y');
        assert(ndc.z > -1 && ndc.z < 1, 'depth inside clip range');
      }
    });
  }
}

test('calibration manager projection uses the same contract', () => {
  const calib = new CameraCalibrationManager(1280, 720);
  const t = C.computeVideoDisplayTransform(1280, 720, 700, 700, 'cover');
  const a = calib.buildThreeProjectionMatrix(0.05, 20, t).elements;
  const b = C.buildProjectionMatrix(calib.getIntrinsics(), t, 0.05, 20).elements;
  for (let i = 0; i < 16; i++) near(a[i], b[i], 1e-12);
});

suite('Mirroring policy (single CSS reflection of the whole layer stack)');
test('projection matrix is never mirrored (P00 > 0, P11 > 0)', () => {
  const calib = new CameraCalibrationManager(1280, 720);
  const e = calib.buildThreeProjectionMatrix().elements;
  assert(e[0] > 0 && e[5] > 0, `P00=${e[0]} P11=${e[5]}`);
  assert(e[11] === -1, 'perspective row');
});
test('mirroring video, canvas and overlay together keeps a 3D point on its landmark', () => {
  const c = CASES[1];
  const calib = new CameraCalibrationManager(c.W, c.H);
  const k = calib.getIntrinsics();
  const t = C.computeVideoDisplayTransform(c.W, c.H, c.Cw, c.Ch, 'cover');
  const P = C.buildProjectionMatrix(k, t);
  const mirror = (d) => ({ x: t.containerWidth - d.x, y: d.y }); // CSS scaleX(-1) about centre
  for (let i = 0; i < 20; i++) {
    const X = new THREE.Vector3((Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 0.8, -1.5);
    const landmarkImg = C.cameraToImage(X, k); // where MediaPipe would report it
    const overlay = mirror(C.imageToDisplay(landmarkImg, t)); // 2D overlay inside mirrored wrapper
    const ndc = X.clone().applyMatrix4(P);
    const webgl = mirror(C.ndcToDisplay(ndc, t)); // WebGL canvas inside the same wrapper
    near(overlay.x, webgl.x, 1e-6);
    near(overlay.y, webgl.y, 1e-6);
  }
});
test('wearer-left appears on the screen-left in the mirrored preview (like a mirror)', () => {
  // Facing the camera, the wearer's left is camera +X. In the mirrored preview that should
  // appear on the left of the screen, like a mirror.
  const t = C.computeVideoDisplayTransform(1280, 720, 1280, 720, 'cover');
  const k = new CameraCalibrationManager(1280, 720).getIntrinsics();
  const centre = C.imageToDisplay(C.cameraToImage({ x: 0, y: 0, z: -1.5 }, k), t);
  const left = C.imageToDisplay(C.cameraToImage({ x: 0.2, y: 0, z: -1.5 }, k), t);
  const mirrored = (d) => t.containerWidth - d.x;
  assert(left.x > centre.x, 'unmirrored: wearer-left is image-right');
  assert(mirrored(left) < mirrored(centre), 'mirrored: wearer-left is screen-left');
});

suite('Device pixel ratio');
test('rasterised buffer pixel / DPR lands on the CSS display position (DPR 1, 1.5, 2, 3)', () => {
  const k = new CameraCalibrationManager(1280, 720).getIntrinsics();
  const css = C.computeVideoDisplayTransform(1280, 720, 640, 480, 'cover');
  const P = C.buildProjectionMatrix(k, css);
  const X = new THREE.Vector3(0.12, 0.08, -1.4);
  const expected = C.imageToDisplay(C.cameraToImage(X, k), css);
  for (const dpr of [1, 1.5, 2, 3]) {
    // WebGL viewport = CSS size × DPR; the canvas is then scaled back by 1/DPR in CSS.
    const ndc = X.clone().applyMatrix4(P);
    const bufX = ((ndc.x + 1) / 2) * css.containerWidth * dpr;
    const bufY = ((1 - ndc.y) / 2) * css.containerHeight * dpr;
    near(bufX / dpr, expected.x, 1e-6, `dpr ${dpr} x`);
    near(bufY / dpr, expected.y, 1e-6, `dpr ${dpr} y`);
  }
});
test('resizing the container updates the mapping consistently', () => {
  const k = new CameraCalibrationManager(1280, 720).getIntrinsics();
  const X = new THREE.Vector3(0.1, -0.05, -1.2);
  for (const [Cw, Ch] of [[1280, 720], [700, 700], [390, 844], [2000, 600]]) {
    const t = C.computeVideoDisplayTransform(1280, 720, Cw, Ch, 'cover');
    const ndc = X.clone().applyMatrix4(C.buildProjectionMatrix(k, t));
    const d = C.ndcToDisplay(ndc, t);
    const expected = C.imageToDisplay(C.cameraToImage(X, k), t);
    near(d.x, expected.x, 1e-6);
    near(d.y, expected.y, 1e-6);
  }
});

suite('World landmark axes');
test('MediaPipe world (x right, y down, z away) → camera (x right, y up, z toward viewer)', () => {
  const v = C.worldLandmarkToCameraAxes({ x: 0.1, y: 0.2, z: 0.3 });
  near(v.x, 0.1, 0);
  near(v.y, -0.2, 0);
  near(v.z, -0.3, 0);
});

finish('test-ar-coordinates');
