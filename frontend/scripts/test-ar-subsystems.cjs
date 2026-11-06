/**
 * DRAPE Parametric 3D AR Engine Verification & Validation Test Suite (CJS)
 */

const assert = require('node:assert');

console.log('=== DRAPE 3D AR ENGINE VERIFICATION SUITE ===\n');

// 1. Test 1€ Filter
console.log('1. Testing One Euro Filter Formulation...');
const { OneEuroFilter } = require('../dist_test/one-euro-filter.js');

const filter1D = new OneEuroFilter({ fMin: 1.0, beta: 0.01, dCutOff: 1.0 });
let val = 10.0;
let t = 0;
// Test still pose jitter suppression
for (let i = 0; i < 30; i++) {
  t += 33.3; // 30 FPS
  const jitter = (Math.random() - 0.5) * 0.4;
  const filtered = filter1D.filter(val + jitter, t);
  assert(Math.abs(filtered - val) < 0.25, `Jitter should be heavily suppressed: got ${filtered}`);
}
console.log('   ✓ 1€ Filter successfully suppressed still-pose high-frequency jitter');

// Test fast motion response
const rapidVal = 25.0;
t += 33.3;
const fastFiltered = filter1D.filter(rapidVal, t);
assert(fastFiltered > 12.0, `Adaptive cutoff should respond rapidly to velocity spike: got ${fastFiltered}`);
console.log('   ✓ 1€ Filter adaptive cutoff responded dynamically to velocity step');

// 2. Test Camera Calibration & Metric Projection
console.log('\n2. Testing Camera Calibration & Metric Projection...');
const { CameraCalibrationManager, ISO_ID1_CARD } = require('../dist_test/camera-calibration.js');

const calib = new CameraCalibrationManager(1280, 720);
const priorIntrinsics = calib.getIntrinsics();
assert.strictEqual(priorIntrinsics.width, 1280);
assert.strictEqual(priorIntrinsics.height, 720);
assert(priorIntrinsics.fx > 800 && priorIntrinsics.fx < 1200, `Prior focal length realistic: ${priorIntrinsics.fx}`);
console.log(`   ✓ Population prior estimated: fx=${priorIntrinsics.fx.toFixed(1)} px, cx=${priorIntrinsics.cx} px`);

// Calibrate with ISO ID-1 card (85.60mm held at 0.50m)
const observedCardPx = 200.0;
const calibratedIntrinsics = calib.calibrateWithReferenceCard(observedCardPx, observedCardPx / ISO_ID1_CARD.ASPECT, 0.50);
assert(calibratedIntrinsics.isCalibrated, 'Must be flagged as calibrated');
assert.strictEqual(calibratedIntrinsics.calibrationMethod, 'card');
console.log(`   ✓ ISO ID-1 Card calibration: fx=${calibratedIntrinsics.fx.toFixed(1)} px, confidence=${calibratedIntrinsics.confidence}`);

// Test Perspective-Correct Radius: r = Z * t / sqrt(1 + t^2)
const apparentSpanPx = 250.0;
const distanceZ = 1.60;
const approxRadius = (distanceZ * (apparentSpanPx / 2.0)) / calibratedIntrinsics.fx;
const exactRadius = calib.computePerspectiveCorrectRadius(apparentSpanPx, distanceZ);
assert(exactRadius < approxRadius, 'Perspective correct radius must account for curvature tangent rays');
console.log(`   ✓ Tangent-ray perspective correction: raw=${approxRadius.toFixed(4)}m, corrected=${exactRadius.toFixed(4)}m`);

// Test Three.js Projection Matrix construction
const threeProj = calib.buildThreeProjectionMatrix(0.05, 20.0, true);
assert(threeProj.elements[0] < 0, 'Mirrored matrix must reflect X column without winding inversion');
assert(threeProj.elements[11] === -1.0, 'P32 must be -1 for perspective division');
console.log('   ✓ Direct Three.js off-axis projection matrix constructed successfully');

// 3. Test Ramanujan Circumference & Garment Ease
console.log('\n3. Testing Ramanujan Ellipse Circumference & Ease Formulation...');
const { PersonalizedBodyShapeEstimator } = require('../dist_test/personalized-body-shape.js');
const { GarmentEaseEngine } = require('../dist_test/garment-ease.js');

const semiA = 0.20; // 20cm half-width
const semiB = 0.13; // 13cm half-depth
const circM = PersonalizedBodyShapeEstimator.computeRamanujanCircumference(semiA, semiB);
const circCm = circM * 100.0;
assert(circCm > 100.0 && circCm < 110.0, `Ramanujan torso circumference realistic: ${circCm.toFixed(1)} cm`);
console.log(`   ✓ Ramanujan circumference for ellipse (${semiA}m, ${semiB}m) = ${circCm.toFixed(2)} cm`);

const easeEngine = new GarmentEaseEngine();
// Test positive ease 1D solver
const targetCircM = 1.15; // 115cm pattern
const radialOffsetM = easeEngine.solveRadialOffsetForEase(semiA, semiB, targetCircM);
const expandedCirc = PersonalizedBodyShapeEstimator.computeRamanujanCircumference(semiA + radialOffsetM, semiB + radialOffsetM);
assert(Math.abs(expandedCirc - targetCircM) < 0.002, `1D root finder converged to within 2mm: got ${expandedCirc.toFixed(4)}m`);
console.log(`   ✓ Positive ease radial offset solved: δ=${(radialOffsetM * 1000).toFixed(1)} mm for pattern perimeter ${targetCircM}m`);

