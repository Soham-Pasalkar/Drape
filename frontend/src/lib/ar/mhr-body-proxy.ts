/**
 * DRAPE Parametric Body Proxy
 *
 * A simplified, MHR-*inspired* parametric torso (lofted elliptical cross-sections) plus
 * capsule limbs. It is NOT a Momentum Human Rig reconstruction: it has ~200 torso vertices,
 * no learned shape space and no skinning. It serves three purposes:
 *   1. depth-only occluder (colorWrite = false) so the garment's far side is hidden;
 *   2. collision surface (analytic SDF) for XPBD cloth;
 *   3. triangle surface for garment-to-body correspondence.
 *
 * BODY-LOCAL FRAME (shared by PnP, garment anchors, correspondence and collision):
 *   origin = midpoint of shoulder-centre and hip-centre landmarks (torso centre)
 *   +X = wearer's left, +Y = up the spine, +Z = forward (out of the chest).
 *   Units: metres. Shoulder joints at (±B/2, L/2, 0), hip joints at (±H/2, −L/2, 0).
 */

import * as THREE from 'three';
import { MHRJointName } from './types';

export interface EllipticalCrossSection {
  y: number; // body-local height (m)
  semiMajorA: number; // half-width along X (m)
  semiMinorB: number; // half-depth along Z (m)
}

export interface CapsuleCollider {
  name: string;
  startJoint: MHRJointName;
  endJoint: MHRJointName;
  radius: number;
}

/** Scale-bearing body parameters (metres). */
export interface BodyShape {
  /** Distance between shoulder landmarks (≈ glenohumeral joint centres). */
  shoulderBreadthM: number;
  /** Distance between hip landmarks (≈ hip joint centres). */
  hipBreadthM: number;
  /** Vertical distance shoulder-centre → hip-centre. */
  torsoLengthM: number;
  chest: { a: number; b: number };
  waist: { a: number; b: number };
  hips: { a: number; b: number };
}

/**
 * Proxy shape priors. These are documented anatomical approximations, not measurements:
 *  - NECK_ABOVE_SHOULDER_M: neck base sits ~12 cm above the shoulder-joint line.
 *  - SHOULDER_SOFT_TISSUE_M: deltoid cap extends ~5 cm lateral to the joint centre
 *    (equal to the upper-arm capsule radius, keeping arm and torso surfaces continuous).
 *  - CHEST_DROP / WAIST_DROP: fraction of torso length below the shoulder line.
 *  - SEAT_DROP_M: closes the torso ~10 cm below the hip joints (buttocks / upper thigh).
 */
export const BODY_PROXY_PRIORS = {
  NECK_ABOVE_SHOULDER_M: 0.12,
  /**
   * Approximate vertical distance from shoulder joint line to the suprasternal notch (base of neck).
   * In standard human proportions, the clavicles drop ~4.5 cm from the acromion / glenohumeral joint
   * to the jugular notch of the manubrium sterni on the anterior midline.
   * This is a documented geometric reference for neckline fit telemetry, NOT an anatomically measured landmark.
   */
  NECK_BASE_BELOW_SHOULDER_M: 0.045,
  NECK_RADIUS_M: { a: 0.065, b: 0.06 },
  SHOULDER_SOFT_TISSUE_M: 0.05,
  SHOULDER_DEPTH_RATIO: 0.48,
  CHEST_DROP: 0.27,
  WAIST_DROP: 0.68,
  SEAT_DROP_M: 0.1,
  SEAT_SCALE: 0.95,
  UPPER_ARM_RADIUS_M: 0.05,
  FOREARM_RADIUS_M: 0.04,
  THIGH_RADIUS_M: 0.08,
};

export function defaultBodyShape(): BodyShape {
  return {
    shoulderBreadthM: 0.36,
    hipBreadthM: 0.27,
    torsoLengthM: 0.5,
    chest: { a: 0.19, b: 0.124 },
    waist: { a: 0.144, b: 0.098 },
    hips: { a: 0.182, b: 0.124 },
  };
}

