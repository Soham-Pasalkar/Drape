/**
 * XPBD cloth tests (RC7 + multi-mesh): constraint construction, pinning, stretch, bending,
 * collision in the correct space under rotated / translated / non-uniformly scaled frames,
 * fixed timestep, variable frame-time stability, garment multi-mesh mapping.
 */
const fs = require('fs');
const path = require('path');
const THREE = require('three');
const { suite, test, assert, near, finish } = require('./lib/harness.cjs');
const { XPBDClothSolver, XPBD_TIMESTEP } = require('../dist_test/xpbd-cloth-solver.js');
const { MHRBodyProxy } = require('../dist_test/mhr-body-proxy.js');
const { GarmentInstance } = require('../dist_test/garment-instance.js');
const { GARMENTS, getGarmentById } = require('../dist_test/garment-registry.js');
const { loadGLB } = require('./lib/glb-node-loader.cjs');

const CFG = {
  enabled: true, substeps: 4, iterations: 8, stretchCompliance: 1e-7, bendCompliance: 1e-4,
  skinAttachmentDist: 0.5, lraStiffness: 1, damping: 0.05, inertialCoupling: 0, collisionTolerance: 0.01,
};

/** n×n grid in the XY plane, top row pinned. */
function grid(n, size, z = 0) {
  const pos = [];
  const w = [];
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    pos.push((i / (n - 1) - 0.5) * size, -(j / (n - 1)) * size, z);
    w.push(j === 0 ? 1 : 0);
  }
  const idx = [];
  for (let j = 0; j < n - 1; j++) for (let i = 0; i < n - 1; i++) {
    const a = j * n + i, b = a + 1, c = a + n, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  return { pos: Float32Array.from(pos), idx: Uint32Array.from(idx), w: Float32Array.from(w) };
}

const proxy = new MHRBodyProxy();
const farAway = new THREE.Matrix4().makeTranslation(0, 0, 10); // body SDF never reached
const ctx = (o = {}) => ({ bodyProxy: proxy, simToBody: o.simToBody ?? farAway, gravity: o.gravity ?? new THREE.Vector3(0, -9.81, 0), frameAccel: o.frameAccel });

suite('Constraint construction');
test('edge, bending and LRA counts for a 10×10 grid', () => {
  const g = grid(10, 0.4);
  const s = new XPBDClothSolver(CFG, 200);
  s.initializeMesh(g.pos, g.idx, g.w);
  const edges = 9 * 10 * 2 + 81; // horizontal + vertical + diagonals
  assert(s.stretchConstraintCount === edges, `stretch ${s.stretchConstraintCount} vs ${edges}`);
  // Interior edges are shared by exactly two triangles: total edges − boundary edges (36).
  assert(s.bendingConstraintCount === edges - 36, `bend ${s.bendingConstraintCount}`);
  assert(s.pinnedCount === 10);
  assert(s.lraConstraintCount === 90);
});

