/**
 * DRAPE Garment-to-Body Correspondence
 *
 * For every garment vertex (expressed in BODY-LOCAL space, see mhr-body-proxy.ts) this finds
 * the nearest body-proxy surface triangle with a bounding-volume hierarchy, the exact closest
 * point on that triangle (Ericson, "Real-Time Collision Detection", §5.1.5), its barycentric
 * coordinates, the interpolated surface normal and the signed normal offset h.
 *
 * Correspondence is rebuilt only when the garment, its fit scale or the body shape changes —
 * never per frame. Vertices whose nearest surface is farther than `maxDistanceM`, or that lie
 * outside the torso's vertical extent, are marked invalid and keep their rest geometry.
 *
 * Deformation is always computed from immutable rest positions:
 *     P_current = P_rest + L⁻¹ · D_body
 * where D_body is the smoothed push-out displacement that restores a minimum clearance
 * between garment and body, and L is the linear part of the mesh→body transform. The same
 * inputs always produce the same output (no in-place accumulation).
 */

import * as THREE from 'three';

// ---------------------------------------------------------------------------------------
// Closest point on triangle
// ---------------------------------------------------------------------------------------

export interface ClosestPointResult {
  point: THREE.Vector3;
  /** Barycentric weights (u, v, w) of a, b, c; each in [0,1], sum = 1. */
  bary: [number, number, number];
}

/** Ericson §5.1.5 — exact closest point of p on triangle abc with barycentrics. */
export function closestPointOnTriangle(
  p: THREE.Vector3,
  a: THREE.Vector3,
  b: THREE.Vector3,
  c: THREE.Vector3,
  out: ClosestPointResult = { point: new THREE.Vector3(), bary: [0, 0, 0] }
): ClosestPointResult {
  const abx = b.x - a.x, aby = b.y - a.y, abz = b.z - a.z;
  const acx = c.x - a.x, acy = c.y - a.y, acz = c.z - a.z;
  const apx = p.x - a.x, apy = p.y - a.y, apz = p.z - a.z;
  const d1 = abx * apx + aby * apy + abz * apz;
  const d2 = acx * apx + acy * apy + acz * apz;
  const set = (u: number, v: number, w: number) => {
    out.bary[0] = u; out.bary[1] = v; out.bary[2] = w;
    out.point.set(a.x * u + b.x * v + c.x * w, a.y * u + b.y * v + c.y * w, a.z * u + b.z * v + c.z * w);
    return out;
  };
  if (d1 <= 0 && d2 <= 0) return set(1, 0, 0);

  const bpx = p.x - b.x, bpy = p.y - b.y, bpz = p.z - b.z;
  const d3 = abx * bpx + aby * bpy + abz * bpz;
  const d4 = acx * bpx + acy * bpy + acz * bpz;
  if (d3 >= 0 && d4 <= d3) return set(0, 1, 0);

  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) {
    const v = d1 / (d1 - d3);
    return set(1 - v, v, 0);
  }

  const cpx = p.x - c.x, cpy = p.y - c.y, cpz = p.z - c.z;
  const d5 = abx * cpx + aby * cpy + abz * cpz;
  const d6 = acx * cpx + acy * cpy + acz * cpz;
  if (d6 >= 0 && d5 <= d6) return set(0, 0, 1);

  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) {
    const w = d2 / (d2 - d6);
    return set(1 - w, 0, w);
  }

  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) {
    const w = (d4 - d3) / (d4 - d3 + (d5 - d6));
    return set(0, 1 - w, w);
  }

  const denom = 1 / (va + vb + vc);
  const v = vb * denom;
  const w = vc * denom;
  return set(1 - v - w, v, w);
}

// ---------------------------------------------------------------------------------------
// Triangle BVH
// ---------------------------------------------------------------------------------------

interface BVHNode {
  min: [number, number, number];
  max: [number, number, number];
  left: number; // child node index or -1
  right: number;
  start: number; // range into triOrder for leaves
  count: number;
}

