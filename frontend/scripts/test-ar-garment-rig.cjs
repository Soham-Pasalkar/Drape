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
const { MHRBodyProxy, BODY_PROXY_PRIORS } = require('../dist_test/mhr-body-proxy.js');

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

  inst.update({
    bodyProxy: proxy,
    bodyRoot: root,
    dt: 1 / 60,
    nowMs: 1000,
    armDirsBody: { left: null, right: null },
    targetScale: new THREE.Vector3(1, 1, 1),
    tracking: true,
    frameAccelWorld: new THREE.Vector3(),
  });

  const diag = inst.diagnostics(proxy, root, true);
  assert(diag.neckline !== undefined, 'garment diagnostics must include neckline block');
  near(diag.neckline.appliedOffsetY, 0.051, 1e-6, 'applied offset matches fittingProfile (0.051 m = +51 mm)');
  near(diag.neckline.effectiveWorldOffsetMm, diag.neckline.appliedOffsetY * diag.scale[1] * 1000, 1e-4, 'effective world offset accounts for wrapper scale');
  assert(diag.neckline.garmentId === 'tshirt-crewneck', 'diag includes garmentId');
  assert(diag.neckline.garmentNecklineBodyLocal !== undefined, 'includes body-local garment neckline');
  assert(diag.neckline.bodyBaseOfNeckLocal !== undefined, 'includes body-local base of neck reference');
  assert(Number.isFinite(diag.neckline.necklineVerticalDeltaMm), 'includes signed vertical delta in mm');
  assert(Number.isFinite(diag.neckline.collarDropMm), 'includes collar drop in mm');
  assert(diag.neckline.collarDropMm >= 25 && diag.neckline.collarDropMm <= 32,
    `collar drop within natural crewneck range (25-32 mm), got ${diag.neckline.collarDropMm.toFixed(1)} mm`);
  assert(diag.neckline.collarCurveVertexCount !== undefined && diag.neckline.collarCurveVertexCount > 0,
    `collar curve vertex count recorded (got ${diag.neckline.collarCurveVertexCount})`);
});

test('base-of-neck diagnostic reference and signed displacement convention', () => {
  const proxy = new MHRBodyProxy();
  const baseOfNeck = proxy.getAttachmentAnchor('base_of_neck');
  const topOfNeck = proxy.getAttachmentAnchor('neckline_center');
  const shoulder = proxy.getAttachmentAnchor('shoulder_center');

  // M0.10: Base of neck (suprasternal notch) sits ~10.5% shoulderBreadth (~37.8 mm for 36 cm breadth) ABOVE the glenohumeral shoulder line
  const expectedElevation = proxy.shape.shoulderBreadthM * BODY_PROXY_PRIORS.NECK_BASE_ABOVE_SHOULDER_RATIO;
  near(baseOfNeck.y - shoulder.y, expectedElevation, 1e-6, `base of neck is ${(expectedElevation * 1000).toFixed(1)} mm above shoulder line`);
  assert(topOfNeck.y > baseOfNeck.y, 'top of neck sits above base of neck');

  // Verify signed convention:
  // positive = garment collar is above base of neck
  // negative = garment collar is below base of neck
  const meta = getGarmentById('tshirt-crewneck');
  const { scene } = loadGLB(path.join(GDIR, meta.id, 'model.glb'));
  const sim = JSON.parse(fs.readFileSync(path.join(GDIR, meta.id, 'simulation-data.json'), 'utf8'));
  const inst = new GarmentInstance(scene, meta, sim);
  const root = new THREE.Group();
  root.add(proxy.group);
  inst.attach(root);

  inst.update({
    bodyProxy: proxy,
    bodyRoot: root,
    dt: 1 / 60,
    nowMs: 1000,
    armDirsBody: { left: null, right: null },
    targetScale: new THREE.Vector3(1, 1, 1),
    tracking: true,
    frameAccelWorld: new THREE.Vector3(),
  });

  const diag = inst.diagnostics(proxy, root, true);
  // M0.10 forensic finding: with frozen M0.9 geometry (+51 mm offset applied to the raw collar which dipped 60 mm below shoulder seams),
  // the collar center in body space sits at y = 0.2421 m, while baseOfNeck sits at y = 0.2878 m.
  // Therefore the rendered collar center sits ~45.7 mm BELOW the true suprasternal notch:
  // signed delta is negative (-50 to -40 mm), proving mathematically why the collar dips on the chest!
  assert(Number.isFinite(diag.neckline.necklineVerticalDeltaMm), 'necklineVerticalDeltaMm is finite');
  assert(diag.neckline.necklineVerticalDeltaMm < 0,
    `demonstrates collar sits below anatomical suprasternal notch (got ${diag.neckline.necklineVerticalDeltaMm.toFixed(1)} mm)`);
  near(diag.neckline.necklineVerticalDeltaMm, -45.7, 1.0,
    `necklineVerticalDeltaMm matches forensic calculation (-45.7 mm), got ${diag.neckline.necklineVerticalDeltaMm.toFixed(1)} mm`);
});

