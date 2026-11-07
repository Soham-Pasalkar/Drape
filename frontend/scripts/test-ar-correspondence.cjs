/**
 * Correspondence + deformation tests (RC5, RC6).
 */
const fs = require('fs');
const path = require('path');
const THREE = require('three');
const { suite, test, assert, near, finish } = require('./lib/harness.cjs');
const {
  closestPointOnTriangle,
  TriangleBVH,
  buildCorrespondence,
  RestPoseDeformer,
  transformPositions,
  fieldToVertexCorrespondences,
  deformAgainstBody,
} = require('../dist_test/garment-correspondence.js');
const { MHRBodyProxy, defaultBodyShape } = require('../dist_test/mhr-body-proxy.js');
const { GarmentInstance } = require('../dist_test/garment-instance.js');
const { getGarmentById } = require('../dist_test/garment-registry.js');
const { loadGLB } = require('./lib/glb-node-loader.cjs');

const V = (x, y, z) => new THREE.Vector3(x, y, z);

/** Brute-force closest point by dense barycentric sampling (reference). */
function bruteClosest(p, a, b, c, n = 300) {
  let best = Infinity;
  const q = new THREE.Vector3();
  for (let i = 0; i <= n; i++) for (let j = 0; j <= n - i; j++) {
    const u = i / n, v = j / n, w = 1 - u - v;
    q.set(a.x * w + b.x * u + c.x * v, a.y * w + b.y * u + c.y * v, a.z * w + b.z * u + c.z * v);
    best = Math.min(best, q.distanceTo(p));
  }
  return best;
}

suite('Closest point on triangle');
const A = V(0, 0, 0), B = V(1, 0, 0), Cc = V(0, 1, 0);
test('interior projection', () => {
  const r = closestPointOnTriangle(V(0.2, 0.3, 0.5), A, B, Cc);
  near(r.point.distanceTo(V(0.2, 0.3, 0)), 0, 1e-12);
  near(r.bary[0], 0.5, 1e-12); near(r.bary[1], 0.2, 1e-12); near(r.bary[2], 0.3, 1e-12);
});
test('vertex regions', () => {
  near(closestPointOnTriangle(V(-1, -1, 0.3), A, B, Cc).point.distanceTo(A), 0, 1e-12);
  near(closestPointOnTriangle(V(2, -0.5, 0), A, B, Cc).point.distanceTo(B), 0, 1e-12);
  near(closestPointOnTriangle(V(-0.2, 3, 0), A, B, Cc).point.distanceTo(Cc), 0, 1e-12);
});
test('edge regions', () => {
  near(closestPointOnTriangle(V(0.5, -1, 0), A, B, Cc).point.distanceTo(V(0.5, 0, 0)), 0, 1e-12);
  near(closestPointOnTriangle(V(-1, 0.5, 0), A, B, Cc).point.distanceTo(V(0, 0.5, 0)), 0, 1e-12);
  near(closestPointOnTriangle(V(1, 1, 0), A, B, Cc).point.distanceTo(V(0.5, 0.5, 0)), 0, 1e-12);
});
test('random points: matches dense brute force and barycentrics are valid', () => {
  for (let k = 0; k < 40; k++) {
    const a = V(Math.random(), Math.random(), Math.random());
    const b = V(Math.random(), Math.random(), Math.random());
    const c = V(Math.random(), Math.random(), Math.random());
    const p = V(Math.random() * 2 - 0.5, Math.random() * 2 - 0.5, Math.random() * 2 - 0.5);
    const r = closestPointOnTriangle(p, a, b, c);
    const [u, v, w] = r.bary;
    near(u + v + w, 1, 1e-9, 'Σb = 1');
    assert(u >= -1e-12 && v >= -1e-12 && w >= -1e-12 && u <= 1 + 1e-12 && v <= 1 + 1e-12 && w <= 1 + 1e-12, `b in [0,1]: ${r.bary}`);
    const recon = a.clone().multiplyScalar(u).addScaledVector(b, v).addScaledVector(c, w);
    near(recon.distanceTo(r.point), 0, 1e-9, 'point = Σ bᵢ vᵢ');
    const brute = bruteClosest(p, a, b, c);
    assert(r.point.distanceTo(p) <= brute + 1e-9, `exact ${r.point.distanceTo(p)} > brute ${brute}`);
    assert(brute - r.point.distanceTo(p) < 5e-3, 'not farther than sampling resolution');
  }
});

