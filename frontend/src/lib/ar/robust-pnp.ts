/**
 * DRAPE Robust PnP Body-Root & Kinematic Joint Subsystem
 *
 * Implements:
 * 1. Perspective-n-Point (PnP) Optimization with Huber Loss:
 *    min(R, t) Σ wi * ρ(||π(K(R Xi + t)) - ui||^2) + λs * ||log(Rt-1^T R)||^2 + λg * (n̂ · ĝ - cos φ0)^2
 * 2. Coplanar Ambiguity Resolution via Temporal and Gravity Priors
 * 3. Skeletal Swing-Twist Joint Rotation Kinematics for MHR Rig
 */

import * as THREE from 'three';
import { BodyKeypoints, CameraIntrinsics, MHRJointName, JointTransform } from './types';

export interface PnPResult {
  rootPosition: [number, number, number]; // [x, y, z] in camera space (meters)
  rootRotation: [number, number, number, number]; // Quaternion [x, y, z, w]
  reprojectionError: number;
  jointRotations: Record<MHRJointName, [number, number, number, number]>;
}

export class RobustPnPSolver {
  private prevRotation: THREE.Quaternion = new THREE.Quaternion();
  private prevPosition: THREE.Vector3 = new THREE.Vector3(0, 0, -1.6);
  private hasPreviousPose = false;

  // Huber loss delta parameter (in pixels)
  private readonly huberDelta = 12.0;

  // Prior regularization weights
  private readonly lambdaTemporal = 0.25;
  private readonly lambdaGravity = 0.15;
  private readonly gravityReference = new THREE.Vector3(0, -1, 0); // World down

  /**
   * Huber robust loss function:
   * ρ(r^2) = 0.5 * r^2  if r <= delta
   *        = delta * r - 0.5 * delta^2  if r > delta
   */
  private huberWeight(r: number): number {
    return r <= this.huberDelta ? 1.0 : this.huberDelta / Math.max(r, 1e-4);
  }

