/**
 * Geometry / garment tests on the REAL GLB assets: hierarchy, rest transforms, semantic
 * anchors, anchor alignment under arbitrary body poses and scales, sleeve articulation,
 * sleeveless handling, normals and bounding volumes, per-garment mesh roles.
 */
const fs = require('fs');
const path = require('path');
const THREE = require('three');
const { suite, test, assert, near, finish } = require('./lib/harness.cjs');
const { loadGLB } = require('./lib/glb-node-loader.cjs');
const { GARMENTS, getGarmentById } = require('../dist_test/garment-registry.js');
const { GarmentInstance } = require('../dist_test/garment-instance.js');
const { MHRBodyProxy } = require('../dist_test/mhr-body-proxy.js');
const { composeGarmentRootMatrix } = require('../dist_test/garment-rig.js');
const { computeSleeveGaps } = require('../dist_test/debug/sleeve-gap.js');

const GDIR = path.join(__dirname, '..', 'public', 'garments');

function makeInstance(id) {
  const meta = getGarmentById(id);
  const { scene } = loadGLB(path.join(GDIR, id, 'model.glb'));
  const sim = JSON.parse(fs.readFileSync(path.join(GDIR, id, 'simulation-data.json'), 'utf8'));
  const inst = new GarmentInstance(scene, meta, sim);
  const proxy = new MHRBodyProxy();
  const bodyRoot = new THREE.Group();
  bodyRoot.add(proxy.group);
  inst.attach(bodyRoot);
  return { meta, scene, inst, proxy, bodyRoot };
}

function randomPose(bodyRoot) {
  bodyRoot.position.set((Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.4, -(0.8 + Math.random() * 2));
  bodyRoot.quaternion.setFromEuler(new THREE.Euler((Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 0.5));
  bodyRoot.updateMatrixWorld(true);
}

const update = (ctx, o = {}) =>
  ctx.inst.update({
    bodyProxy: ctx.proxy,
    bodyRoot: ctx.bodyRoot,
    dt: o.dt ?? 1 / 60,
    nowMs: (ctx.now = (ctx.now ?? 0) + 1000),
    armDirsBody: o.arms ?? { left: null, right: null },
    targetScale: o.scale ?? new THREE.Vector3(1, 1, 1),
    tracking: o.tracking ?? false,
    frameAccelWorld: new THREE.Vector3(),
  });

suite('Asset inventory');
test('registry lists the 8 expected garments', () => {
  const ids = GARMENTS.map((g) => g.id).sort();
  assert(JSON.stringify(ids) === JSON.stringify(['dress-midi', 'skirt-aline', 'skirt-pleated', 'top-longsleeve', 'top-sleeveless', 'tshirt-crewneck', 'tshirt-fitted', 'tshirt-oversized']), ids.join());
});

suite('Anchor composition (RC3)');
test('T_GC · a_G = T_BC · a_B for random poses and non-uniform scales', () => {
  for (let i = 0; i < 50; i++) {
    const body = new THREE.Matrix4().compose(
      new THREE.Vector3(Math.random(), Math.random(), -2 * Math.random() - 0.5),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.random(), Math.random(), Math.random())),
      new THREE.Vector3(1, 1, 1)
    );
    const aB = new THREE.Vector3(0, 0.25, 0.01);
    const aG = new THREE.Vector3(0.01, 0.257, -0.003);
    const S = new THREE.Vector3(1 + Math.random() * 0.2, 1, 1 + Math.random() * 0.2);
    const M = composeGarmentRootMatrix(body, aB, S, aG);
    const lhs = aG.clone().applyMatrix4(M);
    const rhs = aB.clone().applyMatrix4(body);
    near(lhs.distanceTo(rhs), 0, 1e-9);
  }
});