export interface SignedDistanceResult {
  distance: number; // metres, negative inside
  normal: THREE.Vector3; // outward unit normal (body-local)
}

const RADIAL_SEGMENTS = 32;

export class MHRBodyProxy {
  public group: THREE.Group;
  public occlusionMesh: THREE.Mesh;
  public debugMesh: THREE.Mesh;

  private shape: BodyShape = defaultBodyShape();
  private sections: EllipticalCrossSection[] = [];
  private shapeVersion = 0;

  private limbColliders: CapsuleCollider[] = [
    { name: 'left_upper_arm', startJoint: 'left_shoulder', endJoint: 'left_elbow', radius: BODY_PROXY_PRIORS.UPPER_ARM_RADIUS_M },
    { name: 'left_forearm', startJoint: 'left_elbow', endJoint: 'left_wrist', radius: BODY_PROXY_PRIORS.FOREARM_RADIUS_M },
    { name: 'right_upper_arm', startJoint: 'right_shoulder', endJoint: 'right_elbow', radius: BODY_PROXY_PRIORS.UPPER_ARM_RADIUS_M },
    { name: 'right_forearm', startJoint: 'right_elbow', endJoint: 'right_wrist', radius: BODY_PROXY_PRIORS.FOREARM_RADIUS_M },
    { name: 'left_thigh', startJoint: 'left_hip', endJoint: 'left_knee', radius: BODY_PROXY_PRIORS.THIGH_RADIUS_M },
    { name: 'right_thigh', startJoint: 'right_hip', endJoint: 'right_knee', radius: BODY_PROXY_PRIORS.THIGH_RADIUS_M },
  ];
  /** Active capsule segments in body-local space (only those with tracked endpoints). */
  private activeCapsules: { a: THREE.Vector3; b: THREE.Vector3; radius: number; name: string }[] = [];
  /**
   * Capsules that participate in the SDF (null = all). Arms lie OUTSIDE a top's torso panel,
   * so for tops only the torso collides; skirts / dresses add the thighs (legs are inside).
   */
  private collisionCapsules: Set<string> | null = null;
  /**
   * Limb capsules that participate in depth occlusion (null = all). When wearing garments
   * with sleeves, upper-arm occluders must be disabled so they do not punch depth holes
   * through the virtual sleeves covering those limbs.
   */
  private occlusionLimbs: Set<string> | null = null;

  private occlusionMaterial: THREE.MeshBasicMaterial;
  private limbOcclusionMeshes: Map<string, THREE.Mesh> = new Map();
  private limbDebugMeshes: Map<string, THREE.Mesh> = new Map();
  private limbGeometry: THREE.CylinderGeometry;
  private limbDebugMaterial: THREE.MeshBasicMaterial;

  // scratch
  private readonly _v = new THREE.Vector3();
  private readonly _w = new THREE.Vector3();

