/**
 * DRAPE Garment Rig Test Suite (Milestone 0.6)
 *
 * Verifies:
 *  1. Neckline reference derivation from geometry (crewneck, oversized, fitted, longsleeve, sleeveless, dress).
 *  2. Configurable neckline vertical offset (+Y) applied cleanly to collar opening without disturbing shoulder seam.
 *  3. Preservation of shoulder anchor alignment (T_GC · a_G = T_BC · a_B).
 *  4. Accurate sleeve seam-to-cuff axis and armhole pivot derivation from geometry (not naive bounding box max dimension).
 *  5. Zero pivot drift during 3D sleeve articulation about the armhole seam.
 *  6. Independent left/right sleeve rotation and abduction clamping.
 *  7. Easing back to rest transforms when arm direction is untracked (null).
 *  8. Retention of rigid sleeve geometry and dimensions.
 */
const fs = require('fs');
const path = require('path');
const THREE = require('three');
const { suite, test, assert, near, finish } = require('./lib/harness.cjs');
const { loadGLB } = require('./lib/glb-node-loader.cjs');
const { GARMENTS, getGarmentById } = require('../dist_test/garment-registry.js');
const {
  computeSemanticAnchor,
  applyNecklineOffset,
  describeSleeve,
  clampAbduction,
  SleeveRig,
  captureRestTransforms,
  bodyDirToGarment,
} = require('../dist_test/garment-rig.js');
const { GarmentInstance } = require('../dist_test/garment-instance.js');
const { MHRBodyProxy } = require('../dist_test/mhr-body-proxy.js');

const GDIR = path.join(__dirname, '..', 'public', 'garments');

suite('Neckline geometry derivation');

test('computeSemanticAnchor extracts front collar neckline reference for all upper-body garments', () => {
  const upperBody = ['tshirt-crewneck', 'tshirt-oversized', 'tshirt-fitted', 'top-longsleeve', 'top-sleeveless', 'dress-midi'];
  for (const id of upperBody) {
    const meta = getGarmentById(id);
    const { scene } = loadGLB(path.join(GDIR, id, 'model.glb'));
    const result = computeSemanticAnchor(scene, meta);
    assert(result.anchor !== undefined, `${id}: anchor must exist`);
    assert(result.neckline !== undefined, `${id}: neckline reference must be derived from geometry`);
    // Neckline is centered near sagittal plane (|x| < 0.03 m) and located at front collar (z > 0)
    near(result.neckline.x, 0, 0.03, `${id}: neckline on sagittal plane`);
    assert(result.neckline.z > 0.02, `${id}: neckline front collar z > 0.02 (got ${result.neckline.z})`);
    // Neckline dip sits below or level with shoulder top
    assert(result.neckline.y <= result.anchor.y + 0.05, `${id}: neckline y (${result.neckline.y}) below shoulder anchor (${result.anchor.y})`);
  }
});

test('waist-anchored garments (skirts) have undefined neckline', () => {
  for (const id of ['skirt-aline', 'skirt-pleated']) {
    const meta = getGarmentById(id);
    const { scene } = loadGLB(path.join(GDIR, id, 'model.glb'));
    const result = computeSemanticAnchor(scene, meta);
    assert(result.neckline === undefined, `${id}: skirts should have undefined neckline`);
  }
});

suite('Neckline vertical offset calibration');

test('applyNecklineOffset lifts front collar vertices while leaving shoulder seams undisturbed', () => {
  const meta = getGarmentById('tshirt-crewneck');
  const { scene } = loadGLB(path.join(GDIR, meta.id, 'model.glb'));
  let torso;
  scene.traverse((o) => { if (o.isMesh && o.name === 'torso') torso = o; });
  const pos = torso.geometry.getAttribute('position');

  const beforeCollarY = pos.getY(0); // front center collar
  const beforeShoulderY = pos.getY(7); // lateral shoulder seam

  const offset = 0.008; // +8 mm
  const lifted = applyNecklineOffset(scene, offset, 'torso');
  assert(lifted > 0, `must lift collar vertices (lifted ${lifted})`);

  const afterCollarY = pos.getY(0);
  const afterShoulderY = pos.getY(7);

  near(afterCollarY - beforeCollarY, offset, 1e-4, 'collar center lifted by exactly offset');
  near(afterShoulderY - beforeShoulderY, 0, 1e-6, 'shoulder seam untouched');
});

