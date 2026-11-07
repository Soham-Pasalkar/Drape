/**
 * DRAPE Garment Instance — one loaded garment, independent of the GLTF loader and renderer.
 *
 * HIERARCHY (see garment-rig.ts for the anchor derivation)
 *   bodyRoot (T_body→camera, owned by the scene)
 *    └─ wrapper        position = a_B (body-local attachment anchor), scale = S (fit)
 *        └─ anchorGroup position = −a_G (garment-local semantic anchor)
 *            └─ gltfRoot  original GLB transform, untouched
 *                └─ nodes original GLB transforms; sleeves articulated on top of their rest
 *
 * MESH ROLES (decided from metadata.construction, not node names alone)
 *   simulated   — the mesh simulation-data.json was built for (XPBD, mapped to render verts)
 *   deformed    — correspondence push-out from immutable rest positions
 *   articulated — sleeves of garments with sleeves: rigid geometry, rotated about the seam
 *   rigid       — everything else (e.g. the sleeveless top's 2 cm cap stubs)
 */

import * as THREE from 'three';
import { GarmentMetadata } from './types';
import { MHRBodyProxy } from './mhr-body-proxy';
import {
  computeSemanticAnchor,
  applyNecklineOffset,
  captureRestTransforms,
  SleeveRig,
  SemanticAnchorResult,
  bodyDirToGarment,
} from './garment-rig';
import {
  TriangleBVH,
  RestPoseDeformer,
  CorrespondenceField,
  deformAgainstBody,
  weldNormals,
} from './garment-correspondence';
import { XPBDClothSolver } from './xpbd-cloth-solver';

export interface SimulationData {
  positions: number[];
  indices: number[];
  anchorWeights: number[];
}

/**
 * attached — sleeves (2026-11-07 fix, item 5): rigid, NOT articulated; their seam region is bound to the torso
 * surface (barycentric, from rest) so deformation / simulation of the torso never opens a gap at the armhole.
 */
export type MeshRole = 'simulated' | 'deformed' | 'attached' | 'articulated' | 'rigid';

interface SeamBinding {
  sleeve: MeshRecord;
  torso: MeshRecord;
  verts: Int32Array; // sleeve vertex indices with weight > 0
  tri: Int32Array; // torso triangle per bound vertex
  bary: Float32Array; // 3 per bound vertex
  w: Float32Array; // seam weight per bound vertex (1 at the seam → 0 by mid-sleeve)
  torsoToSleeveLin: THREE.Matrix3;
  out: Float32Array;
}

/** Fraction of the sleeve length (from the seam) over which the torso-binding weight falls from 1 to 0. */
const SEAM_BINDING_FALLOFF = 0.5;

export interface MeshRecord {
  mesh: THREE.Mesh;
  role: MeshRole;
  restPositions: Float32Array;
  restNormals: Float32Array | null;
  indices: ArrayLike<number> | null;
  deformer: RestPoseDeformer | null;
  deformedPositions: Float32Array;
  scratchBody: Float32Array;
  field: CorrespondenceField | null;
  displacedVertices: number;
  normalScratch: Float32Array;
}

interface SimulationBinding {
  record: MeshRecord;
  solver: XPBDClothSolver;
  simRest: Float32Array;
  /** k nearest particles per render vertex and their weights (inverse-distance). */
  renderIdx: Int32Array;
  renderW: Float32Array;
  k: number;
  /** nearest render vertex per particle (for the skin target). */
  particleToRender: Int32Array;
  skinScratch: Float32Array;
  needsReset: boolean;
}

export interface GarmentUpdateParams {
  bodyProxy: MHRBodyProxy;
  bodyRoot: THREE.Object3D;
  dt: number;
  nowMs: number;
  armDirsBody: { left: THREE.Vector3 | null; right: THREE.Vector3 | null };
  /** Shoulder→wrist chords (used for rigid long sleeves; falls back to armDirsBody). */
  fullArmDirsBody?: { left: THREE.Vector3 | null; right: THREE.Vector3 | null };
  targetScale: THREE.Vector3;
  tracking: boolean;
  /** Body-root acceleration in camera space (m/s²), for inertial coupling. */
  frameAccelWorld: THREE.Vector3;
}

export interface GarmentDebugFlags {
  bounds: boolean;
  anchors: boolean;
  correspondence: boolean;
  collisionNormals: boolean;
}

export interface GarmentDiagnostics {
  id: string;
  bboxMin: [number, number, number];
  bboxMax: [number, number, number];
  garmentAnchorLocal: [number, number, number];
  anchorSource: 'geometry' | 'metadata';
  anchorMetadataDeltaM: number;
  bodyAnchorLocal: [number, number, number];
  bodyAnchorType: string;
  anchorAlignmentErrorM: number;
  worldPosition: [number, number, number];
  worldEulerDeg: [number, number, number];
  scale: [number, number, number];
  deformation: { mode: string; displacedVertices: number; validCorrespondences: number; totalVertices: number; degenerateTriangles: number; lastBuildMs: number };
  simulation: {
    state: 'running' | 'paused' | 'disabled';
    reason: string | null;
    particles: number;
    stretchConstraints: number;
    bendConstraints: number;
    lraConstraints: number;
    pinned: number;
    stepMs: number;
    fixedSteps: number;
    collisions: number;
    maxPenetrationMm: number;
    maxStrainPct: number;
  };
  meshes: { name: string; role: MeshRole; vertices: number }[];
  neckline?: {
    garmentNecklineLocal: [number, number, number];
    garmentNecklineBodyLocal: [number, number, number];
    bodyNeckLocal: [number, number, number];
    bodyBaseOfNeckLocal: [number, number, number];
    necklineDispMm?: number;
    /** Signed vertical delta in mm (positive = garment neckline above body base-of-neck, negative = below). */
    necklineVerticalDeltaMm: number;
    projectedDisplacementPx?: number;
    appliedOffsetY: number;
    effectiveWorldOffsetMm: number;
    garmentId: string;
  };
}