const LEAF_SIZE = 4;
const DEGENERATE_AREA2 = 1e-12; // |ab × ac|² below this ⇒ degenerate (area < 5e-7 m²)

export class TriangleBVH {
  readonly positions: Float32Array;
  readonly indices: Uint32Array;
  /** Triangles that survived the degeneracy test, permuted by the BVH build. */
  private triOrder: Int32Array;
  private nodes: BVHNode[] = [];
  readonly degenerateCount: number;
  readonly faceNormals: Float32Array;
  readonly vertexNormals: Float32Array;

  private readonly _a = new THREE.Vector3();
  private readonly _b = new THREE.Vector3();
  private readonly _c = new THREE.Vector3();
  private readonly _cp: ClosestPointResult = { point: new THREE.Vector3(), bary: [0, 0, 0] };

  constructor(positions: Float32Array, indices: Uint32Array) {
    this.positions = positions;
    this.indices = indices;
    const triCount = indices.length / 3;
    this.faceNormals = new Float32Array(triCount * 3);
    this.vertexNormals = new Float32Array(positions.length);

    const valid: number[] = [];
    for (let t = 0; t < triCount; t++) {
      this.triangle(t, this._a, this._b, this._c);
      const n = this._b.sub(this._a).cross(this._c.sub(this._a)); // area-weighted normal
      const area2 = n.lengthSq();
      if (area2 > DEGENERATE_AREA2) {
        valid.push(t);
        for (let k = 0; k < 3; k++) {
          const vi = indices[t * 3 + k] * 3;
          this.vertexNormals[vi] += n.x;
          this.vertexNormals[vi + 1] += n.y;
          this.vertexNormals[vi + 2] += n.z;
        }
        n.normalize();
        this.faceNormals[t * 3] = n.x;
        this.faceNormals[t * 3 + 1] = n.y;
        this.faceNormals[t * 3 + 2] = n.z;
      }
    }
    for (let i = 0; i < this.vertexNormals.length; i += 3) {
      const l = Math.hypot(this.vertexNormals[i], this.vertexNormals[i + 1], this.vertexNormals[i + 2]) || 1;
      this.vertexNormals[i] /= l;
      this.vertexNormals[i + 1] /= l;
      this.vertexNormals[i + 2] /= l;
    }
    this.degenerateCount = triCount - valid.length;
    this.triOrder = Int32Array.from(valid);
    if (valid.length > 0) this.build(0, valid.length);
  }

  get triangleCount(): number {
    return this.triOrder.length;
  }

  triangle(t: number, a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3): void {
    const p = this.positions;
    const i0 = this.indices[t * 3] * 3, i1 = this.indices[t * 3 + 1] * 3, i2 = this.indices[t * 3 + 2] * 3;
    a.set(p[i0], p[i0 + 1], p[i0 + 2]);
    b.set(p[i1], p[i1 + 1], p[i1 + 2]);
    c.set(p[i2], p[i2 + 1], p[i2 + 2]);
  }

  private build(start: number, count: number): number {
    const min: [number, number, number] = [Infinity, Infinity, Infinity];
    const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
    const cmin = [Infinity, Infinity, Infinity];
    const cmax = [-Infinity, -Infinity, -Infinity];
    const p = this.positions;
    for (let i = start; i < start + count; i++) {
      const t = this.triOrder[i];
      for (let axis = 0; axis < 3; axis++) {
        let c = 0;
        for (let k = 0; k < 3; k++) {
          const v = p[this.indices[t * 3 + k] * 3 + axis];
          if (v < min[axis]) min[axis] = v;
          if (v > max[axis]) max[axis] = v;
          c += v;
        }
        c /= 3;
        if (c < cmin[axis]) cmin[axis] = c;
        if (c > cmax[axis]) cmax[axis] = c;
      }
    }
    const nodeIndex = this.nodes.length;
    const node: BVHNode = { min, max, left: -1, right: -1, start, count };
    this.nodes.push(node);
    if (count <= LEAF_SIZE) return nodeIndex;

    let axis = 0;
    for (let k = 1; k < 3; k++) if (cmax[k] - cmin[k] > cmax[axis] - cmin[axis]) axis = k;
    const centroid = (t: number) =>
      (p[this.indices[t * 3] * 3 + axis] + p[this.indices[t * 3 + 1] * 3 + axis] + p[this.indices[t * 3 + 2] * 3 + axis]) / 3;
    const slice = Array.from(this.triOrder.subarray(start, start + count)).sort((x, y) => centroid(x) - centroid(y));
    this.triOrder.set(slice, start);
    const half = count >> 1;
    node.left = this.build(start, half);
    node.right = this.build(start + half, count - half);
    return nodeIndex;
  }