test('GarmentInstance exposes calibrated neckline diagnostics and applied offset', () => {
  const meta = getGarmentById('tshirt-crewneck');
  const { scene } = loadGLB(path.join(GDIR, meta.id, 'model.glb'));
  const sim = JSON.parse(fs.readFileSync(path.join(GDIR, meta.id, 'simulation-data.json'), 'utf8'));
  const inst = new GarmentInstance(scene, meta, sim);
  const proxy = new MHRBodyProxy();
  const root = new THREE.Group();
  root.add(proxy.group);
  inst.attach(root);

  const diag = inst.diagnostics(proxy, root, true);
  assert(diag.neckline !== undefined, 'garment diagnostics must include neckline block');
  near(diag.neckline.appliedOffsetY, 0.008, 1e-6, 'applied offset matches fittingProfile');
  assert(Number.isFinite(diag.neckline.garmentNecklineLocal[1]), 'garment neckline Y is finite');
  assert(Number.isFinite(diag.neckline.bodyNeckLocal[1]), 'body neck Y is finite');
  assert(diag.neckline.necklineDispMm !== undefined && diag.neckline.necklineDispMm > 0, 'neckline displacement is measured in mm');
});

suite('Shoulder anchor preservation');

test('T_GC · a_G = T_BC · a_B remains exact with zero drift', () => {
  const meta = getGarmentById('tshirt-crewneck');
  const { scene } = loadGLB(path.join(GDIR, meta.id, 'model.glb'));
  const sim = JSON.parse(fs.readFileSync(path.join(GDIR, meta.id, 'simulation-data.json'), 'utf8'));
  const inst = new GarmentInstance(scene, meta, sim);
  const proxy = new MHRBodyProxy();
  const root = new THREE.Group();
  root.add(proxy.group);
  inst.attach(root);

  for (let i = 0; i < 20; i++) {
    root.position.set((Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.3, -(1.0 + Math.random()));
    root.quaternion.setFromEuler(new THREE.Euler(Math.random() * 0.2, Math.random() * 0.5, 0));
    root.updateMatrixWorld(true);

    inst.update({
      bodyProxy: proxy,
      bodyRoot: root,
      dt: 1 / 60,
      nowMs: i * 16.7,
      armDirsBody: { left: null, right: null },
      targetScale: new THREE.Vector3(1, 1, 1),
      tracking: true,
      frameAccelWorld: new THREE.Vector3(),
    });

    const d = inst.diagnostics(proxy, root, true);
    near(d.anchorAlignmentErrorM, 0, 1e-6, 'anchor alignment error must stay 0');
  }
});

suite('Sleeve discovery and geometric axis derivation');

test('describeSleeve computes accurate seam-to-cuff direction and armhole pivot', () => {
  for (const id of ['tshirt-crewneck', 'tshirt-oversized', 'tshirt-fitted', 'top-longsleeve']) {
    const meta = getGarmentById(id);
    const { scene } = loadGLB(path.join(GDIR, id, 'model.glb'));
    const rest = captureRestTransforms(scene);

    const leftNode = scene.getObjectByName('left_sleeve');
    const rightNode = scene.getObjectByName('right_sleeve');
    assert(leftNode && rightNode, `${id} must contain left and right sleeve meshes`);

    const leftDesc = describeSleeve(leftNode, 'left', rest.get(leftNode));
    const rightDesc = describeSleeve(rightNode, 'right', rest.get(rightNode));

    // Left sleeve axis points outward (+X) and downward (-Y)
    assert(leftDesc.axisLocal.x > 0.5, `${id}: left sleeve axis points outward (+X), got ${leftDesc.axisLocal.x}`);
    assert(leftDesc.axisLocal.y < -0.3, `${id}: left sleeve axis points downward (-Y), got ${leftDesc.axisLocal.y}`);

    // Right sleeve axis is symmetric: points outward (-X) and downward (-Y)
    assert(rightDesc.axisLocal.x < -0.5, `${id}: right sleeve axis points outward (-X), got ${rightDesc.axisLocal.x}`);
    assert(rightDesc.axisLocal.y < -0.3, `${id}: right sleeve axis points downward (-Y), got ${rightDesc.axisLocal.y}`);

    // Pivot is located at seam center on corresponding side
    assert(leftDesc.pivotLocal.x > 0.1, `${id}: left pivot is lateral (+X)`);
    assert(rightDesc.pivotLocal.x < -0.1, `${id}: right pivot is lateral (-X)`);
    near(leftDesc.pivotLocal.x, -rightDesc.pivotLocal.x, 1e-3, `${id}: pivots are symmetric in X`);
    near(leftDesc.pivotLocal.y, rightDesc.pivotLocal.y, 1e-3, `${id}: pivots match in Y`);
  }
});

suite('Armhole pivot invariance during articulation');

test('seam pivot point does not drift in parent space during 3D articulation', () => {
  const meta = getGarmentById('tshirt-crewneck');
  const { scene } = loadGLB(path.join(GDIR, meta.id, 'model.glb'));
  const rest = captureRestTransforms(scene);
  const rig = SleeveRig.fromGarment(scene, meta, rest);

  assert(rig.sleeves.length === 2, 'must discover 2 sleeves');

  const testAngles = [
    new THREE.Vector3(0.5, 0.8, 0).normalize(),    // raised up
    new THREE.Vector3(0.9, 0.1, 0).normalize(),    // T-pose lateral
    new THREE.Vector3(0.3, -0.9, 0.3).normalize(),  // down and forward
    new THREE.Vector3(0.1, -0.4, 0.9).normalize(),  // forward reaching
  ];

  for (const s of rig.sleeves) {
    const pivotRestParent = s.pivotLocal.clone().multiply(s.rest.scale).applyQuaternion(s.rest.quaternion).add(s.rest.position);

    for (const target of testAngles) {
      const dir = s.side === 'left' ? target : target.clone().setX(-target.x);
      // Run several update steps so exponential smoothing reaches target
      for (let step = 0; step < 60; step++) {
        rig.update({ left: s.side === 'left' ? dir : null, right: s.side === 'right' ? dir : null }, 1 / 60);
      }

      // Check current position of pivot point in parent frame
      const currentPivotParent = s.pivotLocal.clone()
        .multiply(s.node.scale)
        .applyQuaternion(s.node.quaternion)
        .add(s.node.position);

      const driftM = currentPivotParent.distanceTo(pivotRestParent);
      near(driftM, 0, 1e-6, `${s.side}_sleeve pivot drift under angle (${target.x}, ${target.y}, ${target.z})`);
    }
  }
});

suite('Sleeve articulation behavior');

test('left and right sleeves articulate independently without crosstalk', () => {
  const meta = getGarmentById('tshirt-crewneck');
  const { scene } = loadGLB(path.join(GDIR, meta.id, 'model.glb'));
  const rest = captureRestTransforms(scene);
  const rig = SleeveRig.fromGarment(scene, meta, rest);

  const leftUp = new THREE.Vector3(0.6, 0.8, 0).normalize();
  // Move ONLY left arm up; right arm stays null
  for (let step = 0; step < 60; step++) {
    rig.update({ left: leftUp, right: null }, 1 / 60);
  }

  const leftSleeve = rig.sleeves.find((s) => s.side === 'left');
  const rightSleeve = rig.sleeves.find((s) => s.side === 'right');

  // Left sleeve rotated away from rest
  const leftDot = Math.abs(leftSleeve.node.quaternion.dot(leftSleeve.rest.quaternion));
  assert(leftDot < 0.98, `left sleeve must rotate (dot=${leftDot.toFixed(4)})`);

  // Right sleeve remained at rest
  const rightDot = Math.abs(rightSleeve.node.quaternion.dot(rightSleeve.rest.quaternion));
  near(rightDot, 1, 1e-4, 'right sleeve stays at rest when null');
});

test('sleeves ease smoothly back to rest when arm direction becomes null', () => {
  const meta = getGarmentById('tshirt-crewneck');
  const { scene } = loadGLB(path.join(GDIR, meta.id, 'model.glb'));
  const rest = captureRestTransforms(scene);
  const rig = SleeveRig.fromGarment(scene, meta, rest);

  const up = new THREE.Vector3(0.6, 0.8, 0).normalize();
  for (let step = 0; step < 60; step++) {
    rig.update({ left: up, right: up.clone().setX(-0.6) }, 1 / 60);
  }

  // Release tracking: pass null for 1.5 seconds (90 frames at 60 fps)
  for (let step = 0; step < 90; step++) {
    rig.update({ left: null, right: null }, 1 / 60);
  }

  for (const s of rig.sleeves) {
    const dot = Math.abs(s.node.quaternion.dot(s.rest.quaternion));
    near(dot, 1, 1e-3, `${s.side} sleeve eased back to rest transform (dot=${dot.toFixed(4)})`);
    near(s.node.position.distanceTo(s.rest.position), 0, 1e-4, `${s.side} position eased back to rest`);
  }
});

test('abduction clamping prevents sleeve from penetrating the torso', () => {
  const clamped = clampAbduction(new THREE.Vector3(0.01, -0.99, 0).normalize(), 'left', 0.35);
  const psi = Math.atan2(clamped.x, -clamped.y);
  assert(psi >= 0.349, `abduction clamped to >= minAbduction (got ${psi})`);
});

finish('test-ar-garment-rig');