for (const g of GARMENTS) {
  suite(`Garment ${g.id}`);
  const ctx = makeInstance(g.id);
  const { inst, meta } = ctx;

  test('GLB hierarchy: root group with named meshes', () => {
    const names = [];
    ctx.scene.traverse((o) => o.isMesh && names.push(o.name));
    assert(names.length >= 1, 'has meshes');
    assert(names.includes(meta.construction.simulationMesh), `contains ${meta.construction.simulationMesh}: ${names}`);
  });

  test('semantic anchor derived from geometry matches metadata (< 1 cm)', () => {
    assert(inst.anchor.source === 'geometry');
    assert(inst.anchor.metadataDeltaM < 0.01, `Δ = ${(inst.anchor.metadataDeltaM * 100).toFixed(2)} cm`);
    near(inst.anchor.anchor.x, 0, 1e-3, 'anchor on the sagittal plane');
  });

  test('garment anchor coincides with body anchor under random body poses (world space)', () => {
    for (let i = 0; i < 10; i++) {
      randomPose(ctx.bodyRoot);
      update(ctx, { scale: new THREE.Vector3(1 + 0.1 * Math.random(), 1, 1 + 0.1 * Math.random()) });
      const d = inst.diagnostics(ctx.proxy, ctx.bodyRoot, false);
      near(d.anchorAlignmentErrorM, 0, 1e-6, 'alignment error');
    }
  });

  test('anchor stays aligned after a body-shape change', () => {
    ctx.proxy.setShape({ ...ctx.proxy.getShape(), torsoLengthM: 0.56, shoulderBreadthM: 0.4 });
    update(ctx);
    const d = inst.diagnostics(ctx.proxy, ctx.bodyRoot, false);
    near(d.anchorAlignmentErrorM, 0, 1e-6);
    near(d.bodyAnchorLocal[1], meta.modelAnchor.type === 'waist_center' ? ctx.proxy.getSections()[3].y : 0.28, 1e-9);
  });

  test('mesh roles follow construction metadata', () => {
    const roles = Object.fromEntries(inst.meshes.map((m) => [m.mesh.name, m.role]));
    // 2026-11-07 fix, item 5: no articulation anywhere; sleeves are 'attached' (rigid + seam-bound to the torso).
    assert(!Object.values(roles).includes('articulated'), `no articulation: ${JSON.stringify(roles)}`);
    if (meta.construction.sleeves !== 'none') {
      assert(roles.left_sleeve === 'attached' && roles.right_sleeve === 'attached', JSON.stringify(roles));
    } else {
      assert(!('left_sleeve' in roles) && !('right_sleeve' in roles), `sleeveless garments have no sleeve meshes: ${JSON.stringify(roles)}`);
    }
    assert(roles[meta.construction.simulationMesh] === 'simulated', `sim mesh role: ${roles[meta.construction.simulationMesh]} (${inst.simDisabledReason})`);
  });

  test('normals and bounding volumes are finite after deformation', () => {
    for (const m of inst.meshes) {
      const g = m.mesh.geometry;
      const p = g.getAttribute('position').array;
      const n = g.getAttribute('normal').array;
      for (let i = 0; i < p.length; i++) assert(Number.isFinite(p[i]) && Number.isFinite(n[i]), `NaN in ${m.mesh.name}`);
      g.computeBoundingSphere();
      assert(Number.isFinite(g.boundingSphere.radius) && g.boundingSphere.radius > 0);
      // Every vertex inside the bounding sphere.
      const c = g.boundingSphere.center;
      for (let i = 0; i < p.length; i += 3) {
        assert(Math.hypot(p[i] - c.x, p[i + 1] - c.y, p[i + 2] - c.z) <= g.boundingSphere.radius + 1e-5, 'vertex outside bounding sphere');
      }
      // Normals unit length.
      for (let i = 0; i < n.length; i += 3) {
        const l = Math.hypot(n[i], n[i + 1], n[i + 2]);
        assert(Math.abs(l - 1) < 1e-3 || l === 0, `normal length ${l}`);
      }
    }
  });

  test('UV-seam duplicates share one normal (no shading crease)', () => {
    for (const m of inst.meshes) {
      if (m.role !== 'deformed' && m.role !== 'simulated') continue;
      const p = m.mesh.geometry.getAttribute('position').array;
      const n = m.mesh.geometry.getAttribute('normal').array;
      const seen = new Map();
      let maxAngle = 0;
      for (let i = 0; i < p.length / 3; i++) {
        const key = [p[i * 3], p[i * 3 + 1], p[i * 3 + 2]].map((v) => Math.round(v * 1e5)).join(',');
        const prev = seen.get(key);
        if (prev === undefined) { seen.set(key, i); continue; }
        const dot = n[i * 3] * n[prev * 3] + n[i * 3 + 1] * n[prev * 3 + 1] + n[i * 3 + 2] * n[prev * 3 + 2];
        maxAngle = Math.max(maxAngle, Math.acos(Math.min(1, dot)));
      }
      assert(maxAngle < 1e-3, `${m.mesh.name}: seam normals differ by ${(maxAngle * 180 / Math.PI).toFixed(1)}°`);
    }
  });

  if (meta.construction.sleeves !== 'none') {
    const sleeves = () => ['left_sleeve', 'right_sleeve'].map((n) => ctx.scene.getObjectByName(n));
    const torso = () => ctx.scene.getObjectByName(meta.construction.simulationMesh);

    test('sleeves hang outward and down from their seam (asset orientation)', () => {
      for (const sl of sleeves()) {
        const sgn = sl.name === 'left_sleeve' ? 1 : -1;
        const uv = sl.geometry.getAttribute('uv'), pos = sl.geometry.getAttribute('position');
        const c = (v) => { const p = new THREE.Vector3(); let n = 0; for (let i = 0; i < uv.count; i++) if (Math.abs(uv.getY(i) - v) < 1e-4) { p.add(new THREE.Vector3().fromBufferAttribute(pos, i)); n++; } return p.divideScalar(n); };
        const seam = c(0), cuff = c(1);
        assert((cuff.x - seam.x) * sgn > 0.02, `${sl.name} cuff not lateral of the seam`);
        assert(cuff.y < seam.y, `${sl.name} cuff not below the seam`);
      }
    });

    test('sleeves articulate with arm input while maintaining seam connection', () => {
      const before = sleeves().map((sl) => [sl.position.clone(), sl.quaternion.clone()]);
      const up = new THREE.Vector3(0.6, 0.8, 0).normalize();
      for (let i = 0; i < 60; i++) update(ctx, { arms: { left: up, right: up.clone().setX(-0.6) } });
      sleeves().forEach((sl, k) => {
        const dot = Math.abs(sl.quaternion.dot(before[k][1]));
        assert(dot < 0.999, `${sl.name} did not rotate under arm direction (dot=${dot.toFixed(4)})`);
        assert(!isNaN(sl.position.x) && !isNaN(sl.quaternion.w), `${sl.name} transform has NaN`);
      });
      ctx.inst.sleeveRig.resetToRest();
      update(ctx);
    });

    test('seam gap at rest: the WHOLE seam ring lies within 0.5 cm of the torso surface', () => {
      ctx.scene.updateMatrixWorld(true);
      for (const g of computeSleeveGaps(torso(), sleeves())) {
        assert(g.ringVertices >= 8, `${g.name} ring vertices ${g.ringVertices}`);
        assert(g.maxCm < 0.5, `${g.name}: min ${g.minCm.toFixed(2)} / median ${g.medianCm.toFixed(2)} / max ${g.maxCm.toFixed(2)} cm`);
      }
    });

    test('seam gap under pose (moving body, larger body → torso push-out, cloth simulation): ring within 0.5 cm', () => {
      ctx.proxy.setShape({ ...ctx.proxy.getShape(), chest: { a: 0.22, b: 0.15 }, shoulderBreadthM: 0.42 });
      let worst = 0, worstName = '';
      for (let f = 0; f < 180; f++) {
        const t = f / 60;
        ctx.bodyRoot.position.set(0.2 * Math.sin(t * 2), 0.05 * Math.sin(t * 3), -1.5 + 0.3 * Math.sin(t));
        ctx.bodyRoot.quaternion.setFromEuler(new THREE.Euler(0, 0.4 * Math.sin(t * 1.5), 0));
        ctx.bodyRoot.updateMatrixWorld(true);
        ctx.inst.update({ bodyProxy: ctx.proxy, bodyRoot: ctx.bodyRoot, dt: 1 / 60, nowMs: (ctx.now = (ctx.now ?? 0) + 16.7), armDirsBody: { left: null, right: null }, targetScale: new THREE.Vector3(1, 1, 1), tracking: true, frameAccelWorld: new THREE.Vector3(Math.sin(t * 4), 0, 0) });
        if (f % 30 === 29) {
          ctx.scene.updateMatrixWorld(true);
          for (const g of computeSleeveGaps(torso(), sleeves())) if (g.maxCm > worst) { worst = g.maxCm; worstName = g.name; }
        }
      }
      console.log(`      worst seam gap under pose: ${worst.toFixed(3)} cm (${worstName})`);
      assert(worst < 0.5, `max seam gap ${worst.toFixed(3)} cm (${worstName})`);
    });
  }
}

suite('Garment-specific geometry checks');
test('skirt waistband circumference matches declared waistCm (± 6 %)', () => {
  for (const id of ['skirt-aline', 'skirt-pleated']) {
    const { scene } = loadGLB(path.join(GDIR, id, 'model.glb'));
    const body = scene.getObjectByName('skirt_body');
    const pos = body.geometry.getAttribute('position');
    let maxX = 0, maxZ = 0;
    for (let i = 0; i < pos.count; i++) if (Math.abs(pos.getY(i)) < 1e-6) { maxX = Math.max(maxX, Math.abs(pos.getX(i))); maxZ = Math.max(maxZ, Math.abs(pos.getZ(i))); }
    const a = maxX, b = maxZ;
    const C = Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b))) * 100;
    const decl = getGarmentById(id).dimensions.waistCm;
    assert(Math.abs(C - decl) / decl < 0.06, `${id}: geometry ${C.toFixed(1)} cm vs declared ${decl} cm`);
  }
});

finish('test-ar-garments');