  private boxDistSq(n: BVHNode, p: THREE.Vector3): number {
    let d = 0;
    const c = [p.x, p.y, p.z];
    for (let k = 0; k < 3; k++) {
      const v = c[k] < n.min[k] ? n.min[k] - c[k] : c[k] > n.max[k] ? c[k] - n.max[k] : 0;
      d += v * v;
    }
    return d;
  }

  /**
   * Nearest triangle to p. Returns triangle index (into the original index buffer), squared
   * distance, closest point and barycentrics; triangle = -1 if no triangle within maxDist.
   */
  nearest(
    p: THREE.Vector3,
    maxDist: number,
    out: { triangle: number; distSq: number; point: THREE.Vector3; bary: [number, number, number] }
  ): typeof out {
    out.triangle = -1;
    out.distSq = maxDist * maxDist;
    if (this.nodes.length === 0) return out;
    const stack: number[] = [0];
    while (stack.length) {
      const ni = stack.pop()!;
      const n = this.nodes[ni];
      if (this.boxDistSq(n, p) >= out.distSq) continue;
      if (n.left < 0) {
        for (let i = n.start; i < n.start + n.count; i++) {
          const t = this.triOrder[i];
          this.triangle(t, this._a, this._b, this._c);
          const cp = closestPointOnTriangle(p, this._a, this._b, this._c, this._cp);
          const d = cp.point.distanceToSquared(p);
          if (d < out.distSq) {
            out.distSq = d;
            out.triangle = t;
            out.point.copy(cp.point);
            out.bary[0] = cp.bary[0];
            out.bary[1] = cp.bary[1];
            out.bary[2] = cp.bary[2];
          }
        }
      } else {
        // Visit the nearer child last so it is popped first.
        const dl = this.boxDistSq(this.nodes[n.left], p);
        const dr = this.boxDistSq(this.nodes[n.right], p);
        if (dl < dr) {
          stack.push(n.right, n.left);
        } else {
          stack.push(n.left, n.right);
        }
      }
    }
    return out;
  }
}

// ---------------------------------------------------------------------------------------
// Correspondence field
// ---------------------------------------------------------------------------------------

export interface CorrespondenceField {
  count: number;
  /** Nearest body triangle index, -1 when invalid. */
  faceIndex: Int32Array;
  barycentric: Float32Array; // 3 per vertex
  closestPoint: Float32Array; // 3 per vertex, body-local
  normal: Float32Array; // 3 per vertex, body-local interpolated surface normal
  /** Signed offset h = (p − q)·n_face; negative ⇒ vertex inside the body. */
  signedOffset: Float32Array;
  valid: Uint8Array;
  validCount: number;
  degenerateTriangles: number;
}

/** Backward-compatible per-vertex view. */
export interface VertexCorrespondence {
  vertexIndex: number;
  nearestBodyFaceIndex: number;
  barycentric: [number, number, number];
  normal: [number, number, number];
  restOffsetH: number;
  anchorWeight: number;
  valid: boolean;
}

export interface CorrespondenceOptions {
  /** Vertices farther than this from the body have no correspondence. */
  maxDistanceM: number;
  /** Body-local vertical range in which the torso surface is meaningful. */
  yRange?: [number, number];
}

/**
 * Builds the correspondence for `count` body-local points.
 */