test('UV-seam duplicates are welded into one particle and the seam stays closed', () => {
  // Open cylinder with a duplicated seam column (like the garment torso tubes).
  const rows = 8, cols = 12, r = 0.15, h = 0.4;
  const pos = [], w = [], idx = [];
  for (let j = 0; j < rows; j++) for (let i = 0; i <= cols; i++) {
    const a = (i / cols) * Math.PI * 2;
    pos.push(Math.sin(a) * r, -(j / (rows - 1)) * h, Math.cos(a) * r);
    w.push(j === 0 ? 1 : 0);
  }
  for (let j = 0; j < rows - 1; j++) for (let i = 0; i < cols; i++) {
    const a = j * (cols + 1) + i, b = a + 1, c = a + cols + 1, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  const s = new XPBDClothSolver({ ...CFG, stretchCompliance: 1e-4 }, 200);
  s.initializeMesh(Float32Array.from(pos), Uint32Array.from(idx), Float32Array.from(w));
  assert(s.particleCount === rows * cols && s.vertexCount === rows * (cols + 1), `${s.particleCount}/${s.vertexCount}`);
  for (let k = 0; k < 120; k++) s.step(1 / 60, ctx({ frameAccel: new THREE.Vector3(3 * Math.sin(k / 5), 0, 1) }));
  const x = s.getSimulatedPositions();
  for (let j = 0; j < rows; j++) {
    const a = j * (cols + 1), b = a + cols;
    near(Math.hypot(x[a * 3] - x[b * 3], x[a * 3 + 1] - x[b * 3 + 1], x[a * 3 + 2] - x[b * 3 + 2]), 0, 0, `seam row ${j}`);
  }
});

suite('Dynamics');
test('pinned particles do not move; free particles fall under gravity', () => {
  const g = grid(8, 0.3);
  const s = new XPBDClothSolver({ ...CFG, stretchCompliance: 1e-2 }, 200);
  s.initializeMesh(g.pos, g.idx, g.w);
  s.step(1 / 60, ctx());
  const x = s.getSimulatedPositions();
  for (let i = 0; i < 8; i++) near(x[i * 3 + 1], g.pos[i * 3 + 1], 0, 'pinned');
  assert(x[(8 * 7 + 4) * 3 + 1] < g.pos[(8 * 7 + 4) * 3 + 1], 'bottom row moved down');
});

test('stiff stretch: hanging cloth strain stays < 2 % after 2 s', () => {
  const g = grid(10, 0.4);
  const s = new XPBDClothSolver(CFG, 240);
  s.initializeMesh(g.pos, g.idx, g.w);
  for (let i = 0; i < 120; i++) s.step(1 / 60, ctx());
  assert(s.maxStretchStrain() < 0.02, `strain ${(s.maxStretchStrain() * 100).toFixed(2)} %`);
});

test('LRA tether bounds the hem even with very soft stretch', () => {
  const g = grid(10, 0.4);
  const s = new XPBDClothSolver({ ...CFG, stretchCompliance: 1.0 }, 240);
  s.initializeMesh(g.pos, g.idx, g.w);
  for (let i = 0; i < 120; i++) s.step(1 / 60, ctx());
  const x = s.getSimulatedPositions();
  const bottom = (9 * 10 + 5) * 3;
  const top = 5 * 3;
  const d = Math.hypot(x[bottom] - x[top], x[bottom + 1] - x[top + 1], x[bottom + 2] - x[top + 2]);
  const rest = Math.hypot(g.pos[bottom] - g.pos[top], g.pos[bottom + 1] - g.pos[top + 1]);
  assert(d <= rest * (1 + XPBD_TIMESTEP.LRA_SLACK) + 1e-3, `tether ${d} > ${rest * 1.05}`);
});

test('bending constraints resist folding (stiff vs soft)', () => {
  // A horizontal cloth pinned along one edge droops less with stiff bending.
  const make = (bend) => {
    const n = 8, size = 0.3;
    const pos = [], w = [];
    // Two pinned columns clamp the edge (a single pinned line is a hinge: the sheet would
    // rotate rigidly without bending at all).
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { pos.push((i / (n - 1)) * size, 0, (j / (n - 1)) * size); w.push(i <= 1 ? 1 : 0); }
    const idx = [];
    for (let j = 0; j < n - 1; j++) for (let i = 0; i < n - 1; i++) { const a = j * n + i; idx.push(a, a + n, a + 1, a + 1, a + n, a + n + 1); }
    const s = new XPBDClothSolver({ ...CFG, bendCompliance: bend }, 240);
    s.initializeMesh(Float32Array.from(pos), Uint32Array.from(idx), Float32Array.from(w));
    for (let k = 0; k < 120; k++) s.step(1 / 60, ctx());
    const x = s.getSimulatedPositions();
    return x[(3 * n + (n - 1)) * 3 + 1]; // free edge height
  };
  const stiff = make(1e-9), soft = make(1.0);
  assert(stiff > soft + 0.01, `stiff droop ${stiff.toFixed(3)} vs soft ${soft.toFixed(3)}`);
});

suite('Collision coordinate contract');
test('penetrating particle is pushed out to the tolerance IN BODY SPACE (rotated + scaled frame)', () => {
  // Sim space differs from body space by rotation, translation and NON-UNIFORM scale.
  const simToBody = new THREE.Matrix4().compose(
    new THREE.Vector3(0.03, -0.12, 0.02),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(0.2, 0.9, -0.15)),
    new THREE.Vector3(1.2, 0.9, 1.1)
  );
  const bodyToSim = simToBody.clone().invert();
  // Particle that sits 3 cm inside the chest front in body space.
  const sec = proxy.sectionAt(0.1);
  const pBody = new THREE.Vector3(0.02, 0.1, sec.b - 0.03);
  const pSim = pBody.clone().applyMatrix4(bodyToSim);
  const anchorSim = new THREE.Vector3(0, 0.6, 0).applyMatrix4(bodyToSim); // pinned far above
  const pos = Float32Array.from([...anchorSim.toArray(), ...pSim.toArray(), ...pSim.clone().add(new THREE.Vector3(0.001, 0, 0)).toArray()]);
  const s = new XPBDClothSolver({ ...CFG, collisionTolerance: 0.01, skinAttachmentDist: 1 }, 200);
  s.initializeMesh(pos, Uint32Array.from([0, 1, 2]), Float32Array.from([1, 0, 0]));
  s.step(1 / 60, { bodyProxy: proxy, simToBody, gravity: new THREE.Vector3(0, 0, 0) });
  const x = s.getSimulatedPositions();
  const after = new THREE.Vector3(x[3], x[4], x[5]).applyMatrix4(simToBody);
  const d = proxy.signedDistance(after.x, after.y, after.z).distance;
  assert(d >= 0.01 - 1e-3, `body-space clearance after collision = ${d}`);
  assert(after.z > pBody.z, 'pushed forward out of the chest');
});

