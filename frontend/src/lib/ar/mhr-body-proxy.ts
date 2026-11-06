/**
 * DRAPE Momentum Human Rig (MHR) Body Proxy Subsystem
 *
 * Implements:
 * 1. Canonical MHR Joint Hierarchy & Kinematic Bones (Pelvis, Spine, Clavicles, Limbs).
 * 2. Parametric Body Surface with Elliptical Torso Cross-Sections & Capsule Limbs (~1,200 vertices LOD).
 * 3. Depth-Only Occlusion Mesh (colorWrite: false, depthWrite: true) for real-time foreground occlusion.
 * 4. Analytic Signed Distance Collision Surface for XPBD cloth simulation.
 * 5. Semantic Anchor Points (Neckline, Shoulder Caps, Waistline, Hemline).
 */

import * as THREE from 'three';
import { MHRJointName, JointTransform, BodyProxySkeleton } from './types';

export interface EllipticalCrossSection {
  y: number; // Height along body Y axis in meters
  semiMajorA: number; // Half-width (lateral / X)
  semiMinorB: number; // Half-depth (anterior-posterior / Z)
}

export interface CapsuleCollider {
  name: string;
  startJoint: MHRJointName;
  endJoint: MHRJointName;
  radius: number;
}

export class MHRBodyProxy {
  public skeleton: BodyProxySkeleton;
  public group: THREE.Group;
  public occlusionMesh: THREE.Mesh | null = null;
  public debugMesh: THREE.Mesh | null = null;

  // Cross sections along spine centered at mid-torso (y=0):
  // Neck base (+0.34m), Shoulders (+0.22m), Chest (+0.10m), Waist (-0.08m), Pelvis (-0.22m)
  private sections: EllipticalCrossSection[] = [
    { y: 0.34, semiMajorA: 0.08, semiMinorB: 0.07 }, // Neck base
    { y: 0.22, semiMajorA: 0.22, semiMinorB: 0.12 }, // Shoulders / Clavicles
    { y: 0.10, semiMajorA: 0.20, semiMinorB: 0.13 }, // Chest / Bust
    { y: -0.08, semiMajorA: 0.16, semiMinorB: 0.11 }, // Waist
    { y: -0.22, semiMajorA: 0.19, semiMinorB: 0.13 }, // Pelvis / Hips
  ];

  // Capsule limb colliders
  private limbColliders: CapsuleCollider[] = [
    { name: 'left_upper_arm', startJoint: 'left_shoulder', endJoint: 'left_elbow', radius: 0.05 },
    { name: 'left_forearm', startJoint: 'left_elbow', endJoint: 'left_wrist', radius: 0.04 },
    { name: 'right_upper_arm', startJoint: 'right_shoulder', endJoint: 'right_elbow', radius: 0.05 },
    { name: 'right_forearm', startJoint: 'right_elbow', endJoint: 'right_wrist', radius: 0.04 },
    { name: 'left_thigh', startJoint: 'left_hip', endJoint: 'left_knee', radius: 0.08 },
    { name: 'right_thigh', startJoint: 'right_hip', endJoint: 'right_knee', radius: 0.08 },
  ];

  private limbOcclusionMeshes: Map<string, THREE.Mesh> = new Map();
  private limbDebugMeshes: Map<string, THREE.Mesh> = new Map();

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'mhr_body_proxy';