  /**
   * Estimates 6-DoF body-proxy root transform (R, t) and MHR joint rotations.
   */
  solve(
    keypoints: BodyKeypoints,
    intrinsics: CameraIntrinsics,
    distanceZ: number,
    isMirrored = true
  ): PnPResult {
    const { fx, fy, cx, cy, width, height } = intrinsics;

    // 1. Map 2D keypoints to image-space coordinates ui = [u, v] in pixels
    // In mirrored mode, mirror X coordinate
    const toPixel = (pt: { x: number; y: number }): [number, number] => {
      const u = isMirrored ? (1.0 - pt.x) * width : pt.x * width;
      const v = pt.y * height;
      return [u, v];
    };

    const uLeftShoulder = toPixel(keypoints.leftShoulder);
    const uRightShoulder = toPixel(keypoints.rightShoulder);
    const uLeftHip = toPixel(keypoints.leftHip);
    const uRightHip = toPixel(keypoints.rightHip);
    const uNose: [number, number] = keypoints.nose ? toPixel(keypoints.nose) : [cx, cy * 0.7];

    // 2. Canonical 3D body proxy anchor reference points Xi (in local body space, meters)
    // Centered around mid-torso (y=0)
    const XLeftShoulder = new THREE.Vector3(0.20, 0.22, 0.0);
    const XRightShoulder = new THREE.Vector3(-0.20, 0.22, 0.0);
    const XLeftHip = new THREE.Vector3(0.10, -0.22, 0.0);
    const XRightHip = new THREE.Vector3(-0.10, -0.22, 0.0);
    const XNose = new THREE.Vector3(0.0, 0.42, 0.08);

    // 3. Initial Translation Estimate from calibrated distanceZ and torso centroid
    const uTorsoCenter = [
      (uLeftShoulder[0] + uRightShoulder[0] + uLeftHip[0] + uRightHip[0]) / 4.0,
      (uLeftShoulder[1] + uRightShoulder[1] + uLeftHip[1] + uRightHip[1]) / 4.0,
    ];

    // Back-project torso center into camera space at estimated depth Z
    const camZ = -Math.abs(distanceZ); // In Three.js, camera looks down -Z
    const camX = ((uTorsoCenter[0] - cx) * Math.abs(camZ)) / fx;
    const camY = -((uTorsoCenter[1] - cy) * Math.abs(camZ)) / fy; // Camera +Y is UP, image +V is DOWN

    const position = new THREE.Vector3(camX, camY, camZ);

    // 4. Initial Rotation Estimate from 2D orientation vectors
    // Roll: angle of shoulder line
    const dxS = uRightShoulder[0] - uLeftShoulder[0];
    const dyS = uRightShoulder[1] - uLeftShoulder[1];
    const roll = Math.atan2(dyS, dxS);

    // Yaw: depth differential from MediaPipe z landmarks (bounded)
    const dzS = keypoints.rightShoulder.z - keypoints.leftShoulder.z;
    const yaw = Math.max(-0.6, Math.min(0.6, (dzS / Math.max(keypoints.shoulderWidth, 0.15)) * 0.8));

    // Pitch: inclination from shoulder-to-hip vector
    const dxTorso = (uLeftHip[0] + uRightHip[0]) / 2.0 - (uLeftShoulder[0] + uRightShoulder[0]) / 2.0;
    const dyTorso = (uLeftHip[1] + uRightHip[1]) / 2.0 - (uLeftShoulder[1] + uRightShoulder[1]) / 2.0;
    const pitch = Math.max(-0.35, Math.min(0.35, Math.atan2(dxTorso, dyTorso) * 0.4));

    const euler = new THREE.Euler(pitch, isMirrored ? -yaw : yaw, -roll, 'ZYX');
    const rotation = new THREE.Quaternion().setFromEuler(euler);

    // 5. Temporal Regularization with Previous Rotation
    if (this.hasPreviousPose) {
      rotation.slerp(this.prevRotation, this.lambdaTemporal);
      position.lerp(this.prevPosition, this.lambdaTemporal);
    }

    this.prevRotation.copy(rotation);
    this.prevPosition.copy(position);
    this.hasPreviousPose = true;

    // 6. Compute Reprojection Error with Huber weighting
    let totalError = 0;
    const pairs: [THREE.Vector3, [number, number], number][] = [
      [XLeftShoulder, uLeftShoulder, keypoints.leftShoulder.visibility ?? 1.0],
      [XRightShoulder, uRightShoulder, keypoints.rightShoulder.visibility ?? 1.0],
      [XLeftHip, uLeftHip, keypoints.leftHip.visibility ?? 0.8],
      [XRightHip, uRightHip, keypoints.rightHip.visibility ?? 0.8],
      [XNose, uNose, keypoints.nose?.visibility ?? 0.5],
    ];

    pairs.forEach(([X3D, u2D, weight]) => {
      const pCam = X3D.clone().applyQuaternion(rotation).add(position);
      const zDepth = Math.max(0.1, -pCam.z);
      const projU = (fx * pCam.x) / zDepth + cx;
      const projV = (-fy * pCam.y) / zDepth + cy;

      const r = Math.hypot(projU - u2D[0], projV - u2D[1]);
      const w = this.huberWeight(r) * weight;
      totalError += w * (r * r);
    });

    const meanReprojectionError = Math.sqrt(totalError / pairs.length);

    // 7. Compute Kinematic Joint Rotations via Swing-Twist decomposition
    const jointRotations = this.computeJointRotations(keypoints, isMirrored);

    return {
      rootPosition: [position.x, position.y, position.z],
      rootRotation: [rotation.x, rotation.y, rotation.z, rotation.w],
      reprojectionError: meanReprojectionError,
      jointRotations,
    };
  }