const GRAVITY_WORLD = new THREE.Vector3(0, -9.81, 0);
const CORRESPONDENCE_MAX_DISTANCE_M = 0.25;
const REBUILD_MIN_INTERVAL_MS = 100;
const DEFORM_SMOOTHING_ITERATIONS = 4;
const SCALE_TAU_S = 0.3;
/**
 * Shoulder seam width relative to the MediaPipe shoulder-JOINT span (2026-11-07 fix, item 3). The seam sits on the
 * acromion, ≈ 12 % lateral of the joint centres; the user's acceptance band is 1.05–1.20.
 */
export const SHOULDER_SEAM_TO_JOINT_SPAN = 1.12;

function plainFloat32Attribute(geom: THREE.BufferGeometry, name: string): THREE.BufferAttribute | null {
  const attr = geom.getAttribute(name) as THREE.BufferAttribute | THREE.InterleavedBufferAttribute | undefined;
  if (!attr) return null;
  if ((attr as THREE.InterleavedBufferAttribute).isInterleavedBufferAttribute || !(attr.array instanceof Float32Array)) {
    const arr = new Float32Array(attr.count * attr.itemSize);
    for (let i = 0; i < attr.count; i++) {
      for (let c = 0; c < attr.itemSize; c++) arr[i * attr.itemSize + c] = attr.getComponent(i, c);
    }
    const plain = new THREE.BufferAttribute(arr, attr.itemSize);
    geom.setAttribute(name, plain);
    return plain;
  }
  return attr as THREE.BufferAttribute;
}

export class GarmentInstance {
  readonly metadata: GarmentMetadata;
  readonly wrapper: THREE.Group;
  readonly anchorGroup: THREE.Group;
  readonly gltfRoot: THREE.Object3D;
  readonly anchor: SemanticAnchorResult;
  readonly neckline: THREE.Vector3;
  readonly meshes: MeshRecord[] = [];
  readonly sleeveRig: SleeveRig;
  readonly bboxLocal: THREE.Box3;
  readonly sim: SimulationBinding | null = null;
  /** Horizontal distance between the GLB's two shoulder seam points (garment-local m); null for waist anchors. */
  readonly seamWidthM: number | null = null;
  readonly simDisabledReason: string | null = null;

  private bvh: { version: number; bvh: TriangleBVH } | null = null;
  private seamBindings: SeamBinding[] = [];
  private deformKey = '';
  private pendingKey = '';
  private lastBuildAt = -Infinity;
  private lastBuildMs = 0;
  private currentScale = new THREE.Vector3(1, 1, 1);
  private scaleInitialized = false;
  private wasTracking = false;

  private readonly _bodyInv = new THREE.Matrix4();
  private readonly _meshToBody = new THREE.Matrix4();
  private readonly _meshWorldInvLin = new THREE.Matrix3();
  private readonly _gravity = new THREE.Vector3();
  private readonly _accel = new THREE.Vector3();
  private readonly _scaleTarget = new THREE.Vector3(1, 1, 1);

  private debugGroupGarment: THREE.Group | null = null;
  private debugGroupBody: THREE.Group | null = null;
  private debugFlags: GarmentDebugFlags = { bounds: false, anchors: false, correspondence: false, collisionNormals: false };
  private correspondenceLines: THREE.LineSegments | null = null;
  private collisionLines: THREE.LineSegments | null = null;