test('without the transform (old bug) the same particle would be evaluated in the wrong place', () => {
  // Documented regression: garment-local coordinates fed directly to the body SDF.
  const simToBody = new THREE.Matrix4().makeTranslation(0, 0.3, 0);
  const pSim = new THREE.Vector3(0, -0.2, 0.1); // body-local (0, 0.1, 0.1): inside chest
  const inside = proxy.signedDistance(...pSim.clone().applyMatrix4(simToBody).toArray()).distance;
  const naive = proxy.signedDistance(pSim.x, pSim.y, pSim.z).distance;
  assert(inside < 0 && Math.abs(inside - naive) > 0.005, `inside=${inside} naive=${naive}`);
});

suite('Fixed timestep');
test('a 0.5 s frame is bounded to MAX_STEPS_PER_FRAME and excess time is dropped', () => {
  const g = grid(6, 0.2);
  const s = new XPBDClothSolver(CFG, 200);
  s.initializeMesh(g.pos, g.idx, g.w);
  const steps = s.step(0.5, ctx());
  assert(steps === XPBD_TIMESTEP.MAX_STEPS_PER_FRAME, `steps ${steps}`);
  assert(s.stats.droppedTimeS > 0, 'time dropped instead of spiralling');
});
test('accumulator: 120 Hz frames take one fixed step every other frame', () => {
  const g = grid(6, 0.2);
  const s = new XPBDClothSolver(CFG, 200);
  s.initializeMesh(g.pos, g.idx, g.w);
  let total = 0;
  for (let i = 0; i < 120; i++) total += s.step(1 / 120, ctx());
  assert(Math.abs(total - 60) <= 1, `fixed steps ${total}`);
});
test('stable under random frame times (0–100 ms) for 600 frames', () => {
  const g = grid(10, 0.4);
  const s = new XPBDClothSolver(CFG, 240);
  s.initializeMesh(g.pos, g.idx, g.w);
  for (let i = 0; i < 600; i++) s.step(Math.random() * 0.1, ctx({ frameAccel: new THREE.Vector3(Math.random() * 4 - 2, 0, 0) }));
  const x = s.getSimulatedPositions();
  for (let i = 0; i < x.length; i++) assert(Number.isFinite(x[i]), 'NaN');
  assert(s.maxStretchStrain() < 0.05, `strain ${s.maxStretchStrain()}`);
});
test('reset() snaps to the skin target and zeroes velocity', () => {
  const g = grid(6, 0.2);
  const s = new XPBDClothSolver(CFG, 200);
  s.initializeMesh(g.pos, g.idx, g.w);
  for (let i = 0; i < 30; i++) s.step(1 / 60, ctx());
  s.reset();
  const x = s.getSimulatedPositions();
  for (let i = 0; i < x.length; i++) near(x[i], g.pos[i], 0);
});