suite('Triangle BVH');
const proxy = new MHRBodyProxy();
const surf = proxy.getSurfaceMesh();
const bvh = new TriangleBVH(surf.positions, surf.indices);
test('body proxy surface has no degenerate triangles', () => {
  assert(bvh.degenerateCount === 0, `${bvh.degenerateCount}`);
  assert(bvh.triangleCount === surf.indices.length / 3);
});
test('degenerate triangles are rejected', () => {
  const pos = new Float32Array([0, 0, 0, 1, 0, 0, 2, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0]);
  const b = new TriangleBVH(pos, new Uint32Array([0, 1, 2, 3, 4, 5]));
  assert(b.degenerateCount === 1 && b.triangleCount === 1);
  const q = b.nearest(V(0.5, 0.5, 1), 10, { triangle: -1, distSq: 0, point: V(0, 0, 0), bary: [0, 0, 0] });
  assert(q.triangle === 1, 'only the valid triangle can be returned');
});
test('nearest triangle equals brute force for 500 random points', () => {
  const tri = [V(0, 0, 0), V(0, 0, 0), V(0, 0, 0)];
  const out = { triangle: -1, distSq: 0, point: V(0, 0, 0), bary: [0, 0, 0] };
  for (let k = 0; k < 500; k++) {
    const p = V((Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 1.0, (Math.random() - 0.5) * 0.6);
    bvh.nearest(p, 10, out);
    let best = Infinity;
    for (let t = 0; t < surf.indices.length / 3; t++) {
      bvh.triangle(t, tri[0], tri[1], tri[2]);
      best = Math.min(best, closestPointOnTriangle(p, tri[0], tri[1], tri[2]).point.distanceTo(p));
    }
    near(Math.sqrt(out.distSq), best, 1e-9, 'BVH distance');
  }
});

suite('Correspondence field');
test('points on a shell outside the body: valid, positive offset ≈ analytic SDF', () => {
  const pts = [];
  for (let i = 0; i < 300; i++) {
    const y = -0.2 + Math.random() * 0.4;
    const th = Math.random() * Math.PI * 2;
    const sec = proxy.sectionAt(y);
    const r = 1.15;
    pts.push(Math.sin(th) * sec.a * r, y, Math.cos(th) * sec.b * r);
  }
  const f = buildCorrespondence(Float32Array.from(pts), bvh, { maxDistanceM: 0.25 });
  assert(f.validCount === 300, `${f.validCount}`);
  for (let i = 0; i < f.count; i++) {
    const b = f.barycentric.subarray(i * 3, i * 3 + 3);
    near(b[0] + b[1] + b[2], 1, 1e-5);
    assert(f.signedOffset[i] > 0, 'outside ⇒ h > 0');
    const sdf = proxy.signedDistance(pts[i * 3], pts[i * 3 + 1], pts[i * 3 + 2]).distance;
    near(f.signedOffset[i], sdf, 0.006, 'mesh offset ≈ analytic SDF (polygonal approximation)');
    const n = f.normal.subarray(i * 3, i * 3 + 3);
    near(Math.hypot(n[0], n[1], n[2]), 1, 1e-5, 'unit normal');
    assert(f.faceIndex[i] >= 0);
  }
});
test('points inside the body get negative offsets', () => {
  const pts = Float32Array.from([0, 0, 0.05, 0.05, 0.1, 0.02, -0.1, -0.1, 0]);
  const f = buildCorrespondence(pts, bvh, { maxDistanceM: 0.5 });
  for (let i = 0; i < 3; i++) assert(f.signedOffset[i] < 0, `h=${f.signedOffset[i]}`);
});
test('vertices without reliable correspondence are flagged invalid (no placeholder faces)', () => {
  const pts = Float32Array.from([0, 0, 2.0, 0, 5, 0]);
  const f = buildCorrespondence(pts, bvh, { maxDistanceM: 0.25 });
  assert(f.validCount === 0);
  assert(f.faceIndex[0] === -1 && f.faceIndex[1] === -1);
  const legacy = fieldToVertexCorrespondences(f);
  assert(legacy.every((c) => !c.valid && c.nearestBodyFaceIndex === -1));
});
test('yRange excludes vertices outside the torso extent', () => {
  const f = buildCorrespondence(Float32Array.from([0.3, -0.9, 0]), bvh, { maxDistanceM: 1, yRange: [-0.4, 0.4] });
  assert(f.validCount === 0);
});
test('correspondence is stable: identical input ⇒ identical field', () => {
  const pts = Float32Array.from({ length: 300 }, () => (Math.random() - 0.5) * 0.5);
  const f1 = buildCorrespondence(pts, bvh, { maxDistanceM: 0.3 });
  const f2 = buildCorrespondence(pts, bvh, { maxDistanceM: 0.3 });
  for (let i = 0; i < f1.count; i++) {
    assert(f1.faceIndex[i] === f2.faceIndex[i]);
    assert(f1.signedOffset[i] === f2.signedOffset[i]);
  }
});

suite('Rest-pose deformation (deterministic, no drift)');
function crewneckTorso() {
  const { scene } = loadGLB(path.join(__dirname, '..', 'public', 'garments', 'tshirt-crewneck', 'model.glb'));
  const torso = scene.getObjectByName('torso');
  return { rest: new Float32Array(torso.geometry.getAttribute('position').array), idx: torso.geometry.getIndex().array };
}
const { rest, idx } = crewneckTorso();
// Garment → body: shoulder seam anchor (0, 0.2572, 0) onto body shoulder anchor (0, 0.25, 0).
const meshToBody = new THREE.Matrix4().makeTranslation(0, 0.25 - 0.2572, 0);
const bodyToMeshLin = new THREE.Matrix3().setFromMatrix4(meshToBody).invert();
const deformer = new RestPoseDeformer(rest, idx);
const params = { clearanceM: 0.012, smoothingIterations: 4 };

function deformFor(shape) {
  const p = new MHRBodyProxy(shape);
  const s = p.getSurfaceMesh();
  const b = new TriangleBVH(s.positions, s.indices);
  const out = new Float32Array(rest.length);
  const { field } = deformAgainstBody(deformer, rest, b, meshToBody, { maxDistanceM: 0.25, yRange: [p.getSections()[5].y, p.getSections()[0].y], ...params }, out, new Float32Array(rest.length));
  return { out, field, proxy: p };
}

test('deformation never modifies the rest buffer', () => {
  const copy = new Float32Array(rest);
  deformFor(defaultBodyShape());
  for (let i = 0; i < rest.length; i++) assert(rest[i] === copy[i]);
});
test('repeated identical inputs give bit-identical output', () => {
  const a = deformFor(defaultBodyShape()).out;
  for (let k = 0; k < 20; k++) {
    const b = deformFor(defaultBodyShape()).out;
    for (let i = 0; i < a.length; i++) assert(a[i] === b[i], `vertex component ${i} differs`);
  }
});
test('every corresponded vertex ends ≥ clearance outside the body', () => {
  const { out, proxy: p } = deformFor(defaultBodyShape());
  const body = transformPositions(out, meshToBody, new Float32Array(out.length));
  const s = p.getSurfaceMesh();
  const b = new TriangleBVH(s.positions, s.indices);
  const f = buildCorrespondence(body, b, { maxDistanceM: 0.25, yRange: [p.getSections()[5].y, p.getSections()[0].y] });
  let worst = Infinity;
  for (let i = 0; i < f.count; i++) if (f.valid[i]) worst = Math.min(worst, f.signedOffset[i]);
  assert(worst >= params.clearanceM - 2e-3, `min clearance ${worst}`);
});
test('changing shape and returning restores the original geometry exactly', () => {
  const base = deformFor(defaultBodyShape()).out;
  const big = { ...defaultBodyShape(), chest: { a: 0.23, b: 0.15 }, waist: { a: 0.19, b: 0.13 } };
  const changed = deformFor(big).out;
  let diff = 0;
  for (let i = 0; i < base.length; i++) diff = Math.max(diff, Math.abs(base[i] - changed[i]));
  assert(diff > 0.01, `bigger body must push the garment out (max Δ ${diff})`);
  const back = deformFor(defaultBodyShape()).out;
  for (let i = 0; i < base.length; i++) assert(back[i] === base[i], 'restored');
});
test('60 s at 60 fps (3600 updates, alternating shapes): zero drift, stable buffers', () => {
  const base = deformFor(defaultBodyShape()).out;
  const shapes = [defaultBodyShape(), { ...defaultBodyShape(), chest: { a: 0.21, b: 0.14 } }, { ...defaultBodyShape(), hips: { a: 0.2, b: 0.14 } }];
  const proxies = shapes.map((s) => new MHRBodyProxy(s));
  const bvhs = proxies.map((p) => { const s = p.getSurfaceMesh(); return new TriangleBVH(s.positions, s.indices); });
  const out = new Float32Array(rest.length);
  const scratch = new Float32Array(rest.length);
  const len = out.length;
  const opts = (p) => ({ maxDistanceM: 0.25, yRange: [p.getSections()[5].y, p.getSections()[0].y], ...params });
  for (let f = 0; f < 3600; f++) deformAgainstBody(deformer, rest, bvhs[f % 3], meshToBody, opts(proxies[f % 3]), out, scratch);
  assert(out.length === len, 'buffer size unchanged');
  deformAgainstBody(deformer, rest, bvhs[0], meshToBody, opts(proxies[0]), out, scratch);
  for (let i = 0; i < base.length; i++) assert(out[i] === base[i], 'no accumulation');
});
test('null correspondence ⇒ rest geometry (safe fallback)', () => {
  const out = new Float32Array(rest.length);
  deformer.deform(rest, null, bodyToMeshLin, params, out);
  for (let i = 0; i < rest.length; i++) assert(out[i] === rest[i]);
});

suite('Instance-level deformation (real asset, real hierarchy)');
test('instance geometry after 3600 frames of shape changes returns to its first-frame state', () => {
  const meta = getGarmentById('tshirt-crewneck');
  const { scene } = loadGLB(path.join(__dirname, '..', 'public', 'garments', meta.id, 'model.glb'));
  const inst = new GarmentInstance(scene, { ...meta, simulation: { ...meta.simulation, enabled: false } }, null);
  const p = new MHRBodyProxy();
  const root = new THREE.Group();
  root.add(p.group);
  inst.attach(root);
  const step = (now) => inst.update({ bodyProxy: p, bodyRoot: root, dt: 1 / 60, nowMs: now, armDirsBody: { left: null, right: null }, targetScale: V(1, 1, 1), tracking: true, frameAccelWorld: V(0, 0, 0) });
  step(0);
  const torso = inst.meshes.find((m) => m.mesh.name === 'torso');
  const first = new Float32Array(torso.mesh.geometry.getAttribute('position').array);
  const alt = { ...defaultBodyShape(), chest: { a: 0.22, b: 0.14 } };
  for (let f = 1; f <= 3600; f++) {
    if (f % 120 === 0) p.setShape(f % 240 === 0 ? defaultBodyShape() : alt);
    step(f * (1000 / 60));
  }
  p.setShape(defaultBodyShape());
  step(1e7);
  const last = torso.mesh.geometry.getAttribute('position').array;
  let maxD = 0;
  for (let i = 0; i < first.length; i++) maxD = Math.max(maxD, Math.abs(first[i] - last[i]));
  near(maxD, 0, 1e-7, 'max vertex drift');
  for (let i = 0; i < torso.restPositions.length; i++) assert(Number.isFinite(last[i]));
});

finish('test-ar-correspondence');