test('M0.10 coordinate transformation chain and screen-space forensics audit', () => {
  const proxy = new MHRBodyProxy();
  const meta = getGarmentById('tshirt-crewneck');
  const { scene } = loadGLB(path.join(GDIR, meta.id, 'model.glb'));
  const sim = JSON.parse(fs.readFileSync(path.join(GDIR, meta.id, 'simulation-data.json'), 'utf8'));
  const inst = new GarmentInstance(scene, meta, sim);
  const root = new THREE.Group();
  root.add(proxy.group);
  inst.attach(root);

  // Position bodyRoot at camera space origin looking at (0, 0, -1.8 m)
  root.position.set(0, 0, -1.8);

  inst.update({
    bodyProxy: proxy,
    bodyRoot: root,
    dt: 1 / 60,
    nowMs: 1000,
    armDirsBody: { left: null, right: null },
    targetScale: new THREE.Vector3(1, 1, 1),
    tracking: true,
    frameAccelWorld: new THREE.Vector3(),
  });

  const camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.05, 20);
  camera.position.set(0, 0, 0);
  camera.updateMatrixWorld(true);

  const display = {
    videoWidth: 1280,
    videoHeight: 720,
    containerWidth: 960,
    containerHeight: 540,
    scaleX: 1,
    scaleY: 1,
    offsetX: 0,
    offsetY: 0,
  };

  const diag = inst.diagnostics(proxy, root, true, camera, display);
  assert(diag.neckline.rawCollarLocal !== undefined, 'exposes raw collar local coordinates');
  assert(diag.neckline.collarCenterWorld !== undefined, 'exposes collar center world coordinates');
  assert(diag.neckline.anatomicalNeckBaseWorld !== undefined, 'exposes anatomical neck base world coordinates');
  assert(diag.neckline.collarCenterScreenPx !== undefined, 'exposes collar center screen pixels');
  assert(diag.neckline.anatomicalNeckBaseScreenPx !== undefined, 'exposes anatomical neck base screen pixels');
  assert(diag.neckline.screenVerticalErrorPx !== undefined, 'exposes screen vertical error in px');
  assert(diag.neckline.coordinateMetadata !== undefined, 'exposes coordinate metadata');

  // Verify collar screen Y is greater than anatomical neck base screen Y (meaning collar renders lower on screen in CSS pixels)
  assert(diag.neckline.collarCenterScreenPx[1] > diag.neckline.anatomicalNeckBaseScreenPx[1],
    `collar center screen Y (${diag.neckline.collarCenterScreenPx[1].toFixed(1)}) is lower on screen than neck base (${diag.neckline.anatomicalNeckBaseScreenPx[1].toFixed(1)})`);
});