export function buildCorrespondence(
  bodyLocalPoints: Float32Array,
  bvh: TriangleBVH,
  opts: CorrespondenceOptions
): CorrespondenceField {
  const count = bodyLocalPoints.length / 3;
  const field: CorrespondenceField = {
    count,
    faceIndex: new Int32Array(count).fill(-1),
    barycentric: new Float32Array(count * 3),
    closestPoint: new Float32Array(count * 3),
    normal: new Float32Array(count * 3),
    signedOffset: new Float32Array(count),
    valid: new Uint8Array(count),
    validCount: 0,
    degenerateTriangles: bvh.degenerateCount,
  };
  const p = new THREE.Vector3();
  const q = { triangle: -1, distSq: 0, point: new THREE.Vector3(), bary: [0, 0, 0] as [number, number, number] };
  const vn = bvh.vertexNormals;
  const fn = bvh.faceNormals;

  for (let i = 0; i < count; i++) {
    p.set(bodyLocalPoints[i * 3], bodyLocalPoints[i * 3 + 1], bodyLocalPoints[i * 3 + 2]);
    if (opts.yRange && (p.y < opts.yRange[0] || p.y > opts.yRange[1])) continue;
    bvh.nearest(p, opts.maxDistanceM, q);
    if (q.triangle < 0) continue;

    const t = q.triangle;
    const i0 = bvh.indices[t * 3] * 3, i1 = bvh.indices[t * 3 + 1] * 3, i2 = bvh.indices[t * 3 + 2] * 3;
    const [u, v, w] = q.bary;
    let nx = vn[i0] * u + vn[i1] * v + vn[i2] * w;
    let ny = vn[i0 + 1] * u + vn[i1 + 1] * v + vn[i2 + 1] * w;
    let nz = vn[i0 + 2] * u + vn[i1 + 2] * v + vn[i2 + 2] * w;
    const nl = Math.hypot(nx, ny, nz) || 1;
    nx /= nl; ny /= nl; nz /= nl;

    const dx = p.x - q.point.x, dy = p.y - q.point.y, dz = p.z - q.point.z;
    const dist = Math.sqrt(q.distSq);
    const side = dx * fn[t * 3] + dy * fn[t * 3 + 1] + dz * fn[t * 3 + 2];

    field.faceIndex[i] = t;
    field.barycentric.set(q.bary, i * 3);
    field.closestPoint[i * 3] = q.point.x;
    field.closestPoint[i * 3 + 1] = q.point.y;
    field.closestPoint[i * 3 + 2] = q.point.z;
    field.normal[i * 3] = nx;
    field.normal[i * 3 + 1] = ny;
    field.normal[i * 3 + 2] = nz;
    field.signedOffset[i] = side >= 0 ? dist : -dist;
    field.valid[i] = 1;
    field.validCount++;
  }
  return field;
}

/** Converts a field to the per-vertex legacy representation (for diagnostics / tests). */
export function fieldToVertexCorrespondences(field: CorrespondenceField, anchorWeights?: Float32Array): VertexCorrespondence[] {
  const out: VertexCorrespondence[] = [];
  for (let i = 0; i < field.count; i++) {
    out.push({
      vertexIndex: i,
      nearestBodyFaceIndex: field.faceIndex[i],
      barycentric: [field.barycentric[i * 3], field.barycentric[i * 3 + 1], field.barycentric[i * 3 + 2]],
      normal: [field.normal[i * 3], field.normal[i * 3 + 1], field.normal[i * 3 + 2]],
      restOffsetH: field.signedOffset[i],
      anchorWeight: anchorWeights ? anchorWeights[i] : 0,
      valid: field.valid[i] === 1,
    });
  }
  return out;
}

// ---------------------------------------------------------------------------------------
// Deterministic rest-based deformation
// ---------------------------------------------------------------------------------------

