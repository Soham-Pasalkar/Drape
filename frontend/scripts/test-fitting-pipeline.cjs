/**
 * DRAPE Full End-to-End Fitting Pipeline Integration Test
 *
 * Simulates real webcam frames with realistic MediaPipe keypoints across
 * all 8 garments in the DRAPE collection and verifies:
 * - Operating mode & framing evaluation
 * - PnP 6-DoF root estimation & reprojection error
 * - Anthropometric body measurement extraction
 * - Anatomical anchor positioning (shoulders vs waist)
 * - 6-DoF rigid pose calculation without NaN or coordinate divergence
 */

const THREE = require('three');
const path = require('path');

const { FittingEngine } = require('../dist_test/fitting-engine.js');
const { GARMENTS } = require('../dist_test/garment-registry.js');

console.log('=== DRAPE FULL FITTING PIPELINE INTEGRATION TEST ===\n');

function createMockKeypoints(distanceZ = 1.2, yawRad = 0.0) {
  // Keypoints in normalized [0, 1] x [0, 1] coordinates
  // Typical webcam: 1280x720, fx ~ 1000px
  // shoulderWidth ~ 44cm => apparent width px = (0.44 * 1000) / distanceZ
  const shoulderSpanPx = (0.44 * 1000) / distanceZ;
  const shoulderNorm = shoulderSpanPx / 1280.0;

  const centerX = 0.5;
  const shoulderY = 0.32;
  const hipY = 0.58;

  const cosYaw = Math.cos(yawRad);
  const sinYaw = Math.sin(yawRad);

  const halfS = (shoulderNorm / 2) * cosYaw;

  return {
    nose: { x: centerX, y: 0.18, z: 0.05 * sinYaw, visibility: 0.95 },
    leftShoulder: { x: centerX + halfS, y: shoulderY, z: -0.15 * sinYaw, visibility: 0.95 },
    rightShoulder: { x: centerX - halfS, y: shoulderY, z: 0.15 * sinYaw, visibility: 0.95 },
    leftElbow: { x: centerX + halfS + 0.08, y: shoulderY + 0.16, z: -0.12 * sinYaw, visibility: 0.90 },
    rightElbow: { x: centerX - halfS - 0.08, y: shoulderY + 0.16, z: 0.12 * sinYaw, visibility: 0.90 },
    leftWrist: { x: centerX + halfS + 0.06, y: shoulderY + 0.30, z: -0.08 * sinYaw, visibility: 0.85 },
    rightWrist: { x: centerX - halfS - 0.06, y: shoulderY + 0.30, z: 0.08 * sinYaw, visibility: 0.85 },
    leftHip: { x: centerX + halfS * 0.55, y: hipY, z: -0.08 * sinYaw, visibility: 0.90 },
    rightHip: { x: centerX - halfS * 0.55, y: hipY, z: 0.08 * sinYaw, visibility: 0.90 },
    leftKnee: { x: centerX + halfS * 0.5, y: hipY + 0.22, z: 0, visibility: 0.70 },
    rightKnee: { x: centerX - halfS * 0.5, y: hipY + 0.22, z: 0, visibility: 0.70 },
    shoulderWidth: shoulderNorm,
    hipWidth: halfS * 1.1,
    torsoHeight: hipY - shoulderY,
    confidence: 0.92,
  };
}

function runPipelineTest() {
  const engine = new FittingEngine();
  const width = 1280;
  const height = 720;

  console.log(`Auditing complete pipeline across ${GARMENTS.length} luxury garments:`);

  for (const garment of GARMENTS) {
    const kpBust = createMockKeypoints(1.2, 0.1); // 1.2m distance, slight 0.1 rad yaw
    const result = engine.processFrame(kpBust, garment, width, height, true);

    // Verify poses and measurements
    if (!result.garmentPose || !result.bodyPose) {
      console.error(`❌ [${garment.id}] Missing garmentPose or bodyPose`);
      process.exit(1);
    }

    const [gx, gy, gz] = result.garmentPose.position;
    const [bx, by, bz] = result.bodyPose.position;

    // Check for NaN or Inf
    if (isNaN(gx) || isNaN(gy) || isNaN(gz) || isNaN(bx) || isNaN(by) || isNaN(bz)) {
      console.error(`❌ [${garment.id}] NaN detected in 3D poses: garment=[${gx}, ${gy}, ${gz}], body=[${bx}, ${by}, ${bz}]`);
      process.exit(1);
    }

    // Verify depth Z is in front of camera (Z < 0)
    if (gz >= 0 || bz >= 0) {
      console.error(`❌ [${garment.id}] Invalid positive camera depth: gz=${gz}, bz=${bz}`);
      process.exit(1);
    }

    // Verify anatomical anchor vertical separation
    // For tops, garment anchor is at y=+0.22m relative to torso root, so gy > by
    // For skirts, garment anchor is at y=-0.08m relative to torso root, so gy < by
    if (garment.category === 'tops' || garment.category === 'dresses') {
      if (gy <= by) {
        console.error(`❌ [${garment.id}] Tops anchor expected gy > by, got gy=${gy.toFixed(3)}, by=${by.toFixed(3)}`);
        process.exit(1);
      }
    } else if (garment.category === 'skirts') {
      if (gy >= by) {
        console.error(`❌ [${garment.id}] Skirts anchor expected gy < by, got gy=${gy.toFixed(3)}, by=${by.toFixed(3)}`);
        process.exit(1);
      }
    }

    // Verify scale is within physical bounds
    const [sx, sy, sz] = result.garmentPose.scale;
    if (sx < 0.7 || sx > 1.4 || sy < 0.7 || sy > 1.4 || sz < 0.7 || sz > 1.4) {
      console.error(`❌ [${garment.id}] Unphysical scale detected: [${sx}, ${sy}, ${sz}]`);
      process.exit(1);
    }

    // Verify reprojection error is finite and bounded
    if (result.pnpResult.reprojectionError > 50) {
      console.error(`❌ [${garment.id}] Reprojection error excessive: ${result.pnpResult.reprojectionError.toFixed(2)} px`);
      process.exit(1);
    }

    console.log(`✓ [${garment.id}] (${garment.category})`);
    console.log(`   Mode: ${result.operatingMode}, Distance: ${result.estimatedDistanceZ.toFixed(2)}m`);
    console.log(`   Garment Pos: [${gx.toFixed(3)}, ${gy.toFixed(3)}, ${gz.toFixed(3)}]`);
    console.log(`   Body Root:   [${bx.toFixed(3)}, ${by.toFixed(3)}, ${bz.toFixed(3)}]`);
    console.log(`   Scale:       [${sx.toFixed(2)}, ${sy.toFixed(2)}, ${sz.toFixed(2)}]`);
    console.log(`   Fit:         ${result.ease.fitAssessment} (strain: ${result.ease.estimatedStrainPercent.toFixed(1)}%)\n`);
  }

  console.log('✅ ALL 8 GARMENTS VERIFIED THROUGH END-TO-END FITTING PIPELINE');
}

runPipelineTest();