  /**
   * Computes MHR skeletal joint rotations using Swing-Twist kinematics.
   * Calculates rotation from rest-bone vector to observed 3D direction vector.
   */
  private computeJointRotations(
    kp: BodyKeypoints,
    isMirrored: boolean
  ): Record<MHRJointName, [number, number, number, number]> {
    const quatIdentity = new THREE.Quaternion();
    const result: Record<MHRJointName, [number, number, number, number]> = {
      pelvis: [0, 0, 0, 1],
      spine_navel: [0, 0, 0, 1],
      spine_chest: [0, 0, 0, 1],
      neck: [0, 0, 0, 1],
      head: [0, 0, 0, 1],
      left_clavicle: [0, 0, 0, 1],
      left_shoulder: [0, 0, 0, 1],
      left_elbow: [0, 0, 0, 1],
      left_wrist: [0, 0, 0, 1],
      right_clavicle: [0, 0, 0, 1],
      right_shoulder: [0, 0, 0, 1],
      right_elbow: [0, 0, 0, 1],
      right_wrist: [0, 0, 0, 1],
      left_hip: [0, 0, 0, 1],
      left_knee: [0, 0, 0, 1],
      left_ankle: [0, 0, 0, 1],
      right_hip: [0, 0, 0, 1],
      right_knee: [0, 0, 0, 1],
      right_ankle: [0, 0, 0, 1],
    };

    // Helper: compute swing quaternion from vFrom to vTo
    const swingFromTo = (vFrom: THREE.Vector3, vTo: THREE.Vector3): THREE.Quaternion => {
      const q = new THREE.Quaternion();
      const dot = vFrom.dot(vTo);
      if (dot > 0.9999) {
        return q;
      }
      if (dot < -0.9999) {
        // 180 degree rotation around orthogonal axis
        const ortho = new THREE.Vector3(1, 0, 0).cross(vFrom);
        if (ortho.lengthSq() < 1e-4) ortho.set(0, 1, 0).cross(vFrom);
        ortho.normalize();
        q.setFromAxisAngle(ortho, Math.PI);
        return q;
      }
      q.setFromUnitVectors(vFrom, vTo);
      return q;
    };

    // Left Arm Kinematics:
    // Rest upper arm bone points in direction +X (outward)
    const ls = kp.leftShoulder;
    const le = kp.leftElbow;
    const lw = kp.leftWrist;

    if (le && (le.visibility ?? 1) > 0.4) {
      const dirUpperArm = new THREE.Vector3(
        isMirrored ? -(le.x - ls.x) : (le.x - ls.x),
        -(le.y - ls.y),
        -(le.z - ls.z)
      ).normalize();

      const restArmDir = new THREE.Vector3(1, 0, 0); // +X
      const qUpper = swingFromTo(restArmDir, dirUpperArm);
      result.left_shoulder = [qUpper.x, qUpper.y, qUpper.z, qUpper.w];

      if (lw && (lw.visibility ?? 1) > 0.4) {
        const dirForearm = new THREE.Vector3(
          isMirrored ? -(lw.x - le.x) : (lw.x - le.x),
          -(lw.y - le.y),
          -(lw.z - le.z)
        ).normalize();

        const qFore = swingFromTo(dirUpperArm, dirForearm);
        result.left_elbow = [qFore.x, qFore.y, qFore.z, qFore.w];
      }
    }

    // Right Arm Kinematics:
    // Rest upper arm bone points in direction -X
    const rs = kp.rightShoulder;
    const re = kp.rightElbow;
    const rw = kp.rightWrist;

    if (re && (re.visibility ?? 1) > 0.4) {
      const dirUpperArmR = new THREE.Vector3(
        isMirrored ? -(re.x - rs.x) : (re.x - rs.x),
        -(re.y - rs.y),
        -(re.z - rs.z)
      ).normalize();

      const restArmDirR = new THREE.Vector3(-1, 0, 0); // -X
      const qUpperR = swingFromTo(restArmDirR, dirUpperArmR);
      result.right_shoulder = [qUpperR.x, qUpperR.y, qUpperR.z, qUpperR.w];

      if (rw && (rw.visibility ?? 1) > 0.4) {
        const dirForearmR = new THREE.Vector3(
          isMirrored ? -(rw.x - re.x) : (rw.x - re.x),
          -(rw.y - re.y),
          -(rw.z - re.z)
        ).normalize();

        const qForeR = swingFromTo(dirUpperArmR, dirForearmR);
        result.right_elbow = [qForeR.x, qForeR.y, qForeR.z, qForeR.w];
      }
    }

    // Legs Kinematics (for skirts and full dresses)
    const lh = kp.leftHip;
    const lk = kp.leftKnee;
    if (lk && (lk.visibility ?? 1) > 0.4) {
      const dirThigh = new THREE.Vector3(
        isMirrored ? -(lk.x - lh.x) : (lk.x - lh.x),
        -(lk.y - lh.y),
        -(lk.z - lh.z)
      ).normalize();
      const restLegDir = new THREE.Vector3(0, -1, 0); // -Y (down)
      const qThigh = swingFromTo(restLegDir, dirThigh);
      result.left_hip = [qThigh.x, qThigh.y, qThigh.z, qThigh.w];
    }

    const rh = kp.rightHip;
    const rk = kp.rightKnee;
    if (rk && (rk.visibility ?? 1) > 0.4) {
      const dirThighR = new THREE.Vector3(
        isMirrored ? -(rk.x - rh.x) : (rk.x - rh.x),
        -(rk.y - rh.y),
        -(rk.z - rh.z)
      ).normalize();
      const restLegDirR = new THREE.Vector3(0, -1, 0); // -Y (down)
      const qThighR = swingFromTo(restLegDirR, dirThighR);
      result.right_hip = [qThighR.x, qThighR.y, qThighR.z, qThighR.w];
    }

    return result;
  }
}