/** Vertex adjacency on position-welded vertices (UV seams share displacement). */
export function buildWeldedAdjacency(positions: ArrayLike<number>, indices: ArrayLike<number> | null): {
  weldId: Int32Array;
  weldCount: number;
  neighbors: Int32Array[];
} {
  const n = positions.length / 3;
  const weldId = new Int32Array(n);
  const keyToId = new Map<string, number>();
  const q = (v: number) => Math.round(v * 1e5);
  for (let i = 0; i < n; i++) {
    const key = `${q(positions[i * 3])},${q(positions[i * 3 + 1])},${q(positions[i * 3 + 2])}`;
    let id = keyToId.get(key);
    if (id === undefined) {
      id = keyToId.size;
      keyToId.set(key, id);
    }
    weldId[i] = id;
  }
  const weldCount = keyToId.size;
  const sets: Set<number>[] = Array.from({ length: weldCount }, () => new Set<number>());
  if (indices) {
    for (let t = 0; t < indices.length; t += 3) {
      const a = weldId[indices[t]], b = weldId[indices[t + 1]], c = weldId[indices[t + 2]];
      if (a !== b) { sets[a].add(b); sets[b].add(a); }
      if (b !== c) { sets[b].add(c); sets[c].add(b); }
      if (c !== a) { sets[c].add(a); sets[a].add(c); }
    }
  }
  return { weldId, weldCount, neighbors: sets.map((s) => Int32Array.from(s)) };
}

export interface PushOutParams {
  /** Minimum garment-to-body clearance (metres), typically the fabric collision tolerance. */
  clearanceM: number;
  /** Laplacian smoothing passes over the displacement field. */
  smoothingIterations: number;
}

/**
 * Stateless deformer for one mesh. Holds only preallocated scratch buffers; the output is a
 * pure function of (restPositions, field, meshToBody, params).
 */
export class RestPoseDeformer {
  readonly vertexCount: number;
  private readonly adjacency: ReturnType<typeof buildWeldedAdjacency>;
  private readonly dispA: Float32Array; // welded, body-local
  private readonly dispB: Float32Array;
  private readonly weldN: Float32Array; // welded normal
  private readonly weldH: Float32Array;
  private readonly weldValid: Uint8Array;
  private readonly weldCountOf: Uint16Array;

  /** Position-weld id per vertex (UV-seam duplicates share an id). */
  get weldId(): Int32Array {
    return this.adjacency.weldId;
  }
  get weldCount(): number {
    return this.adjacency.weldCount;
  }

  constructor(restPositions: Float32Array, indices: ArrayLike<number> | null) {
    this.vertexCount = restPositions.length / 3;
    this.adjacency = buildWeldedAdjacency(restPositions, indices);
    const w = this.adjacency.weldCount;
    this.dispA = new Float32Array(w * 3);
    this.dispB = new Float32Array(w * 3);
    this.weldN = new Float32Array(w * 3);
    this.weldH = new Float32Array(w);
    this.weldValid = new Uint8Array(w);
    this.weldCountOf = new Uint16Array(w);
  }