suite('Garment simulation binding (multi-mesh)');
for (const meta of GARMENTS) {
  test(`${meta.id}: simulation mesh mapped, other meshes keep their own role`, () => {
    const dir = path.join(__dirname, '..', 'public', 'garments', meta.id);
    const { scene } = loadGLB(path.join(dir, 'model.glb'));
    const sim = JSON.parse(fs.readFileSync(path.join(dir, 'simulation-data.json'), 'utf8'));
    const inst = new GarmentInstance(scene, meta, sim);
    assert(inst.sim, `sim disabled: ${inst.simDisabledReason}`);
    assert(inst.sim.record.mesh.name === meta.construction.simulationMesh);
    for (const m of inst.meshes) {
      if (m.mesh.name !== meta.construction.simulationMesh) assert(m.role !== 'simulated', `${m.mesh.name} must not claim simulation`);
    }
    // Exact vertex correspondence for these assets ⇒ one particle per render vertex.
    assert(inst.sim.k === 1, `k=${inst.sim.k}`);
  });
}
test('mismatched simulation data disables simulation explicitly', () => {
  const meta = getGarmentById('tshirt-crewneck');
  const { scene } = loadGLB(path.join(__dirname, '..', 'public', 'garments', meta.id, 'model.glb'));
  const sim = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'public', 'garments', 'skirt-aline', 'simulation-data.json'), 'utf8'));
  const inst = new GarmentInstance(scene, meta, sim);
  assert(inst.sim === null && /mismatch/.test(inst.simDisabledReason), inst.simDisabledReason);
  assert(inst.meshes.find((m) => m.mesh.name === 'torso').role === 'deformed', 'falls back to deformation only');
});

test('simulated garment under a moving body for 10 s stays bounded and outside the body', () => {
  const meta = getGarmentById('tshirt-crewneck');
  const dir = path.join(__dirname, '..', 'public', 'garments', meta.id);
  const { scene } = loadGLB(path.join(dir, 'model.glb'));
  const inst = new GarmentInstance(scene, meta, JSON.parse(fs.readFileSync(path.join(dir, 'simulation-data.json'), 'utf8')));
  const p = new MHRBodyProxy();
  const root = new THREE.Group();
  root.add(p.group);
  inst.attach(root);
  for (let f = 0; f < 600; f++) {
    const t = f / 60;
    root.position.set(0.1 * Math.sin(t * 2), 0, -1.5 + 0.1 * Math.cos(t));
    root.quaternion.setFromEuler(new THREE.Euler(0, 0.4 * Math.sin(t), 0));
    root.updateMatrixWorld(true);
    inst.update({ bodyProxy: p, bodyRoot: root, dt: 1 / 60, nowMs: f * 16.7, armDirsBody: { left: null, right: null }, targetScale: new THREE.Vector3(1, 1, 1), tracking: true, frameAccelWorld: new THREE.Vector3(Math.sin(t * 3), 0, 0) });
  }
  const d = inst.diagnostics(p, root, true);
  assert(d.simulation.maxStrainPct < 5, `strain ${d.simulation.maxStrainPct.toFixed(2)} %`);
  assert(d.simulation.maxPenetrationMm < 15, `penetration ${d.simulation.maxPenetrationMm.toFixed(1)} mm`);
  const torso = inst.meshes.find((m) => m.mesh.name === 'torso');
  const pos = torso.mesh.geometry.getAttribute('position').array;
  let maxDev = 0;
  for (let i = 0; i < pos.length; i++) { assert(Number.isFinite(pos[i])); maxDev = Math.max(maxDev, Math.abs(pos[i] - torso.deformedPositions[i])); }
  assert(maxDev <= meta.simulation.skinAttachmentDist + 0.02, `render deviates ${maxDev} m from the fitted shape`);
  // Rendered UV-seam duplicates must coincide (no split down the front centre).
  const seen = new Map();
  let gap = 0;
  const rest = torso.restPositions;
  for (let i = 0; i < rest.length / 3; i++) {
    const k = [rest[i * 3], rest[i * 3 + 1], rest[i * 3 + 2]].map((v) => Math.round(v * 1e5)).join(',');
    const j = seen.get(k);
    if (j === undefined) { seen.set(k, i); continue; }
    gap = Math.max(gap, Math.hypot(pos[i * 3] - pos[j * 3], pos[i * 3 + 1] - pos[j * 3 + 1], pos[i * 3 + 2] - pos[j * 3 + 2]));
  }
  near(gap, 0, 1e-7, 'rendered seam gap');
});

finish('test-ar-xpbd');