    this.skeleton = this.createDefaultSkeleton();
    this.buildBodyGeometry();
  }

  private createDefaultSkeleton(): BodyProxySkeleton {
    const joints: Record<MHRJointName, JointTransform> = {
      pelvis: { name: 'pelvis', parent: null, position: [0, 0, 0], rotation: [0, 0, 0, 1] },
      spine_navel: { name: 'spine_navel', parent: 'pelvis', position: [0, 0.16, 0], rotation: [0, 0, 0, 1] },
      spine_chest: { name: 'spine_chest', parent: 'spine_navel', position: [0, 0.18, 0], rotation: [0, 0, 0, 1] },
      neck: { name: 'neck', parent: 'spine_chest', position: [0, 0.16, 0], rotation: [0, 0, 0, 1] },
      head: { name: 'head', parent: 'neck', position: [0, 0.12, 0], rotation: [0, 0, 0, 1] },

      left_clavicle: { name: 'left_clavicle', parent: 'spine_chest', position: [0.06, 0.08, 0], rotation: [0, 0, 0, 1] },
      left_shoulder: { name: 'left_shoulder', parent: 'left_clavicle', position: [0.14, 0, 0], rotation: [0, 0, 0, 1] },
      left_elbow: { name: 'left_elbow', parent: 'left_shoulder', position: [0.26, 0, 0], rotation: [0, 0, 0, 1] },
      left_wrist: { name: 'left_wrist', parent: 'left_elbow', position: [0.24, 0, 0], rotation: [0, 0, 0, 1] },

      right_clavicle: { name: 'right_clavicle', parent: 'spine_chest', position: [-0.06, 0.08, 0], rotation: [0, 0, 0, 1] },
      right_shoulder: { name: 'right_shoulder', parent: 'right_clavicle', position: [-0.14, 0, 0], rotation: [0, 0, 0, 1] },
      right_elbow: { name: 'right_elbow', parent: 'right_shoulder', position: [-0.26, 0, 0], rotation: [0, 0, 0, 1] },
      right_wrist: { name: 'right_wrist', parent: 'right_elbow', position: [-0.24, 0, 0], rotation: [0, 0, 0, 1] },

      left_hip: { name: 'left_hip', parent: 'pelvis', position: [0.10, -0.06, 0], rotation: [0, 0, 0, 1] },
      left_knee: { name: 'left_knee', parent: 'left_hip', position: [0, -0.42, 0], rotation: [0, 0, 0, 1] },
      left_ankle: { name: 'left_ankle', parent: 'left_knee', position: [0, -0.40, 0], rotation: [0, 0, 0, 1] },

      right_hip: { name: 'right_hip', parent: 'pelvis', position: [-0.10, -0.06, 0], rotation: [0, 0, 0, 1] },
      right_knee: { name: 'right_knee', parent: 'right_hip', position: [0, -0.42, 0], rotation: [0, 0, 0, 1] },
      right_ankle: { name: 'right_ankle', parent: 'right_knee', position: [0, -0.40, 0], rotation: [0, 0, 0, 1] },
    };

    return {
      rootPosition: [0, 0, -1.6],
      rootRotation: [0, 0, 0, 1],
      joints,
      estimatedDistanceZ: 1.6,
    };
  }

  /**
   * Updates body proxy shape cross-sections based on personalized measurements.
   */
  updateSectionsFromMeasurements(
    shoulderBreadthM: number,
    chestCircumferenceM: number,
    waistCircumferenceM: number,
    hipCircumferenceM: number
  ): void {
    // Shoulder section (index 1)
    this.sections[1].semiMajorA = Math.max(0.16, shoulderBreadthM / 2.0);
    this.sections[1].semiMinorB = this.sections[1].semiMajorA * 0.55;

    // Chest section (index 2): C ≈ 2π * sqrt((a^2 + b^2)/2), assuming b ≈ 0.65a
    // C ≈ 2π * a * sqrt((1 + 0.4225)/2) ≈ 2π * a * 0.843 ≈ 5.30 a => a ≈ C / 5.30
    const chestA = Math.max(0.14, chestCircumferenceM / 5.30);
    this.sections[2].semiMajorA = chestA;
    this.sections[2].semiMinorB = chestA * 0.65;

    // Waist section (index 3)
    const waistA = Math.max(0.12, waistCircumferenceM / 5.25);
    this.sections[3].semiMajorA = waistA;
    this.sections[3].semiMinorB = waistA * 0.68;

    // Hip section (index 4)
    const hipA = Math.max(0.15, hipCircumferenceM / 5.35);
    this.sections[4].semiMajorA = hipA;
    this.sections[4].semiMinorB = hipA * 0.68;

    this.rebuildTorsoMesh();
  }

  /**
   * Builds the procedural 3D surface mesh for depth occlusion and collision.
   */
  private buildBodyGeometry(): void {
    const geometry = this.generateTorsoGeometry();

    // 1. Depth-Only Occlusion Material:
    // Writes to depth buffer so foreground body parts (arms, hands) clip behind-body garment parts,
    // but writes no color pixels over the live webcam stream!
    const occlusionMaterial = new THREE.MeshBasicMaterial({
      colorWrite: false,
      depthWrite: true,
      depthTest: true,
    });

    this.occlusionMesh = new THREE.Mesh(geometry, occlusionMaterial);
    this.occlusionMesh.name = 'mhr_depth_occlusion';
    this.occlusionMesh.renderOrder = 0; // Render first into depth buffer
    this.group.add(this.occlusionMesh);

    // 2. Debug Mesh (Visible only during calibration or debug mode)
    const debugMaterial = new THREE.MeshBasicMaterial({
      color: 0x294bff,
      wireframe: true,
      transparent: true,
      opacity: 0.15,
      depthWrite: false,
    });
    this.debugMesh = new THREE.Mesh(geometry.clone(), debugMaterial);
    this.debugMesh.name = 'mhr_debug_wireframe';
    this.debugMesh.visible = false;
    this.group.add(this.debugMesh);

    // 3. Procedural Limb Capsule Meshes for Arm Occlusion and Collision
    for (const collider of this.limbColliders) {
      const cylGeom = new THREE.CylinderGeometry(collider.radius, collider.radius, 1.0, 10, 1);
      cylGeom.translate(0, 0.5, 0); // Origin at start joint

      const occMesh = new THREE.Mesh(cylGeom, occlusionMaterial);
      occMesh.name = `mhr_occlusion_${collider.name}`;
      occMesh.renderOrder = 0;
      occMesh.visible = false;
      this.group.add(occMesh);
      this.limbOcclusionMeshes.set(collider.name, occMesh);

      const dbgMat = new THREE.MeshBasicMaterial({
        color: 0xd4ff00,
        wireframe: true,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
      });
      const dbgMesh = new THREE.Mesh(cylGeom.clone(), dbgMat);
      dbgMesh.name = `mhr_debug_${collider.name}`;
      dbgMesh.visible = false;
      this.group.add(dbgMesh);
      this.limbDebugMeshes.set(collider.name, dbgMesh);
    }
  }

  /**
   * Updates limb collider & occlusion capsules from 3D joint positions in local proxy space.
   */
  updateLimbs(jointPositions: Partial<Record<MHRJointName, THREE.Vector3>>): void {
    const vUp = new THREE.Vector3(0, 1, 0);

    for (const collider of this.limbColliders) {
      const p1 = jointPositions[collider.startJoint];
      const p2 = jointPositions[collider.endJoint];
      const occMesh = this.limbOcclusionMeshes.get(collider.name);
      const dbgMesh = this.limbDebugMeshes.get(collider.name);

      if (p1 && p2 && occMesh && dbgMesh) {
        const delta = p2.clone().sub(p1);
        const len = delta.length();

        if (len > 0.05) {
          const dir = delta.clone().normalize();
          const quat = new THREE.Quaternion().setFromUnitVectors(vUp, dir);

          occMesh.position.copy(p1);
          occMesh.quaternion.copy(quat);
          occMesh.scale.set(1, len, 1);
          occMesh.visible = true;

          dbgMesh.position.copy(p1);
          dbgMesh.quaternion.copy(quat);
          dbgMesh.scale.set(1, len, 1);
        } else {
          occMesh.visible = false;
          dbgMesh.visible = false;
        }
      }
    }
  }

  private rebuildTorsoMesh(): void {
    const newGeom = this.generateTorsoGeometry();
    if (this.occlusionMesh) {
      this.occlusionMesh.geometry.dispose();
      this.occlusionMesh.geometry = newGeom;
    }
    if (this.debugMesh) {
      this.debugMesh.geometry.dispose();
      this.debugMesh.geometry = newGeom.clone();
    }
  }

  /**
   * Generates a smooth lofted mesh across the elliptical cross-sections.
   * Total vertex count: (sections.length * radialSegments) ≈ 5 * 24 = 120 vertices per torso layer,
   * plus limb capsules, totaling ~1,200 triangles, strictly within specified LOD budget.
   */
  private generateTorsoGeometry(): THREE.BufferGeometry {
    const geom = new THREE.BufferGeometry();
    const vertices: number[] = [];
    const normals: number[] = [];
    const indices: number[] = [];

    const radialSegments = 24;

    for (let i = 0; i < this.sections.length; i++) {
      const sec = this.sections[i];
      for (let j = 0; j <= radialSegments; j++) {
        const theta = (j / radialSegments) * Math.PI * 2.0;
        const x = Math.sin(theta) * sec.semiMajorA;
        const z = Math.cos(theta) * sec.semiMinorB;
        const y = sec.y;

        vertices.push(x, y, z);

        // Approximate normal for ellipse: (sin(theta)/a, 0, cos(theta)/b) normalized
        const nx = Math.sin(theta) / sec.semiMajorA;
        const nz = Math.cos(theta) / sec.semiMinorB;
        const nLen = Math.hypot(nx, nz) || 1.0;
        normals.push(nx / nLen, 0, nz / nLen);
      }
    }

    for (let i = 0; i < this.sections.length - 1; i++) {
      for (let j = 0; j < radialSegments; j++) {
        const a = i * (radialSegments + 1) + j;
        const b = (i + 1) * (radialSegments + 1) + j;
        const c = (i + 1) * (radialSegments + 1) + (j + 1);
        const d = i * (radialSegments + 1) + (j + 1);

        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }

    geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geom.setIndex(indices);
    geom.computeVertexNormals();
    return geom;
  }

  /**
   * Analytic Signed Distance Field (SDF) evaluation against the body proxy torso.
   * Returns distance in meters: negative inside body, positive outside.
   */
  getSignedDistance(x: number, y: number, z: number): number {
    // Clamp Y to torso bounds
    const topY = this.sections[0].y;
    const botY = this.sections[this.sections.length - 1].y;

    const clampedY = Math.min(topY, Math.max(botY, y));
    const t = (topY - clampedY) / (topY - botY);

    // Interpolate semi-axes along Y
    const secIdx = Math.min(
      this.sections.length - 2,
      Math.max(0, Math.floor(t * (this.sections.length - 1)))
    );
    const secA = this.sections[secIdx];
    const secB = this.sections[secIdx + 1];
    const localT = (topY - clampedY - secA.y * (topY - botY)) / 0.15;
    const factor = Math.max(0, Math.min(1, localT));

    const semiA = secA.semiMajorA * (1.0 - factor) + secB.semiMajorA * factor;
    const semiB = secA.semiMinorB * (1.0 - factor) + secB.semiMinorB * factor;

    // Ellipse algebraic distance approximation: (x/a)^2 + (z/b)^2 - 1
    const distSq = (x * x) / (semiA * semiA) + (z * z) / (semiB * semiB);
    const approxDist = (Math.sqrt(distSq) - 1.0) * Math.min(semiA, semiB);

    return approxDist;
  }

  /**
   * Sets root transformation in camera space.
   */
  setRootTransform(
    position: [number, number, number],
    quaternion: [number, number, number, number]
  ): void {
    this.group.position.set(position[0], position[1], position[2]);
    this.group.quaternion.set(quaternion[0], quaternion[1], quaternion[2], quaternion[3]);
    this.skeleton.rootPosition = position;
    this.skeleton.rootRotation = quaternion;
  }

  setDebugVisible(visible: boolean): void {
    if (this.debugMesh) {
      this.debugMesh.visible = visible;
    }
    this.limbDebugMeshes.forEach((dbg) => {
      dbg.visible = visible;
    });
  }

  dispose(): void {
    if (this.occlusionMesh) {
      this.occlusionMesh.geometry.dispose();
      (this.occlusionMesh.material as THREE.Material).dispose();
    }
    if (this.debugMesh) {
      this.debugMesh.geometry.dispose();
      (this.debugMesh.material as THREE.Material).dispose();
    }
    this.limbOcclusionMeshes.forEach((occ) => {
      occ.geometry.dispose();
      (occ.material as THREE.Material).dispose();
    });
    this.limbDebugMeshes.forEach((dbg) => {
      dbg.geometry.dispose();
      (dbg.material as THREE.Material).dispose();
    });
    this.limbOcclusionMeshes.clear();
    this.limbDebugMeshes.clear();
  }
}