  /**
   * Writes P_rest + L⁻¹·D_body into `out` (mesh-local). `bodyToMeshLinear` is the inverse of
   * the 3×3 linear part of the mesh→body transform (displacements are vectors).
   * Returns the number of vertices that were displaced.
   */
  deform(
    restPositions: Float32Array,
    field: CorrespondenceField | null,
    bodyToMeshLinear: THREE.Matrix3,
    params: PushOutParams,
    out: Float32Array
  ): number {
    out.set(restPositions);
    if (!field) return 0;
    const { weldId, weldCount, neighbors } = this.adjacency;
    const D = this.dispA;
    D.fill(0);
    this.weldN.fill(0);
    this.weldH.fill(0);
    this.weldValid.fill(0);
    this.weldCountOf.fill(0);

    // 1. Average the correspondence over welded duplicates.
    for (let i = 0; i < field.count; i++) {
      if (!field.valid[i]) continue;
      const k = weldId[i];
      this.weldValid[k] = 1;
      this.weldCountOf[k]++;
      this.weldH[k] += field.signedOffset[i];
      this.weldN[k * 3] += field.normal[i * 3];
      this.weldN[k * 3 + 1] += field.normal[i * 3 + 1];
      this.weldN[k * 3 + 2] += field.normal[i * 3 + 2];
    }
    for (let k = 0; k < weldCount; k++) {
      if (!this.weldValid[k]) continue;
      const c = this.weldCountOf[k];
      this.weldH[k] /= c;
      const l = Math.hypot(this.weldN[k * 3], this.weldN[k * 3 + 1], this.weldN[k * 3 + 2]) || 1;
      this.weldN[k * 3] /= l;
      this.weldN[k * 3 + 1] /= l;
      this.weldN[k * 3 + 2] /= l;
      // 2. Push-out needed to reach the clearance along the body normal.
      const need = params.clearanceM - this.weldH[k];
      if (need > 0) {
        D[k * 3] = this.weldN[k * 3] * need;
        D[k * 3 + 1] = this.weldN[k * 3 + 1] * need;
        D[k * 3 + 2] = this.weldN[k * 3 + 2] * need;
      }
    }

    // 3. Smooth the displacement field (Jacobi Laplacian, λ = 0.5) to avoid creases at the
    //    boundary between pushed and untouched vertices.
    let src = D;
    let dst = this.dispB;
    for (let it = 0; it < params.smoothingIterations; it++) {
      for (let k = 0; k < weldCount; k++) {
        const nb = neighbors[k];
        if (nb.length === 0) {
          dst[k * 3] = src[k * 3]; dst[k * 3 + 1] = src[k * 3 + 1]; dst[k * 3 + 2] = src[k * 3 + 2];
          continue;
        }
        let sx = 0, sy = 0, sz = 0;
        for (let j = 0; j < nb.length; j++) {
          sx += src[nb[j] * 3]; sy += src[nb[j] * 3 + 1]; sz += src[nb[j] * 3 + 2];
        }
        const inv = 1 / nb.length;
        dst[k * 3] = 0.5 * src[k * 3] + 0.5 * sx * inv;
        dst[k * 3 + 1] = 0.5 * src[k * 3 + 1] + 0.5 * sy * inv;
        dst[k * 3 + 2] = 0.5 * src[k * 3 + 2] + 0.5 * sz * inv;
      }
      const tmp = src; src = dst; dst = tmp;
    }

    // 4. Smoothing lowers peaks: re-impose the clearance constraint exactly.
    for (let k = 0; k < weldCount; k++) {
      if (!this.weldValid[k]) continue;
      const nx = this.weldN[k * 3], ny = this.weldN[k * 3 + 1], nz = this.weldN[k * 3 + 2];
      const along = src[k * 3] * nx + src[k * 3 + 1] * ny + src[k * 3 + 2] * nz;
      const deficit = params.clearanceM - (this.weldH[k] + along);
      if (deficit > 0) {
        src[k * 3] += nx * deficit;
        src[k * 3 + 1] += ny * deficit;
        src[k * 3 + 2] += nz * deficit;
      }
    }

    // 5. Body-local displacement → mesh-local and add to rest.
    const m = bodyToMeshLinear.elements; // column-major
    let moved = 0;
    for (let i = 0; i < this.vertexCount; i++) {
      const k = weldId[i];
      const dx = src[k * 3], dy = src[k * 3 + 1], dz = src[k * 3 + 2];
      if (dx === 0 && dy === 0 && dz === 0) continue;
      out[i * 3] += m[0] * dx + m[3] * dy + m[6] * dz;
      out[i * 3 + 1] += m[1] * dx + m[4] * dy + m[7] * dz;
      out[i * 3 + 2] += m[2] * dx + m[5] * dy + m[8] * dz;
      moved++;
    }
    return moved;
  }
}

/**
 * Full deterministic deformation against a body surface:
 *   1. correspondence of the REST positions → smoothed push-out (RestPoseDeformer.deform);
 *   2. `refinementPasses` × { re-query the deformed positions; add the remaining clearance
 *      deficit along the new normal }. A single first-order push undershoots on curved /
 *      tapering regions because the nearest triangle changes after moving.
 * Every pass starts from values derived from the rest positions, so identical inputs give
 * identical outputs. Returns the REST correspondence field (used for diagnostics).
 */