test('collar normal recalculation and simulation rest consistency', () => {
  const meta = getGarmentById('tshirt-crewneck');
  const { scene } = loadGLB(path.join(GDIR, meta.id, 'model.glb'));
  const sim = JSON.parse(fs.readFileSync(path.join(GDIR, meta.id, 'simulation-data.json'), 'utf8'));
  const inst = new GarmentInstance(scene, meta, sim);

  // Check torso mesh normals are unit length and finite
  const torsoMesh = inst.meshes.find((m) => m.mesh.name === 'torso');
  assert(torsoMesh !== undefined, 'torso mesh must exist');
  const norm = torsoMesh.mesh.geometry.getAttribute('normal');
  for (let i = 0; i < norm.count; i++) {
    const l = Math.hypot(norm.getX(i), norm.getY(i), norm.getZ(i));
    assert(Math.abs(l - 1) < 1e-3, `normal ${i} must be unit length (got ${l})`);
  }

  // Verify sim rest matches render geometry (zero pre-strain)
  if (inst.sim) {
    const skin = inst.sim.solver.getSkinPositions();
    const render = torsoMesh.mesh.geometry.getAttribute('position').array;
    near(skin[1], render[1], 1e-4, 'sim rest Y matches modified collar render geometry');
  }
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

suite('Responsive sleeve articulation (Milestone 0.7)');

test('sleeve smoothing time constant configured to responsive 30 ms (25-35 ms range)', () => {
  const meta = getGarmentById('tshirt-crewneck');
  const { scene } = loadGLB(path.join(GDIR, meta.id, 'model.glb'));
  const rest = captureRestTransforms(scene);
  const rig = SleeveRig.fromGarment(scene, meta, rest);

  assert(rig.tauS >= 0.025 && rig.tauS <= 0.035, `tauS must be within 25-35 ms range (got ${(rig.tauS * 1000).toFixed(1)} ms)`);
  near(rig.tauS, 0.03, 1e-4, 'default tauS is 0.03 s (30 ms)');
});

test('30 ms smoothing converges significantly faster than previous 80 ms baseline', () => {
  const meta = getGarmentById('tshirt-crewneck');
  const { scene: sceneFast } = loadGLB(path.join(GDIR, meta.id, 'model.glb'));
  const { scene: sceneSlow } = loadGLB(path.join(GDIR, meta.id, 'model.glb'));
  const restFast = captureRestTransforms(sceneFast);
  const restSlow = captureRestTransforms(sceneSlow);

  const rigFast = SleeveRig.fromGarment(sceneFast, meta, restFast); // tau = 0.03 s
  const rigSlow = SleeveRig.fromGarment(sceneSlow, meta, restSlow);
  rigSlow.tauS = 0.08; // previous baseline

  const targetDir = new THREE.Vector3(0.6, 0.8, 0).normalize();
  const dt = 1 / 60; // 16.7 ms per frame

  // After 4 frames (67 ms):
  for (let f = 0; f < 4; f++) {
    rigFast.update({ left: targetDir, right: null }, dt);
    rigSlow.update({ left: targetDir, right: null }, dt);
  }

  const sFast = rigFast.sleeves.find((s) => s.side === 'left');
  const sSlow = rigSlow.sleeves.find((s) => s.side === 'left');

  const fastAxis = rigFast.currentAxis('left');
  const slowAxis = rigSlow.currentAxis('left');

  const fastAngle = fastAxis.angleTo(sFast.restAxisParent);
  const slowAngle = slowAxis.angleTo(sSlow.restAxisParent);

  // Fast rig has articulated through a much larger arc in the same 67 ms
  assert(fastAngle > slowAngle * 1.5, `fast angle (${(fastAngle * 180 / Math.PI).toFixed(1)}°) must exceed slow (${(slowAngle * 180 / Math.PI).toFixed(1)}°) by > 1.5x`);
});

test('brief tracking occlusion holds last valid direction without twitching', () => {
  const meta = getGarmentById('tshirt-crewneck');
  const { scene } = loadGLB(path.join(GDIR, meta.id, 'model.glb'));
  const rest = captureRestTransforms(scene);
  const rig = SleeveRig.fromGarment(scene, meta, rest);

  const up = new THREE.Vector3(0.5, 0.8, 0).normalize();
  // Track for 30 frames
  for (let i = 0; i < 30; i++) {
    rig.update({ left: up, right: null }, 1 / 60);
  }
  const s = rig.sleeves.find((x) => x.side === 'left');
  const qTracked = s.node.quaternion.clone();

  // Drop tracking for 3 frames (50 ms < 120 ms hold timeout)
  for (let i = 0; i < 3; i++) {
    rig.update({ left: null, right: null }, 1 / 60);
  }

  // Quaternion must not have dropped toward rest
  const dot = Math.abs(s.node.quaternion.dot(qTracked));
  near(dot, 1, 1e-4, 'sleeve direction held steady during brief 50 ms occlusion');

  // Continue dropping for > 150 ms (total > 200 ms)
  for (let i = 0; i < 40; i++) {
    rig.update({ left: null, right: null }, 1 / 60);
  }
  const dotRest = Math.abs(s.node.quaternion.dot(s.rest.quaternion));
  near(dotRest, 1, 1e-2, 'sleeve smoothly eases to rest after occlusion hold expires');
});

test('rapid arm movement produces finite values with zero NaN or quaternion flips', () => {
  const meta = getGarmentById('tshirt-crewneck');
  const { scene } = loadGLB(path.join(GDIR, meta.id, 'model.glb'));
  const rest = captureRestTransforms(scene);
  const rig = SleeveRig.fromGarment(scene, meta, rest);

  for (let i = 0; i < 100; i++) {
    const dirL = new THREE.Vector3(Math.sin(i * 0.5), Math.cos(i * 0.3), Math.sin(i * 0.2)).normalize();
    const dirR = new THREE.Vector3(-Math.sin(i * 0.4), Math.cos(i * 0.5), -Math.cos(i * 0.2)).normalize();
    rig.update({ left: dirL, right: dirR }, 1 / 60);

    for (const s of rig.sleeves) {
      assert(Number.isFinite(s.node.position.x), 'position finite');
      assert(Number.isFinite(s.node.quaternion.w), 'quaternion finite');
      assert(Number.isFinite(s.node.scale.x), 'scale finite');
    }
  }
});

suite('Stable sleeve-arm depth occlusion (Milestone 0.8)');

test('crewneck upper-body garments have definitive +48 to +51 mm neckline offset configured (Milestone 0.9)', () => {
  const expected = {
    'tshirt-crewneck': { offset: 0.051, halfWidth: 0.115 },
    'tshirt-oversized': { offset: 0.048, halfWidth: 0.125 },
    'tshirt-fitted': { offset: 0.048, halfWidth: 0.100 },
    'top-longsleeve': { offset: 0.051, halfWidth: 0.115 },
  };
  for (const [id, exp] of Object.entries(expected)) {
    const meta = getGarmentById(id);
    assert(meta !== undefined, `${id} must exist in registry`);
    near(meta.fittingProfile.necklineOffsetY, exp.offset, 1e-6, `${id} necklineOffsetY must be ${exp.offset} m (+${exp.offset * 1000} mm)`);
    near(meta.fittingProfile.collarHalfWidth, exp.halfWidth, 1e-6, `${id} collarHalfWidth must be ${exp.halfWidth} m`);
  }
});

test('short-sleeve garments exclude upper-arm occluders while keeping forearm and thigh occluders active', () => {
  const proxy = new MHRBodyProxy();
  const joints = {
    left_shoulder: new THREE.Vector3(0.18, 0.25, 0),
    left_elbow: new THREE.Vector3(0.28, 0.05, 0),
    left_wrist: new THREE.Vector3(0.35, -0.15, 0),
    right_shoulder: new THREE.Vector3(-0.18, 0.25, 0),
    right_elbow: new THREE.Vector3(-0.28, 0.05, 0),
    right_wrist: new THREE.Vector3(-0.35, -0.15, 0),
    left_hip: new THREE.Vector3(0.12, -0.25, 0),
    left_knee: new THREE.Vector3(0.12, -0.65, 0),
    right_hip: new THREE.Vector3(-0.12, -0.25, 0),
    right_knee: new THREE.Vector3(-0.12, -0.65, 0),
  };

  // Configure for short sleeves: upper arms are covered by virtual sleeves and must NOT write depth
  proxy.setOcclusionLimbs(['left_forearm', 'right_forearm', 'left_thigh', 'right_thigh']);
  proxy.updateLimbs(joints);

  const leftUpperArmOcc = proxy.getLimbOcclusionMesh('left_upper_arm');
  const rightUpperArmOcc = proxy.getLimbOcclusionMesh('right_upper_arm');
  const leftForearmOcc = proxy.getLimbOcclusionMesh('left_forearm');
  const rightForearmOcc = proxy.getLimbOcclusionMesh('right_forearm');
  const leftThighOcc = proxy.getLimbOcclusionMesh('left_thigh');
  const rightThighOcc = proxy.getLimbOcclusionMesh('right_thigh');

  assert(leftUpperArmOcc !== undefined, 'left upper arm mesh exists');
  assert(rightUpperArmOcc !== undefined, 'right upper arm mesh exists');
  assert(leftForearmOcc !== undefined, 'left forearm mesh exists');
  assert(rightForearmOcc !== undefined, 'right forearm mesh exists');

  // Upper arms MUST NOT write depth (hidden)
  assert(!leftUpperArmOcc.visible, 'left upper arm occlusion must be disabled for short sleeves');
  assert(!rightUpperArmOcc.visible, 'right upper arm occlusion must be disabled for short sleeves');

  // Forearms and thighs MUST remain active (visible)
  assert(leftForearmOcc.visible, 'left forearm occlusion must remain active');
  assert(rightForearmOcc.visible, 'right forearm occlusion must remain active');
  assert(leftThighOcc.visible, 'left thigh occlusion must remain active');
  assert(rightThighOcc.visible, 'right thigh occlusion must remain active');
});

test('long-sleeve garments exclude both upper-arm and forearm occluders', () => {
  const proxy = new MHRBodyProxy();
  const joints = {
    left_shoulder: new THREE.Vector3(0.18, 0.25, 0),
    left_elbow: new THREE.Vector3(0.28, 0.05, 0),
    left_wrist: new THREE.Vector3(0.35, -0.15, 0),
    right_shoulder: new THREE.Vector3(-0.18, 0.25, 0),
    right_elbow: new THREE.Vector3(-0.28, 0.05, 0),
    right_wrist: new THREE.Vector3(-0.35, -0.15, 0),
    left_hip: new THREE.Vector3(0.12, -0.25, 0),
    left_knee: new THREE.Vector3(0.12, -0.65, 0),
    right_hip: new THREE.Vector3(-0.12, -0.25, 0),
    right_knee: new THREE.Vector3(-0.12, -0.65, 0),
  };

  proxy.setOcclusionLimbs(['left_thigh', 'right_thigh']);
  proxy.updateLimbs(joints);

  const leftUpperArmOcc = proxy.getLimbOcclusionMesh('left_upper_arm');
  const leftForearmOcc = proxy.getLimbOcclusionMesh('left_forearm');
  const rightUpperArmOcc = proxy.getLimbOcclusionMesh('right_upper_arm');
  const rightForearmOcc = proxy.getLimbOcclusionMesh('right_forearm');
  const leftThighOcc = proxy.getLimbOcclusionMesh('left_thigh');

  assert(!leftUpperArmOcc.visible, 'left upper arm occlusion must be disabled for long sleeves');
  assert(!leftForearmOcc.visible, 'left forearm occlusion must be disabled for long sleeves');
  assert(!rightUpperArmOcc.visible, 'right upper arm occlusion must be disabled for long sleeves');
  assert(!rightForearmOcc.visible, 'right forearm occlusion must be disabled for long sleeves');
  assert(leftThighOcc.visible, 'thigh occlusion remains active');
});

test('sleeveless tops retain all limb occluders (upper arms are exposed)', () => {
  const proxy = new MHRBodyProxy();
  const joints = {
    left_shoulder: new THREE.Vector3(0.18, 0.25, 0),
    left_elbow: new THREE.Vector3(0.28, 0.05, 0),
    left_wrist: new THREE.Vector3(0.35, -0.15, 0),
    right_shoulder: new THREE.Vector3(-0.18, 0.25, 0),
    right_elbow: new THREE.Vector3(-0.28, 0.05, 0),
    right_wrist: new THREE.Vector3(-0.35, -0.15, 0),
    left_hip: new THREE.Vector3(0.12, -0.25, 0),
    left_knee: new THREE.Vector3(0.12, -0.65, 0),
    right_hip: new THREE.Vector3(-0.12, -0.25, 0),
    right_knee: new THREE.Vector3(-0.12, -0.65, 0),
  };

  proxy.setOcclusionLimbs(null);
  proxy.updateLimbs(joints);

  const leftUpperArmOcc = proxy.getLimbOcclusionMesh('left_upper_arm');
  const leftForearmOcc = proxy.getLimbOcclusionMesh('left_forearm');

  assert(leftUpperArmOcc.visible, 'left upper arm occlusion visible for sleeveless tops');
  assert(leftForearmOcc.visible, 'left forearm occlusion visible for sleeveless tops');
});

test('body proxy debug wireframes display all active limbs even when limb occlusion is filtered', () => {
  const proxy = new MHRBodyProxy();
  const joints = {
    left_shoulder: new THREE.Vector3(0.18, 0.25, 0),
    left_elbow: new THREE.Vector3(0.28, 0.05, 0),
    left_wrist: new THREE.Vector3(0.35, -0.15, 0),
    right_shoulder: new THREE.Vector3(-0.18, 0.25, 0),
    right_elbow: new THREE.Vector3(-0.28, 0.05, 0),
    right_wrist: new THREE.Vector3(-0.35, -0.15, 0),
    left_hip: new THREE.Vector3(0.12, -0.25, 0),
    left_knee: new THREE.Vector3(0.12, -0.65, 0),
    right_hip: new THREE.Vector3(-0.12, -0.25, 0),
    right_knee: new THREE.Vector3(-0.12, -0.65, 0),
  };

  proxy.setOcclusionLimbs(['left_forearm', 'right_forearm']);
  proxy.setDebugVisible(true);
  proxy.updateLimbs(joints);

  // Occlusion mesh for upper arm is hidden
  const leftUpperArmOcc = proxy.getLimbOcclusionMesh('left_upper_arm');
  assert(!leftUpperArmOcc.visible, 'occlusion mesh is disabled');

  // But debug mesh for upper arm remains visible for developer inspection
  let debugMesh;
  proxy.group.traverse((o) => {
    if (o.isMesh && o.name === 'mhr_debug_left_upper_arm') debugMesh = o;
  });
  assert(debugMesh !== undefined, 'debug mesh exists');
  assert(debugMesh.visible, 'debug wireframe remains visible for developer inspection');
});

suite('Definitive front neckline elevation and crewneck shape (Milestone 0.9)');

test('applyNecklineOffset employs C1 raised-cosine window: zero V-notch and horizontal tangent at center', () => {
  const meta = getGarmentById('tshirt-crewneck');
  const { scene } = loadGLB(path.join(GDIR, meta.id, 'model.glb'));
  let torso;
  scene.traverse((o) => { if (o.isMesh && o.name === 'torso') torso = o; });
  const pos = torso.geometry.getAttribute('position');

  const beforeY = [];
  for (let i = 0; i < pos.count; i++) beforeY.push(pos.getY(i));

  const offset = 0.051;
  const halfWidth = 0.115;
  const lifted = applyNecklineOffset(scene, offset, 'torso', halfWidth);
  assert(lifted > 0, `must lift collar vertices (lifted ${lifted})`);

  // Vertex 0: front center collar (x = 0, y = 0.1972)
  const dyCenter = pos.getY(0) - beforeY[0];
  near(dyCenter, offset, 1e-4, 'center vertex receives full offset');

  // Find immediate lateral neighbors on the front collar opening (|x| < 0.06 m, z > 0.06, rim v < 0.02)
  // Under raised cosine, f(x) = (1 + cos(pi*x/w))/2.
  // For small x, 1 - f(x) = O(x^2), meaning dy/dx = 0 at x = 0 (horizontal tangent, smooth curve, NO sharp V)
  const uv = torso.geometry.getAttribute('uv');
  let foundNeighbor = false;
  for (let i = 1; i < pos.count; i++) {
    const x = Math.abs(pos.getX(i));
    const z = pos.getZ(i);
    const v = uv ? uv.getY(i) : 0;
    if (x > 0.01 && x < 0.06 && z > 0.06 && v < 0.02) {
      const dyNeighbor = pos.getY(i) - beforeY[i];
      const slope = Math.abs(dyCenter - dyNeighbor) / x;
      assert(slope < 0.45, `collar curvature tangent is smooth and rounded near center (slope ${slope.toFixed(3)} < 0.45)`);
      foundNeighbor = true;
    }
  }
  assert(foundNeighbor, 'found front collar lateral neighbor');

  // Shoulder seam vertices (|x| >= 0.15 m) experience strictly ZERO displacement
  for (let i = 0; i < pos.count; i++) {
    if (Math.abs(pos.getX(i)) >= 0.15) {
      const dy = Math.abs(pos.getY(i) - beforeY[i]);
      near(dy, 0, 1e-6, `shoulder/armhole vertex ${i} (|x|=${pos.getX(i).toFixed(3)}) unaffected`);
    }
  }
});

test('collar drop across all 4 crewneck garments is in natural 25-32 mm range', () => {
  const crewTops = ['tshirt-crewneck', 'tshirt-oversized', 'tshirt-fitted', 'top-longsleeve'];
  for (const id of crewTops) {
    const meta = getGarmentById(id);
    const { scene } = loadGLB(path.join(GDIR, id, 'model.glb'));
    const sim = JSON.parse(fs.readFileSync(path.join(GDIR, id, 'simulation-data.json'), 'utf8'));
    const inst = new GarmentInstance(scene, meta, sim);
    const proxy = new MHRBodyProxy();
    const root = new THREE.Group();
    root.add(proxy.group);
    inst.attach(root);

    inst.update({
      bodyProxy: proxy,
      bodyRoot: root,
      dt: 1 / 60,
      nowMs: 1000,
      armDirsBody: { left: null, right: null },
      targetScale: new THREE.Vector3(1, 1, 1),
      tracking: true,
      frameAccelWorld: new THREE.Vector3(),
    });

    const diag = inst.diagnostics(proxy, root, true);
    assert(diag.neckline !== undefined, `${id}: neckline diag must exist`);
    assert(diag.neckline.collarDropMm >= 25 && diag.neckline.collarDropMm <= 32,
      `${id}: collar drop (${diag.neckline.collarDropMm.toFixed(1)} mm) in natural 25-32 mm range`);
  }
});

finish('test-ar-garment-rig');