  constructor(gltfRoot: THREE.Object3D, metadata: GarmentMetadata, simData: SimulationData | null) {
    this.metadata = metadata;
    this.gltfRoot = gltfRoot;
    this.anchorGroup = new THREE.Group();
    this.anchorGroup.name = `garment_anchor_${metadata.id}`;
    this.anchorGroup.add(gltfRoot);
    this.wrapper = new THREE.Group();
    this.wrapper.name = `garment_wrapper_${metadata.id}`;
    this.wrapper.add(this.anchorGroup);

    // Semantic anchor from geometry, in anchorGroup-local (= garment-local) coordinates.
    this.anchor = computeSemanticAnchor(this.anchorGroup, metadata);
    this.anchorGroup.position.copy(this.anchor.anchor).negate();

    if (metadata.modelAnchor.type === 'shoulder_center' && this.anchor.featurePoints.length >= 2) {
      (this as { seamWidthM: number | null }).seamWidthM = Math.abs(this.anchor.featurePoints[0].x - this.anchor.featurePoints[1].x);
    }

    // Neckline reference from geometry or anchor
    this.neckline = this.anchor.neckline ? this.anchor.neckline.clone() : this.anchor.anchor.clone();
    if (metadata.fittingProfile?.necklineOffsetY) {
      const offset = metadata.fittingProfile.necklineOffsetY;
      applyNecklineOffset(this.anchorGroup, offset, metadata.construction?.simulationMesh);
      this.neckline.y += offset;
    }

    // Capture rest transforms and initialize dynamic sleeve rig
    const rest = captureRestTransforms(this.anchorGroup);
    this.sleeveRig = SleeveRig.fromGarment(this.anchorGroup, metadata, rest);
    const attachSleeves = metadata.construction?.sleeves !== 'none';
    const sleeveNames = new Set(['left_sleeve', 'right_sleeve']);

    this.bboxLocal = new THREE.Box3();
    this.anchorGroup.updateMatrixWorld(true);
    const agInv = new THREE.Matrix4().copy(this.anchorGroup.matrixWorld).invert();

    gltfRoot.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const geom = mesh.geometry;
      const pos = plainFloat32Attribute(geom, 'position');
      if (!pos) return;
      plainFloat32Attribute(geom, 'normal');
      let role: MeshRole;
      if (sleeveNames.has(mesh.name)) role = attachSleeves ? 'attached' : 'rigid';
      else role = 'deformed';

      const restPositions = new Float32Array(pos.array as Float32Array);
      const nrm = geom.getAttribute('normal') as THREE.BufferAttribute | undefined;
      const idx = geom.getIndex();
      const rec: MeshRecord = {
        mesh,
        role,
        restPositions,
        restNormals: nrm ? new Float32Array(nrm.array as Float32Array) : null,
        indices: idx ? (idx.array as ArrayLike<number>) : null,
        deformer: role === 'deformed' ? new RestPoseDeformer(restPositions, idx ? (idx.array as ArrayLike<number>) : null) : null,
        deformedPositions: new Float32Array(restPositions),
        scratchBody: new Float32Array(restPositions.length),
        field: null,
        displacedVertices: 0,
        normalScratch: new Float32Array(restPositions.length),
      };
      if (role === 'deformed') pos.setUsage(THREE.DynamicDrawUsage);
      this.meshes.push(rec);

      const toAg = new THREE.Matrix4().multiplyMatrices(agInv, mesh.matrixWorld);
      geom.computeBoundingBox();
      this.bboxLocal.union(geom.boundingBox!.clone().applyMatrix4(toAg));
    });

    // Simulation binding.
    const sim = this.bindSimulation(simData);
    (this as { sim: SimulationBinding | null }).sim = sim.binding;
    (this as { simDisabledReason: string | null }).simDisabledReason = sim.reason;
    if (sim.binding) sim.binding.record.role = 'simulated';
    this.seamBindings = this.buildSeamBindings();
  }

  private bindSimulation(simData: SimulationData | null): { binding: SimulationBinding | null; reason: string | null } {
    const cfg = this.metadata.simulation;
    if (!cfg.enabled) return { binding: null, reason: 'disabled_in_metadata' };
    if (!simData || !simData.positions?.length || !simData.indices?.length) return { binding: null, reason: 'no_simulation_data' };
    const record = this.meshes.find((m) => m.mesh.name === this.metadata.construction?.simulationMesh && m.role === 'deformed');
    if (!record) return { binding: null, reason: `simulation_mesh_missing:${this.metadata.construction?.simulationMesh}` };

    const simRest = Float32Array.from(simData.positions);
    const nP = simRest.length / 3;
    const render = record.restPositions;
    const nV = render.length / 3;

    if (nP === nV) {
      simRest.set(render);
    }

    // Sanity: both must be in the same (mesh-local) space.
    const bbox = (a: Float32Array) => new THREE.Box3().setFromArray(a);
    const bs = bbox(simRest);
    const br = bbox(render);
    if (bs.min.distanceTo(br.min) > 0.01 || bs.max.distanceTo(br.max) > 0.01) {
      return { binding: null, reason: 'simulation_space_mismatch' };
    }
    if (simData.anchorWeights.length !== nP) return { binding: null, reason: 'anchor_weight_count_mismatch' };

    // Render vertex → k nearest particles (exact match ⇒ k collapses to 1 with weight 1).
    const k = nP === nV ? 1 : 3;
    const renderIdx = new Int32Array(nV * k);
    const renderW = new Float32Array(nV * k);
    const bestD = new Float64Array(k);
    const bestI = new Int32Array(k);
    let maxNearest = 0;
    for (let i = 0; i < nV; i++) {
      bestD.fill(Infinity);
      bestI.fill(-1);
      const x = render[i * 3], y = render[i * 3 + 1], z = render[i * 3 + 2];
      for (let j = 0; j < nP; j++) {
        const dx = simRest[j * 3] - x, dy = simRest[j * 3 + 1] - y, dz = simRest[j * 3 + 2] - z;
        const d = dx * dx + dy * dy + dz * dz;
        if (d < bestD[k - 1]) {
          let s = k - 1;
          while (s > 0 && bestD[s - 1] > d) { bestD[s] = bestD[s - 1]; bestI[s] = bestI[s - 1]; s--; }
          bestD[s] = d;
          bestI[s] = j;
        }
      }
      maxNearest = Math.max(maxNearest, Math.sqrt(bestD[0]));
      let wSum = 0;
      for (let s = 0; s < k; s++) {
        const w = 1 / (Math.sqrt(bestD[s]) + 1e-4);
        renderIdx[i * k + s] = bestI[s];
        renderW[i * k + s] = w;
        wSum += w;
      }
      for (let s = 0; s < k; s++) renderW[i * k + s] /= wSum;
    }
    if (k === 1 && maxNearest > 0.002) return { binding: null, reason: 'simulation_vertex_mismatch' };

    const particleToRender = new Int32Array(nP);
    for (let j = 0; j < nP; j++) {
      let best = 0;
      let bd = Infinity;
      for (let i = 0; i < nV; i++) {
        const dx = simRest[j * 3] - render[i * 3], dy = simRest[j * 3 + 1] - render[i * 3 + 1], dz = simRest[j * 3 + 2] - render[i * 3 + 2];
        const d = dx * dx + dy * dy + dz * dz;
        if (d < bd) { bd = d; best = i; }
      }
      particleToRender[j] = best;
    }

    const solver = new XPBDClothSolver(cfg, this.metadata.fabric.densityGsm);
    solver.initializeMesh(simRest, simData.indices, Float32Array.from(simData.anchorWeights));
    (record.mesh.geometry.getAttribute('position') as THREE.BufferAttribute).setUsage(THREE.DynamicDrawUsage);
    return {
      binding: { record, solver, simRest, renderIdx, renderW, k, particleToRender, skinScratch: new Float32Array(simRest.length), needsReset: true },
      reason: null,
    };
  }

  private getBVH(proxy: MHRBodyProxy): TriangleBVH {
    if (!this.bvh || this.bvh.version !== proxy.version) {
      const s = proxy.getSurfaceMesh();
      this.bvh = { version: proxy.version, bvh: new TriangleBVH(s.positions, s.indices) };
    }
    return this.bvh.bvh;
  }

  /** Rebuilds correspondence + rest-based deformation for all deformable meshes. */
  rebuildDeformation(proxy: MHRBodyProxy, bodyRoot: THREE.Object3D): void {
    const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const bvh = this.getBVH(proxy);
    const sections = proxy.getSections();
    const yRange: [number, number] = [sections[sections.length - 1].y, sections[0].y];
    this._bodyInv.copy(bodyRoot.matrixWorld).invert();
    const clearance = this.metadata.simulation.collisionTolerance || 0.01;

    for (const rec of this.meshes) {
      if (rec.role !== 'deformed' && rec.role !== 'simulated') continue;
      this._meshToBody.multiplyMatrices(this._bodyInv, rec.mesh.matrixWorld);
      if (!rec.deformer) rec.deformer = new RestPoseDeformer(rec.restPositions, rec.indices);
      const r = deformAgainstBody(
        rec.deformer,
        rec.restPositions,
        bvh,
        this._meshToBody,
        { maxDistanceM: CORRESPONDENCE_MAX_DISTANCE_M, yRange, clearanceM: clearance, smoothingIterations: DEFORM_SMOOTHING_ITERATIONS },
        rec.deformedPositions,
        rec.scratchBody
      );
      rec.field = r.field;
      rec.displacedVertices = r.displaced;
      if (rec.role === 'deformed') this.writeGeometry(rec, rec.deformedPositions);
      if (rec.role === 'deformed' && rec.mesh.name === this.metadata.construction?.simulationMesh) this.updateSeamBindings();
    }

    if (this.sim) {
      const { record, simRest, particleToRender, skinScratch, solver } = this.sim;
      for (let j = 0; j < simRest.length / 3; j++) {
        const r = particleToRender[j] * 3;
        skinScratch[j * 3] = simRest[j * 3] + record.deformedPositions[r] - record.restPositions[r];
        skinScratch[j * 3 + 1] = simRest[j * 3 + 1] + record.deformedPositions[r + 1] - record.restPositions[r + 1];
        skinScratch[j * 3 + 2] = simRest[j * 3 + 2] + record.deformedPositions[r + 2] - record.restPositions[r + 2];
      }
      solver.updateSkinPositions(skinScratch);
      solver.setRestShape(skinScratch);
      if (this.sim.needsReset) {
        solver.reset();
        this.sim.needsReset = false;
      }
      this.writeSimulated();
    }
    this.lastBuildMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0;
    if (this.debugFlags.correspondence) this.rebuildCorrespondenceLines();
  }

  private recomputeNormals(rec: MeshRecord): void {
    const geom = rec.mesh.geometry;
    geom.computeVertexNormals();
    if (rec.deformer) {
      const n = geom.getAttribute('normal') as THREE.BufferAttribute;
      weldNormals(n.array as Float32Array, rec.deformer.weldId, rec.deformer.weldCount, rec.normalScratch);
      n.needsUpdate = true;
    }
  }

  private writeGeometry(rec: MeshRecord, positions: Float32Array): void {
    const geom = rec.mesh.geometry;
    const pos = geom.getAttribute('position') as THREE.BufferAttribute;
    (pos.array as Float32Array).set(positions);
    pos.needsUpdate = true;
    this.recomputeNormals(rec);
    geom.computeBoundingSphere();
    geom.computeBoundingBox();
  }

  /**
   * Seam binding: sleeve vertices near the seam are bound (rest barycentrics) to the nearest torso triangle; each
   * frame the torso's displacement from rest at that point is applied with the seam weight. From rest every time.
   */
  private buildSeamBindings(): SeamBinding[] {
    const torso = this.meshes.find((m) => m.mesh.name === this.metadata.construction?.simulationMesh);
    if (!torso || !torso.indices) return [];
    this.anchorGroup.updateMatrixWorld(true);
    const out: SeamBinding[] = [];
    for (const sleeve of this.meshes.filter((m) => m.role === 'attached')) {
      const uv = sleeve.mesh.geometry.getAttribute('uv');
      if (!uv) continue;
      const toSleeve = new THREE.Matrix4().copy(sleeve.mesh.matrixWorld).invert().multiply(torso.mesh.matrixWorld);
      const tp = new Float32Array(torso.restPositions.length);
      const e = toSleeve.elements;
      for (let i = 0; i < tp.length; i += 3) {
        const x = torso.restPositions[i], y = torso.restPositions[i + 1], z = torso.restPositions[i + 2];
        tp[i] = e[0] * x + e[4] * y + e[8] * z + e[12];
        tp[i + 1] = e[1] * x + e[5] * y + e[9] * z + e[13];
        tp[i + 2] = e[2] * x + e[6] * y + e[10] * z + e[14];
      }
      const bvh = new TriangleBVH(tp, Uint32Array.from(torso.indices as ArrayLike<number>));
      // Seam end = the uv row (0 or 1) whose vertices are closest to the torso.
      const near = { triangle: -1, distSq: 0, point: new THREE.Vector3(), bary: [0, 0, 0] as [number, number, number] };
      const rp = sleeve.restPositions;
      const rowDist = (v: number) => {
        let sum = 0, n = 0;
        for (let i = 0; i < uv.count; i++) if (Math.abs(uv.getY(i) - v) < 1e-4) {
          bvh.nearest(new THREE.Vector3(rp[i * 3], rp[i * 3 + 1], rp[i * 3 + 2]), 10, near);
          sum += Math.sqrt(near.distSq); n++;
        }
        return n ? sum / n : Infinity;
      };
      const seamAtZero = rowDist(0) <= rowDist(1);
      const verts: number[] = [], tri: number[] = [], bary: number[] = [], w: number[] = [];
      for (let i = 0; i < uv.count; i++) {
        const t = seamAtZero ? uv.getY(i) : 1 - uv.getY(i);
        const wi = Math.max(0, 1 - t / SEAM_BINDING_FALLOFF);
        if (wi <= 0) continue;
        bvh.nearest(new THREE.Vector3(rp[i * 3], rp[i * 3 + 1], rp[i * 3 + 2]), 10, near);
        if (near.triangle < 0) continue;
        verts.push(i); tri.push(near.triangle); bary.push(...near.bary); w.push(wi);
      }
      out.push({
        sleeve, torso,
        verts: Int32Array.from(verts), tri: Int32Array.from(tri), bary: Float32Array.from(bary), w: Float32Array.from(w),
        torsoToSleeveLin: new THREE.Matrix3().setFromMatrix4(toSleeve),
        out: new Float32Array(rp.length),
      });
      (sleeve.mesh.geometry.getAttribute('position') as THREE.BufferAttribute).setUsage(THREE.DynamicDrawUsage);
      if (!sleeve.deformer) sleeve.deformer = new RestPoseDeformer(sleeve.restPositions, sleeve.indices); // weld ids for normals
    }
    return out;
  }

  private updateSeamBindings(): void {
    for (const b of this.seamBindings) {
      const cur = b.torso.mesh.geometry.getAttribute('position').array as Float32Array;
      const rest = b.torso.restPositions;
      const idx = b.torso.indices!;
      const m = b.torsoToSleeveLin.elements;
      b.out.set(b.sleeve.restPositions);

      const slNode = b.sleeve.mesh;
      const qRel = slNode.quaternion;
      const pRel = slNode.position;
      const qInv = qRel.clone().invert();
      const isSwung = Math.abs(qRel.w) < 0.9999 || pRel.lengthSq() > 1e-8;

      for (let k = 0; k < b.verts.length; k++) {
        const t = b.tri[k] * 3;
        let dx = 0, dy = 0, dz = 0;
        for (let c = 0; c < 3; c++) {
          const vi = idx[t + c] * 3, bw = b.bary[k * 3 + c];
          dx += bw * (cur[vi] - rest[vi]); dy += bw * (cur[vi + 1] - rest[vi + 1]); dz += bw * (cur[vi + 2] - rest[vi + 2]);
        }
        const s3 = b.verts[k] * 3, wk = b.w[k];
        const rx = b.sleeve.restPositions[s3] + (m[0] * dx + m[3] * dy + m[6] * dz);
        const ry = b.sleeve.restPositions[s3 + 1] + (m[1] * dx + m[4] * dy + m[7] * dz);
        const rz = b.sleeve.restPositions[s3 + 2] + (m[2] * dx + m[5] * dy + m[8] * dz);

        if (isSwung) {
          const vComp = new THREE.Vector3(rx - pRel.x, ry - pRel.y, rz - pRel.z).applyQuaternion(qInv);
          b.out[s3] = b.sleeve.restPositions[s3] * (1 - wk) + vComp.x * wk;
          b.out[s3 + 1] = b.sleeve.restPositions[s3 + 1] * (1 - wk) + vComp.y * wk;
          b.out[s3 + 2] = b.sleeve.restPositions[s3 + 2] * (1 - wk) + vComp.z * wk;
        } else {
          b.out[s3] = b.sleeve.restPositions[s3] + wk * (m[0] * dx + m[3] * dy + m[6] * dz);
          b.out[s3 + 1] = b.sleeve.restPositions[s3 + 1] + wk * (m[1] * dx + m[4] * dy + m[7] * dz);
          b.out[s3 + 2] = b.sleeve.restPositions[s3 + 2] + wk * (m[2] * dx + m[5] * dy + m[8] * dz);
        }
      }
      this.writeGeometry(b.sleeve, b.out);
    }
  }

  /** render = deformedRest + Σ w·(particle − skinTarget). */
  private writeSimulated(): void {
    if (!this.sim) return;
    const { record, solver, renderIdx, renderW, k } = this.sim;
    const x = solver.getSimulatedPositions();
    const skin = solver.getSkinPositions();
    if (!x) return;
    const geom = record.mesh.geometry;
    const pos = geom.getAttribute('position') as THREE.BufferAttribute;
    const out = pos.array as Float32Array;
    const base = record.deformedPositions;
    for (let i = 0; i < base.length / 3; i++) {
      let dx = 0, dy = 0, dz = 0;
      for (let s = 0; s < k; s++) {
        const j = renderIdx[i * k + s] * 3;
        const w = renderW[i * k + s];
        dx += w * (x[j] - skin[j]);
        dy += w * (x[j + 1] - skin[j + 1]);
        dz += w * (x[j + 2] - skin[j + 2]);
      }
      out[i * 3] = base[i * 3] + dx;
      out[i * 3 + 1] = base[i * 3 + 1] + dy;
      out[i * 3 + 2] = base[i * 3 + 2] + dz;
    }
    pos.needsUpdate = true;
    this.recomputeNormals(record);
    geom.computeBoundingSphere();
    this.updateSeamBindings();
  }

  update(p: GarmentUpdateParams): void {
    // 1. Anchor relationship: wrapper at the body attachment anchor, scaled about it.
    const bodyAnchor = p.bodyProxy.getAttachmentAnchor(this.metadata.modelAnchor.type);
    this.wrapper.position.copy(bodyAnchor);
    // Uniform size from the body's shoulder breadth (tops / dresses); waist-anchored garments keep the scene's target.
    const target = this.seamWidthM
      ? this._scaleTarget.setScalar((SHOULDER_SEAM_TO_JOINT_SPAN * p.bodyProxy.getShape().shoulderBreadthM) / this.seamWidthM)
      : this._scaleTarget.copy(p.targetScale);
    if (!this.scaleInitialized) {
      this.currentScale.copy(target);
      this.scaleInitialized = true;
    } else {
      this.currentScale.lerp(target, 1 - Math.exp(-Math.max(0, p.dt) / SCALE_TAU_S));
    }
    this.wrapper.scale.copy(this.currentScale);
    this.wrapper.updateWorldMatrix(true, true);

    // 2. Sleeve articulation: compose arm swing with preserved rest transforms
    const dirs = (this.metadata.construction?.sleeves === 'long' && p.fullArmDirsBody)
      ? p.fullArmDirsBody
      : p.armDirsBody;
    const armDirGarment = {
      left: dirs.left ? bodyDirToGarment(dirs.left, this.currentScale) : null,
      right: dirs.right ? bodyDirToGarment(dirs.right, this.currentScale) : null,
    };
    this.sleeveRig.update(armDirGarment, p.dt);
    if (this.seamBindings.length > 0) this.updateSeamBindings();

    // 3. Correspondence + deformation only when the configuration changed.
    const s = this.currentScale;
    const key = `${p.bodyProxy.version}|${s.x.toFixed(4)},${s.y.toFixed(4)},${s.z.toFixed(4)}|${bodyAnchor.y.toFixed(4)}`;
    if (key !== this.deformKey) {
      this.pendingKey = key;
      if (p.nowMs - this.lastBuildAt >= REBUILD_MIN_INTERVAL_MS) {
        this.rebuildDeformation(p.bodyProxy, p.bodyRoot);
        this.deformKey = key;
        this.lastBuildAt = p.nowMs;
      }
    }

    // 4. Cloth simulation (paused while untracked; reset on re-acquisition).
    if (this.sim) {
      if (p.tracking && !this.wasTracking) this.sim.needsReset = true;
      if (p.tracking) {
        if (this.sim.needsReset) {
          this.sim.solver.reset();
          this.sim.needsReset = false;
        }
        const mesh = this.sim.record.mesh;
        this._bodyInv.copy(p.bodyRoot.matrixWorld).invert();
        this._meshToBody.multiplyMatrices(this._bodyInv, mesh.matrixWorld);
        this._meshWorldInvLin.setFromMatrix4(mesh.matrixWorld).invert();
        this._gravity.copy(GRAVITY_WORLD).applyMatrix3(this._meshWorldInvLin);
        this._accel.copy(p.frameAccelWorld).applyMatrix3(this._meshWorldInvLin);
        const steps = this.sim.solver.step(p.dt, {
          bodyProxy: p.bodyProxy,
          simToBody: this._meshToBody,
          gravity: this._gravity,
          frameAccel: this._accel,
        });
        if (steps > 0) {
          this.writeSimulated();
          if (this.debugFlags.collisionNormals) this.rebuildCollisionLines(p.bodyProxy);
        }
      }
    }
    this.wasTracking = p.tracking;
  }

  /** True if a deformation rebuild is pending (throttled). */
  get hasPendingRebuild(): boolean {
    return this.pendingKey !== this.deformKey;
  }

  attach(bodyRoot: THREE.Object3D): void {
    bodyRoot.add(this.wrapper);
    if (this.debugGroupBody) bodyRoot.add(this.debugGroupBody);
    if (this.sim) this.sim.needsReset = true;
    this.deformKey = '';
    this.lastBuildAt = -Infinity;
  }

  detach(): void {
    this.wrapper.parent?.remove(this.wrapper);
    this.debugGroupBody?.parent?.remove(this.debugGroupBody);
    this.sleeveRig.resetToRest();
  }

  // ------------------------------------------------------------------------- debug layers

  setDebug(flags: GarmentDebugFlags, proxy: MHRBodyProxy): void {
    this.debugFlags = { ...flags };
    if (!this.debugGroupGarment) {
      this.debugGroupGarment = new THREE.Group();
      this.debugGroupGarment.name = 'garment_debug_local';
      this.anchorGroup.add(this.debugGroupGarment);
      this.debugGroupBody = new THREE.Group();
      this.debugGroupBody.name = 'garment_debug_body';
      this.wrapper.parent?.add(this.debugGroupBody);

      const box = new THREE.Box3Helper(this.bboxLocal, 0xffaa00);
      box.name = 'debug_bounds';
      this.debugGroupGarment.add(box);

      const mk = (color: number, name: string) => {
        const m = new THREE.Mesh(new THREE.SphereGeometry(0.012, 12, 8), new THREE.MeshBasicMaterial({ color, depthTest: false }));
        m.renderOrder = 10;
        m.name = name;
        return m;
      };
      const ga = mk(0xd4ff00, 'debug_garment_anchor');
      ga.position.copy(this.anchor.anchor);
      this.debugGroupGarment.add(ga);
      const ba = mk(0x294bff, 'debug_body_anchor');
      this.debugGroupBody.add(ba);
    }
    const ba = this.debugGroupBody!.getObjectByName('debug_body_anchor')!;
    ba.position.copy(proxy.getAttachmentAnchor(this.metadata.modelAnchor.type));
    this.debugGroupGarment.getObjectByName('debug_bounds')!.visible = flags.bounds;
    this.debugGroupGarment.getObjectByName('debug_garment_anchor')!.visible = flags.anchors;
    ba.visible = flags.anchors;
    if (flags.correspondence) this.rebuildCorrespondenceLines();
    if (this.correspondenceLines) this.correspondenceLines.visible = flags.correspondence;
    if (this.collisionLines) this.collisionLines.visible = flags.collisionNormals;
  }

  private ensureLines(existing: THREE.LineSegments | null, color: number, name: string): THREE.LineSegments {
    if (existing) return existing;
    const l = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color, depthTest: false, transparent: true, opacity: 0.8 }));
    l.name = name;
    l.renderOrder = 9;
    l.frustumCulled = false;
    this.debugGroupBody?.add(l);
    return l;
  }

  /** Lines (body-local) from every 3rd valid garment vertex to its closest body point. */
  private rebuildCorrespondenceLines(): void {
    if (!this.debugGroupBody) return;
    const pts: number[] = [];
    for (const rec of this.meshes) {
      if (!rec.field) continue;
      for (let i = 0; i < rec.field.count; i += 3) {
        if (!rec.field.valid[i]) continue;
        pts.push(rec.scratchBody[i * 3], rec.scratchBody[i * 3 + 1], rec.scratchBody[i * 3 + 2]);
        pts.push(rec.field.closestPoint[i * 3], rec.field.closestPoint[i * 3 + 1], rec.field.closestPoint[i * 3 + 2]);
      }
    }
    this.correspondenceLines = this.ensureLines(this.correspondenceLines, 0x00e0ff, 'debug_correspondence');
    this.correspondenceLines.geometry.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    this.correspondenceLines.visible = this.debugFlags.correspondence;
  }

  /** 3 cm body normals at simulated particles within 2× tolerance of the body (body-local). */
  private rebuildCollisionLines(proxy: MHRBodyProxy): void {
    if (!this.sim || !this.debugGroupBody) return;
    const x = this.sim.solver.getSimulatedPositions();
    if (!x) return;
    const e = this._meshToBody.elements;
    const tol = (this.metadata.simulation.collisionTolerance || 0.01) * 2;
    const pts: number[] = [];
    const r = { distance: 0, normal: new THREE.Vector3() };
    for (let i = 0; i < x.length / 3; i += 2) {
      const sx = x[i * 3], sy = x[i * 3 + 1], sz = x[i * 3 + 2];
      const bx = e[0] * sx + e[4] * sy + e[8] * sz + e[12];
      const by = e[1] * sx + e[5] * sy + e[9] * sz + e[13];
      const bz = e[2] * sx + e[6] * sy + e[10] * sz + e[14];
      proxy.signedDistance(bx, by, bz, r);
      if (r.distance < tol) pts.push(bx, by, bz, bx + r.normal.x * 0.03, by + r.normal.y * 0.03, bz + r.normal.z * 0.03);
    }
    this.collisionLines = this.ensureLines(this.collisionLines, 0xff3b30, 'debug_collision_normals');
    this.collisionLines.geometry.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    this.collisionLines.visible = this.debugFlags.collisionNormals;
  }

  // ------------------------------------------------------------------------- diagnostics

  diagnostics(proxy: MHRBodyProxy, bodyRoot: THREE.Object3D, tracking: boolean, camera?: THREE.PerspectiveCamera): GarmentDiagnostics {
    const bodyAnchor = proxy.getAttachmentAnchor(this.metadata.modelAnchor.type);
    const worldG = this.anchorGroup.localToWorld(this.anchor.anchor.clone());
    const worldB = bodyRoot.localToWorld(bodyAnchor.clone());
    const pos = new THREE.Vector3();
    const q = new THREE.Quaternion();
    const sc = new THREE.Vector3();
    this.anchorGroup.matrixWorld.decompose(pos, q, sc);
    const eul = new THREE.Euler().setFromQuaternion(q, 'YXZ');
    const deg = (r: number) => (r * 180) / Math.PI;
    let valid = 0, total = 0, degenerate = 0, displaced = 0;
    for (const m of this.meshes) {
      if (m.field) {
        valid += m.field.validCount;
        total += m.field.count;
        degenerate = Math.max(degenerate, m.field.degenerateTriangles);
      }
      displaced += m.displacedVertices;
    }
    const sim = this.sim;
    const t3 = (v: THREE.Vector3): [number, number, number] => [v.x, v.y, v.z];

    const bodyNeckAnchor = proxy.getAttachmentAnchor('neckline_center');
    const bodyBaseOfNeck = proxy.getAttachmentAnchor('base_of_neck');
    let projectedDisplacementPx: number | undefined;
    let necklineDispMm: number | undefined;
    let necklineVerticalDeltaMm: number | undefined;
    let garmentNecklineBodyLocal: [number, number, number] | undefined;
    const appliedOffsetY = this.metadata.fittingProfile?.necklineOffsetY ?? 0;
    const effectiveWorldOffsetMm = appliedOffsetY * this.currentScale.y * 1000;

    if (this.neckline) {
      const worldGNeck = this.anchorGroup.localToWorld(this.neckline.clone());
      const bodyGNeck = bodyRoot.worldToLocal(worldGNeck.clone());
      garmentNecklineBodyLocal = t3(bodyGNeck);
      // Signed vertical delta: positive = garment neckline sits above body base-of-neck reference; negative = below.
      necklineVerticalDeltaMm = (bodyGNeck.y - bodyBaseOfNeck.y) * 1000;

      const worldBBase = bodyRoot.localToWorld(bodyBaseOfNeck.clone());
      necklineDispMm = worldGNeck.distanceTo(worldBBase) * 1000;
      if (camera) {
        const vG = worldGNeck.project(camera);
        const vB = worldBBase.project(camera);
        const h = 720;
        const dxPx = ((vG.x - vB.x) / 2) * (h * camera.aspect);
        const dyPx = ((vG.y - vB.y) / 2) * h;
        projectedDisplacementPx = Math.hypot(dxPx, dyPx);
      }
    }
    return {
      id: this.metadata.id,
      bboxMin: t3(this.bboxLocal.min),
      bboxMax: t3(this.bboxLocal.max),
      garmentAnchorLocal: t3(this.anchor.anchor),
      anchorSource: this.anchor.source,
      anchorMetadataDeltaM: this.anchor.metadataDeltaM,
      bodyAnchorLocal: t3(bodyAnchor),
      bodyAnchorType: this.metadata.modelAnchor.type,
      anchorAlignmentErrorM: worldG.distanceTo(worldB),
      worldPosition: t3(pos),
      worldEulerDeg: [deg(eul.x), deg(eul.y), deg(eul.z)],
      scale: t3(this.currentScale),
      deformation: {
        mode: total > 0 ? 'correspondence_pushout' : 'rest',
        displacedVertices: displaced,
        validCorrespondences: valid,
        totalVertices: total,
        degenerateTriangles: degenerate,
        lastBuildMs: this.lastBuildMs,
      },
      simulation: sim
        ? {
            state: tracking ? 'running' : 'paused',
            reason: null,
            particles: sim.solver.particleCount,
            stretchConstraints: sim.solver.stretchConstraintCount,
            bendConstraints: sim.solver.bendingConstraintCount,
            lraConstraints: sim.solver.lraConstraintCount,
            pinned: sim.solver.pinnedCount,
            stepMs: sim.solver.stats.stepMs,
            fixedSteps: sim.solver.stats.fixedStepsLastFrame,
            collisions: sim.solver.stats.collisionsLastStep,
            maxPenetrationMm: sim.solver.stats.maxPenetrationM * 1000,
            maxStrainPct: sim.solver.maxStretchStrain() * 100,
          }
        : {
            state: 'disabled',
            reason: this.simDisabledReason,
            particles: 0, stretchConstraints: 0, bendConstraints: 0, lraConstraints: 0, pinned: 0,
            stepMs: 0, fixedSteps: 0, collisions: 0, maxPenetrationMm: 0, maxStrainPct: 0,
          },
      meshes: this.meshes.map((m) => ({ name: m.mesh.name || '(unnamed)', role: m.role, vertices: m.restPositions.length / 3 })),
      neckline: this.neckline
        ? {
            garmentNecklineLocal: t3(this.neckline),
            garmentNecklineBodyLocal: garmentNecklineBodyLocal ?? t3(this.neckline),
            bodyNeckLocal: t3(bodyNeckAnchor),
            bodyBaseOfNeckLocal: t3(bodyBaseOfNeck),
            necklineDispMm,
            necklineVerticalDeltaMm: necklineVerticalDeltaMm ?? 0,
            projectedDisplacementPx,
            appliedOffsetY,
            effectiveWorldOffsetMm,
            garmentId: this.metadata.id,
          }
        : undefined,
    };
  }

  dispose(): void {
    this.detach();
    const disposeObj = (o: THREE.Object3D) => {
      o.traverse((c) => {
        const m = c as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else mat?.dispose();
      });
    };
    disposeObj(this.wrapper);
    if (this.debugGroupBody) disposeObj(this.debugGroupBody);
  }
}