export function deformAgainstBody(
  deformer: RestPoseDeformer,
  restPositions: Float32Array,
  bvh: TriangleBVH,
  meshToBody: THREE.Matrix4,
  opts: CorrespondenceOptions & PushOutParams & { refinementPasses?: number },
  out: Float32Array,
  scratchBody: Float32Array
): { field: CorrespondenceField; displaced: number } {
  const bodyToMeshLin = new THREE.Matrix3().setFromMatrix4(meshToBody).invert();
  transformPositions(restPositions, meshToBody, scratchBody);
  const field = buildCorrespondence(scratchBody, bvh, opts);
  let displaced = deformer.deform(restPositions, field, bodyToMeshLin, opts, out);
  const m = bodyToMeshLin.elements;
  const deformedBody = new Float32Array(out.length);
  for (let pass = 0; pass < (opts.refinementPasses ?? 2); pass++) {
    transformPositions(out, meshToBody, deformedBody);
    const f2 = buildCorrespondence(deformedBody, bvh, opts);
    for (let i = 0; i < f2.count; i++) {
      // Only vertices that had a rest correspondence are allowed to move.
      if (!f2.valid[i] || !field.valid[i]) continue;
      const deficit = opts.clearanceM - f2.signedOffset[i];
      if (deficit <= 0) continue;
      const dx = f2.normal[i * 3] * deficit, dy = f2.normal[i * 3 + 1] * deficit, dz = f2.normal[i * 3 + 2] * deficit;
      out[i * 3] += m[0] * dx + m[3] * dy + m[6] * dz;
      out[i * 3 + 1] += m[1] * dx + m[4] * dy + m[7] * dz;
      out[i * 3 + 2] += m[2] * dx + m[5] * dy + m[8] * dz;
    }
  }
  // Count vertices that differ from rest.
  displaced = 0;
  for (let i = 0; i < restPositions.length; i += 3) {
    if (out[i] !== restPositions[i] || out[i + 1] !== restPositions[i + 1] || out[i + 2] !== restPositions[i + 2]) displaced++;
  }
  return { field, displaced };
}

/**
 * Averages vertex normals over position-welded duplicates. computeVertexNormals() treats the
 * two copies of a UV-seam vertex as unrelated, giving each a half-fan normal and a visible
 * shading crease along the seam (on these assets: straight down the front centre).
 */
export function weldNormals(normals: Float32Array, weldId: Int32Array, weldCount: number, scratch: Float32Array): void {
  scratch.fill(0, 0, weldCount * 3);
  for (let i = 0; i < weldId.length; i++) {
    const k = weldId[i] * 3;
    scratch[k] += normals[i * 3];
    scratch[k + 1] += normals[i * 3 + 1];
    scratch[k + 2] += normals[i * 3 + 2];
  }
  for (let i = 0; i < weldId.length; i++) {
    const k = weldId[i] * 3;
    const l = Math.hypot(scratch[k], scratch[k + 1], scratch[k + 2]) || 1;
    normals[i * 3] = scratch[k] / l;
    normals[i * 3 + 1] = scratch[k + 1] / l;
    normals[i * 3 + 2] = scratch[k + 2] / l;
  }
}

/** Transforms mesh-local positions to body-local positions (into a preallocated buffer). */
export function transformPositions(src: Float32Array, matrix: THREE.Matrix4, out: Float32Array): Float32Array {
  const e = matrix.elements;
  for (let i = 0; i < src.length; i += 3) {
    const x = src[i], y = src[i + 1], z = src[i + 2];
    out[i] = e[0] * x + e[4] * y + e[8] * z + e[12];
    out[i + 1] = e[1] * x + e[5] * y + e[9] * z + e[13];
    out[i + 2] = e[2] * x + e[6] * y + e[10] * z + e[14];
  }
  return out;
}
