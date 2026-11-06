/**
 * DRAPE Camera Projection Matrix Verification Test
 *
 * Verifies that 3D points (X, Y, -d) in camera space projected through
 * CameraCalibrationManager.buildThreeProjectionMatrix() project exactly
 * to the expected 2D pinhole pixel coordinates (u, v) in both standard
 * and mirrored modes with sub-millimeter precision.
 */

const THREE = require('three');
const path = require('path');
const { CameraCalibrationManager } = require('../dist_test/camera-calibration.js');

console.log('=== DRAPE CAMERA PROJECTION MATRIX TEST ===\n');

function runProjectionTest() {
  const calib = new CameraCalibrationManager(1280, 720);
  const intrinsics = calib.getIntrinsics();

  const testConfigs = [
    { name: 'Standard Symmetric (isMirrored: false)', mirrored: false, cxOff: 0, cyOff: 0 },
    { name: 'Mirrored Symmetric (isMirrored: true)', mirrored: true, cxOff: 0, cyOff: 0 },
    { name: 'Mirrored Off-Axis (cx+35px, cy-25px)', mirrored: true, cxOff: 35, cyOff: -25 },
    { name: 'Standard Off-Axis (cx+35px, cy-25px)', mirrored: false, cxOff: 35, cyOff: -25 },
  ];

  for (const cfg of testConfigs) {
    const cx = intrinsics.width / 2 + cfg.cxOff;
    const cy = intrinsics.height / 2 + cfg.cyOff;
    calib.setIntrinsics({ cx, cy });
    const currentIntrinsics = calib.getIntrinsics();

    const projMatrix = calib.buildThreeProjectionMatrix(0.05, 20.0, cfg.mirrored);

    // Test a grid of 3D points in front of the camera (depth d from 0.8m to 2.5m)
    const testPoints = [
      { x: 0.0, y: 0.0, z: -1.5 },
      { x: 0.22, y: 0.15, z: -1.2 },
      { x: -0.22, y: -0.20, z: -1.8 },
      { x: 0.35, y: -0.40, z: -2.2 },
    ];

    for (const pt of testPoints) {
      const d = -pt.z;
      // Theoretical pinhole projection:
      let expectedU = currentIntrinsics.fx * (pt.x / d) + currentIntrinsics.cx;
      if (cfg.mirrored) {
        expectedU = currentIntrinsics.width - expectedU;
      }
      const expectedV = -currentIntrinsics.fy * (pt.y / d) + currentIntrinsics.cy;

      // Three.js matrix projection:
      const v3 = new THREE.Vector3(pt.x, pt.y, pt.z);
      v3.applyMatrix4(projMatrix);

      // Map NDC [-1, 1] to screen pixels [0, W] x [0, H]
      const screenX = (v3.x * 0.5 + 0.5) * intrinsics.width;
      const screenY = (-v3.y * 0.5 + 0.5) * intrinsics.height;

      const deltaX = Math.abs(screenX - expectedU);
      const deltaY = Math.abs(screenY - expectedV);

      if (deltaX > 0.001 || deltaY > 0.001) {
        console.error(`❌ FAILED on ${cfg.name} for point (${pt.x}, ${pt.y}, ${pt.z})`);
        console.error(`   Expected: (${expectedU.toFixed(2)}, ${expectedV.toFixed(2)})`);
        console.error(`   Screen:   (${screenX.toFixed(2)}, ${screenY.toFixed(2)})`);
        console.error(`   Delta:    (${deltaX.toFixed(4)}, ${deltaY.toFixed(4)})`);
        process.exit(1);
      }
    }

    console.log(`✓ ${cfg.name}: All test points projected with zero error (max delta < 0.001 px)`);
  }

  console.log('\n✅ ALL CAMERA PROJECTION MATRIX CHECKS PASSED');
}

runProjectionTest();