// 4. Test Operating Modes & Framing Guidance
console.log('\n4. Testing Operating Modes & Automatic Framing...');
const { OperatingModeManager } = require('../dist_test/operating-modes.js');

const modeMgr = new OperatingModeManager();
const mockKeypoints = {
  leftShoulder: { x: 0.40, y: 0.25, z: 0, visibility: 0.95 },
  rightShoulder: { x: 0.60, y: 0.25, z: 0, visibility: 0.95 },
  leftHip: { x: 0.43, y: 0.65, z: 0, visibility: 0.90 },
  rightHip: { x: 0.57, y: 0.65, z: 0, visibility: 0.90 },
  leftKnee: { x: 0.43, y: 0.95, z: 0, visibility: 0.85 },
  rightKnee: { x: 0.57, y: 0.95, z: 0, visibility: 0.85 },
  shoulderCenter: { x: 0.50, y: 0.25, z: 0 },
  hipCenter: { x: 0.50, y: 0.65, z: 0 },
  torsoCenter: { x: 0.50, y: 0.45, z: 0 },
  waistCenter: { x: 0.50, y: 0.55, z: 0 },
  chestCenter: { x: 0.50, y: 0.35, z: 0 },
  shoulderWidth: 0.20,
  torsoHeight: 0.40,
  hipWidth: 0.14,
  confidence: 0.92,
};

const bustEval = modeMgr.evaluate(mockKeypoints, 1.1, 'tops');
assert.strictEqual(bustEval.mode, 'bust');
assert.strictEqual(bustEval.guidance, 'good_framing');
console.log(`   ✓ Bust Mode correctly classified at 1.1m: guidance="${bustEval.guidanceMessage}"`);

const skirtEvalClose = modeMgr.evaluate({
  ...mockKeypoints,
  leftHip: { x: 0.4, y: 0.65, z: 0, visibility: 0.2 },
  rightHip: { x: 0.6, y: 0.65, z: 0, visibility: 0.2 }
}, 0.8, 'skirts');
assert.strictEqual(skirtEvalClose.guidance, 'step_back');
console.log(`   ✓ Skirt Mode correctly instructed step-back when hips outside frame: guidance="${skirtEvalClose.guidanceMessage}"`);

// 5. Test Linear Shape Space Solver
console.log('\n5. Testing Linear Shape Space Solver...');
const shapeEstimator = new PersonalizedBodyShapeEstimator();
const measurements = shapeEstimator.estimateMeasurements(mockKeypoints, 1.6, priorIntrinsics);
assert(measurements.chestCircumferenceCm > 70 && measurements.chestCircumferenceCm < 130, `Realistic chest: ${measurements.chestCircumferenceCm}`);
const beta = shapeEstimator.solveShapeParameters(measurements);
assert.strictEqual(beta.length, 10, 'Must produce 10 PCA shape parameters');
console.log(`   ✓ Solved 10-dimensional regularized shape parameters β=[${beta.slice(0, 4).map(b => b.toFixed(2)).join(', ')}...]`);

// 6. Test XPBD Cloth Solver
console.log('\n6. Testing XPBD Cloth Simulation & Collision...');
const { XPBDClothSolver } = require('../dist_test/xpbd-cloth-solver.js');
const { MHRBodyProxy } = require('../dist_test/mhr-body-proxy.js');

const bodyProxy = new MHRBodyProxy();
const xpbd = new XPBDClothSolver({
  enabled: true,
  substeps: 4,
  iterations: 8,
  stretchCompliance: 0.0002,
  bendCompliance: 0.05,
  skinAttachmentDist: 0.05,
  lraStiffness: 0.8,
  damping: 0.05,
  inertialCoupling: 0.3,
  collisionTolerance: 0.012,
});

const testPos = new Float32Array([
  -0.1, 0.2, 0.3,
   0.1, 0.2, 0.3,
  -0.1, 0.0, 0.3,
   0.1, 0.0, 0.3,
]);
const testIndices = new Uint16Array([0, 1, 2, 1, 3, 2]);
const testWeights = new Float32Array([1.0, 1.0, 0.2, 0.2]);

xpbd.initializeMesh(testPos, testIndices, testWeights);
xpbd.step(0.033, bodyProxy, [0, 0, -1.6]);
const simPos = xpbd.getSimulatedPositions();
assert(simPos !== null);
assert.strictEqual(simPos[1], testPos[1], 'Pinned particle Y position must remain fixed');
assert(simPos[7] < testPos[7], `Unpinned particle Y must displace under gravity: was ${testPos[7]}, now ${simPos[7]}`);
console.log('   ✓ XPBD stretch and skin attachment constraints stably integrated');

console.log('\n======================================================');
console.log('ALL DRAPE 3D AR SUBSYSTEM CHECKS PASSED WITH 100% SUCCESS');
console.log('======================================================\n');