  constructor(shape: BodyShape = defaultBodyShape()) {
    this.group = new THREE.Group();
    this.group.name = 'mhr_body_proxy';
    this.shape = { ...shape };
    this.sections = MHRBodyProxy.sectionsFromShape(this.shape);

    this.occlusionMaterial = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: true, depthTest: true });
    const geometry = this.generateTorsoGeometry();
    this.occlusionMesh = new THREE.Mesh(geometry, this.occlusionMaterial);
    this.occlusionMesh.name = 'mhr_depth_occlusion';
    this.occlusionMesh.renderOrder = 0;
    this.group.add(this.occlusionMesh);

    const debugMaterial = new THREE.MeshBasicMaterial({
      color: 0x294bff,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    });
    this.debugMesh = new THREE.Mesh(geometry, debugMaterial); // shares geometry
    this.debugMesh.name = 'mhr_debug_wireframe';
    this.debugMesh.visible = false;
    this.debugMesh.renderOrder = 3;
    this.group.add(this.debugMesh);

    this.limbGeometry = new THREE.CylinderGeometry(1, 1, 1, 10, 1);
    this.limbGeometry.translate(0, 0.5, 0); // origin at start joint, +Y towards end joint
    this.limbDebugMaterial = new THREE.MeshBasicMaterial({
      color: 0xd4ff00,
      wireframe: true,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    });
    for (const c of this.limbColliders) {
      const occ = new THREE.Mesh(this.limbGeometry, this.occlusionMaterial);
      occ.name = `mhr_occlusion_${c.name}`;
      occ.renderOrder = 0;
      occ.visible = false;
      this.group.add(occ);
      this.limbOcclusionMeshes.set(c.name, occ);

      const dbg = new THREE.Mesh(this.limbGeometry, this.limbDebugMaterial);
      dbg.name = `mhr_debug_${c.name}`;
      dbg.visible = false;
      dbg.renderOrder = 3;
      this.group.add(dbg);
      this.limbDebugMeshes.set(c.name, dbg);
    }
  }

  static sectionsFromShape(s: BodyShape): EllipticalCrossSection[] {
    const P = BODY_PROXY_PRIORS;
    const yS = s.torsoLengthM / 2;
    const yH = -s.torsoLengthM / 2;
    return [
      { y: yS + P.NECK_ABOVE_SHOULDER_M, semiMajorA: P.NECK_RADIUS_M.a, semiMinorB: P.NECK_RADIUS_M.b },
      {
        y: yS,
        semiMajorA: s.shoulderBreadthM / 2 + P.SHOULDER_SOFT_TISSUE_M,
        semiMinorB: (s.shoulderBreadthM / 2 + P.SHOULDER_SOFT_TISSUE_M) * P.SHOULDER_DEPTH_RATIO,
      },
      { y: yS - P.CHEST_DROP * s.torsoLengthM, semiMajorA: s.chest.a, semiMinorB: s.chest.b },
      { y: yS - P.WAIST_DROP * s.torsoLengthM, semiMajorA: s.waist.a, semiMinorB: s.waist.b },
      { y: yH, semiMajorA: s.hips.a, semiMinorB: s.hips.b },
      { y: yH - P.SEAT_DROP_M, semiMajorA: s.hips.a * P.SEAT_SCALE, semiMinorB: s.hips.b * P.SEAT_SCALE },
    ];
  }

  getShape(): BodyShape {
    return { ...this.shape, chest: { ...this.shape.chest }, waist: { ...this.shape.waist }, hips: { ...this.shape.hips } };
  }

  getSections(): readonly EllipticalCrossSection[] {
    return this.sections;
  }

  /** Incremented whenever the surface geometry changes (correspondence must be rebuilt). */
  get version(): number {
    return this.shapeVersion;
  }

  /**
   * Body-local semantic attachment anchors.
   *
   * Anchors:
   *   - 'shoulder_center': Shoulder joint midpoint (sections[1].y).
   *   - 'neckline_center': Top of neck section near jaw/chin (sections[0].y).
   *   - 'base_of_neck': Approximated suprasternal notch / base-of-neck reference on anterior midline.
   *   - 'waist_center': Mid-torso waist section (sections[3].y).
   */
  getAttachmentAnchor(
    type: 'shoulder_center' | 'waist_center' | 'neckline_center' | 'base_of_neck',
    out = new THREE.Vector3()
  ): THREE.Vector3 {
    switch (type) {
      case 'shoulder_center':
        return out.set(0, this.sections[1].y, 0);
      case 'neckline_center':
        return out.set(0, this.sections[0].y, 0);
      case 'base_of_neck': {
        const yS = this.shape.torsoLengthM / 2;
        const yBase = yS - BODY_PROXY_PRIORS.NECK_BASE_BELOW_SHOULDER_M;
        const zFront = this.sections[1].semiMinorB;
        return out.set(0, yBase, zFront);
      }
      case 'waist_center':
        return out.set(0, this.sections[3].y, 0);
    }
  }

  /** Returns the anatomical approximation of the suprasternal notch (base of neck). */
  getBaseOfNeck(out = new THREE.Vector3()): THREE.Vector3 {
    return this.getAttachmentAnchor('base_of_neck', out);
  }

  getJointPosition(name: 'left_shoulder' | 'right_shoulder' | 'left_hip' | 'right_hip', out = new THREE.Vector3()): THREE.Vector3 {
    const s = this.shape;
    switch (name) {
      case 'left_shoulder':
        return out.set(s.shoulderBreadthM / 2, s.torsoLengthM / 2, 0);
      case 'right_shoulder':
        return out.set(-s.shoulderBreadthM / 2, s.torsoLengthM / 2, 0);
      case 'left_hip':
        return out.set(s.hipBreadthM / 2, -s.torsoLengthM / 2, 0);
      case 'right_hip':
        return out.set(-s.hipBreadthM / 2, -s.torsoLengthM / 2, 0);
    }
  }

  /**
   * Replaces the body shape. Returns true when the surface changed by more than
   * `toleranceM` anywhere (so callers can skip rebuilding correspondence for noise).
   */
  setShape(shape: BodyShape, toleranceM = 0.003): boolean {
    const next = MHRBodyProxy.sectionsFromShape(shape);
    let maxDelta = 0;
    for (let i = 0; i < next.length; i++) {
      maxDelta = Math.max(
        maxDelta,
        Math.abs(next[i].y - this.sections[i].y),
        Math.abs(next[i].semiMajorA - this.sections[i].semiMajorA),
        Math.abs(next[i].semiMinorB - this.sections[i].semiMinorB)
      );
    }
    if (maxDelta <= toleranceM) return false;
    this.shape = { ...shape };
    this.sections = next;
    this.writeTorsoPositions(this.occlusionMesh.geometry);
    this.shapeVersion++;
    return true;
  }

  /** Backward-compatible helper: circumferences in metres → ellipse semi-axes. */
  updateSectionsFromMeasurements(
    shoulderBreadthM: number,
    chestCircumferenceM: number,
    waistCircumferenceM: number,
    hipCircumferenceM: number
  ): boolean {
    // For b = k·a, Ramanujan C ≈ π·a·[3(1+k) − √((3+k)(1+3k))]
    const semiFromC = (C: number, k: number) => C / (Math.PI * (3 * (1 + k) - Math.sqrt((3 + k) * (1 + 3 * k))));
    const chestA = semiFromC(chestCircumferenceM, 0.65);
    const waistA = semiFromC(waistCircumferenceM, 0.68);
    const hipA = semiFromC(hipCircumferenceM, 0.68);
    return this.setShape({
      ...this.shape,
      shoulderBreadthM,
      chest: { a: chestA, b: chestA * 0.65 },
      waist: { a: waistA, b: waistA * 0.68 },
      hips: { a: hipA, b: hipA * 0.68 },
    });
  }

  /**
   * Updates limb capsules from body-local joint positions. Missing endpoints disable the
   * capsule for both occlusion and collision.
   */
  updateLimbs(jointPositions: Partial<Record<MHRJointName, THREE.Vector3>>): void {
    this.activeCapsules = [];
    const up = this._w.set(0, 1, 0);
    for (const c of this.limbColliders) {
      const p1 = jointPositions[c.startJoint];
      const p2 = jointPositions[c.endJoint];
      const occ = this.limbOcclusionMeshes.get(c.name)!;
      const dbg = this.limbDebugMeshes.get(c.name)!;
      const len = p1 && p2 ? p1.distanceTo(p2) : 0;
      if (p1 && p2 && len > 0.05) {
        const dir = this._v.copy(p2).sub(p1).divideScalar(len);
        occ.position.copy(p1);
        occ.quaternion.setFromUnitVectors(up, dir);
        occ.scale.set(c.radius, len, c.radius);
        const isOccluder = !this.occlusionLimbs || this.occlusionLimbs.has(c.name);
        occ.visible = isOccluder;
        dbg.position.copy(occ.position);
        dbg.quaternion.copy(occ.quaternion);
        dbg.scale.copy(occ.scale);
        this.activeCapsules.push({ a: p1.clone(), b: p2.clone(), radius: c.radius, name: c.name });
      } else {
        occ.visible = false;
        dbg.visible = false;
      }
    }
    this.syncDebugLimbVisibility();
  }

  private debugVisible = false;
  private syncDebugLimbVisibility(): void {
    this.limbDebugMeshes.forEach((dbg, name) => {
      const active = this.activeCapsules.some((c) => c.name === name);
      dbg.visible = this.debugVisible && active;
    });
  }

  setCollisionCapsules(names: string[] | null): void {
    this.collisionCapsules = names ? new Set(names) : null;
  }

  /**
   * Limb capsules that participate in depth occlusion (null = all tracked limb capsules).
   * When wearing garments with sleeves, upper-arm occluders must be disabled so they
   * do not punch depth holes through the virtual sleeves covering those limbs.
   */
  setOcclusionLimbs(names: string[] | null): void {
    this.occlusionLimbs = names ? new Set(names) : null;
  }

  getOcclusionLimbs(): Set<string> | null {
    return this.occlusionLimbs ? new Set(this.occlusionLimbs) : null;
  }

  getLimbOcclusionMesh(name: string): THREE.Mesh | undefined {
    return this.limbOcclusionMeshes.get(name);
  }

  /** Interpolated torso cross-section at body-local height y, or null outside the torso. */
  sectionAt(y: number): { a: number; b: number; dadY: number; dbdY: number } | null {
    const s = this.sections;
    if (y > s[0].y || y < s[s.length - 1].y) return null;
    for (let i = 0; i < s.length - 1; i++) {
      const hi = s[i];
      const lo = s[i + 1];
      if (y <= hi.y && y >= lo.y) {
        const span = hi.y - lo.y;
        const t = span > 1e-9 ? (hi.y - y) / span : 0;
        return {
          a: hi.semiMajorA + (lo.semiMajorA - hi.semiMajorA) * t,
          b: hi.semiMinorB + (lo.semiMinorB - hi.semiMinorB) * t,
          dadY: span > 1e-9 ? (hi.semiMajorA - lo.semiMajorA) / span : 0,
          dbdY: span > 1e-9 ? (hi.semiMinorB - lo.semiMinorB) / span : 0,
        };
      }
    }
    return null;
  }

  /**
   * Signed distance (metres) of a BODY-LOCAL point to the torso ∪ active limb capsules,
   * with the outward normal (body-local). Torso distance uses the first-order ellipse
   * distance d ≈ F/|∇F| with F = k − 1, k = √((x/a)² + (z/b)²); exact on the surface and
   * accurate to O(d²) nearby. Points above/below the torso ends only see the capsules.
   */
  signedDistance(x: number, y: number, z: number, out?: SignedDistanceResult): SignedDistanceResult {
    const res: SignedDistanceResult = out ?? { distance: Infinity, normal: new THREE.Vector3(0, 0, 1) };
    res.distance = Infinity;

    const sec = this.sectionAt(y);
    if (sec) {
      const { a, b } = sec;
      const k = Math.sqrt((x * x) / (a * a) + (z * z) / (b * b));
      if (k < 1e-6) {
        res.distance = -Math.min(a, b);
        res.normal.set(0, 0, 1);
      } else {
        // ∂k/∂x = x/(a²k), ∂k/∂z = z/(b²k), ∂k/∂y via the section taper.
        const gx = x / (a * a * k);
        const gz = z / (b * b * k);
        const gy = -((x * x) / (a * a * a) * sec.dadY + (z * z) / (b * b * b) * sec.dbdY) / k;
        const g = Math.sqrt(gx * gx + gy * gy + gz * gz);
        res.distance = (k - 1) / g;
        res.normal.set(gx / g, gy / g, gz / g);
      }
    }

    for (const c of this.activeCapsules) {
      if (this.collisionCapsules && !this.collisionCapsules.has(c.name)) continue;
      const ab = this._v.copy(c.b).sub(c.a);
      const t = Math.max(0, Math.min(1, ((x - c.a.x) * ab.x + (y - c.a.y) * ab.y + (z - c.a.z) * ab.z) / ab.lengthSq()));
      const px = c.a.x + ab.x * t;
      const py = c.a.y + ab.y * t;
      const pz = c.a.z + ab.z * t;
      const dx = x - px;
      const dy = y - py;
      const dz = z - pz;
      const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const d = len - c.radius;
      if (d < res.distance) {
        res.distance = d;
        if (len > 1e-9) res.normal.set(dx / len, dy / len, dz / len);
      }
    }
    return res;
  }

  /** Backward-compatible scalar SDF (body-local input). */
  getSignedDistance(x: number, y: number, z: number): number {
    return this.signedDistance(x, y, z).distance;
  }

  /** Torso surface triangles in body-local space (fixed topology for all shapes). */
  getSurfaceMesh(): { positions: Float32Array; indices: Uint32Array } {
    const geom = this.occlusionMesh.geometry;
    const pos = geom.getAttribute('position') as THREE.BufferAttribute;
    const idx = geom.getIndex()!;
    return { positions: new Float32Array(pos.array as Float32Array), indices: new Uint32Array(idx.array as ArrayLike<number>) };
  }

  private generateTorsoGeometry(): THREE.BufferGeometry {
    const geom = new THREE.BufferGeometry();
    const n = this.sections.length * (RADIAL_SEGMENTS + 1);
    geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    geom.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    const indices: number[] = [];
    for (let i = 0; i < this.sections.length - 1; i++) {
      for (let j = 0; j < RADIAL_SEGMENTS; j++) {
        const a = i * (RADIAL_SEGMENTS + 1) + j;
        const b = (i + 1) * (RADIAL_SEGMENTS + 1) + j;
        const c = b + 1;
        const d = a + 1;
        // Counter-clockwise when seen from outside (outward-facing winding).
        indices.push(a, b, d, b, c, d);
      }
    }
    geom.setIndex(indices);
    this.writeTorsoPositions(geom);
    return geom;
  }

  private writeTorsoPositions(geom: THREE.BufferGeometry): void {
    const pos = geom.getAttribute('position') as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    let k = 0;
    for (const sec of this.sections) {
      for (let j = 0; j <= RADIAL_SEGMENTS; j++) {
        const theta = (j / RADIAL_SEGMENTS) * Math.PI * 2;
        arr[k++] = Math.sin(theta) * sec.semiMajorA;
        arr[k++] = sec.y;
        arr[k++] = Math.cos(theta) * sec.semiMinorB;
      }
    }
    pos.needsUpdate = true;
    geom.computeVertexNormals();
    geom.computeBoundingBox();
    geom.computeBoundingSphere();
  }

  setRootTransform(position: [number, number, number], quaternion: [number, number, number, number]): void {
    this.group.position.set(position[0], position[1], position[2]);
    this.group.quaternion.set(quaternion[0], quaternion[1], quaternion[2], quaternion[3]);
  }

  setDebugVisible(visible: boolean): void {
    this.debugVisible = visible;
    this.debugMesh.visible = visible;
    this.syncDebugLimbVisibility();
  }

  dispose(): void {
    this.occlusionMesh.geometry.dispose();
    this.occlusionMaterial.dispose();
    (this.debugMesh.material as THREE.Material).dispose();
    this.limbGeometry.dispose();
    this.limbDebugMaterial.dispose();
    this.limbOcclusionMeshes.clear();
    this.limbDebugMeshes.clear();
  }
}
