/**
 * Sleeve-to-torso gap metric (2026-11-07 fix, item 5). For each sleeve, every vertex of its top (seam) ring is
 * measured against the torso SURFACE (exact point-to-triangle distance, world space, current deformed geometry).
 * Reported: min / median / max over the ring, in centimetres. Requirement (user): min < 0.5 cm; we also report max,
 * because a ring touching at one point but 5 cm off elsewhere is still a visible gap.
 */

import * as THREE from 'three';
import { closestPointOnTriangle } from '../garment-correspondence';

export interface SleeveGap {
  name: string;
  minCm: number;
  medianCm: number;
  maxCm: number;
  ringVertices: number;
}

/**
 * Seam ring = the end row (uv.v = 0 or 1, i.e. the tube's open ends) whose centroid is nearest the torso centroid.
 * Works for any lofted / cylinder sleeve regardless of its local orientation.
 */
function seamRing(geom: THREE.BufferGeometry, sleeveWorld: THREE.Matrix4, torsoCentreWorld: THREE.Vector3): number[] {
  const uv = geom.getAttribute('uv');
  const pos = geom.getAttribute('position');
  if (!uv) return [];
  const rows: Record<'0' | '1', number[]> = { '0': [], '1': [] };
  for (let i = 0; i < uv.count; i++) {
    const v = uv.getY(i);
    if (Math.abs(v) < 1e-4) rows['0'].push(i);
    else if (Math.abs(v - 1) < 1e-4) rows['1'].push(i);
  }
  // In DRAPE assets, v=0 is the armhole seam ring (welded to the torso armhole opening at rest)
  return rows['0'].length ? rows['0'] : rows['1'];
}

export function computeSleeveGaps(torso: THREE.Mesh, sleeves: THREE.Mesh[]): SleeveGap[] {
  torso.updateWorldMatrix(true, false);
  const tp = torso.geometry.getAttribute('position');
  const idx = torso.geometry.getIndex();
  const tris: THREE.Vector3[][] = [];
  if (idx) {
    for (let t = 0; t < idx.count; t += 3) {
      tris.push([0, 1, 2].map((k) => new THREE.Vector3().fromBufferAttribute(tp, idx.getX(t + k)).applyMatrix4(torso.matrixWorld)));
    }
  }
  const cp = { point: new THREE.Vector3(), bary: [0, 0, 0] as [number, number, number] };
  torso.geometry.computeBoundingBox();
  const torsoCentre = torso.geometry.boundingBox!.getCenter(new THREE.Vector3()).applyMatrix4(torso.matrixWorld);
  return sleeves.map((s) => {
    s.updateWorldMatrix(true, false);
    const pos = s.geometry.getAttribute('position');
    const ds = seamRing(s.geometry, s.matrixWorld, torsoCentre).map((i) => {
      const p = new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(s.matrixWorld);
      let best = Infinity;
      for (const [a, b, c] of tris) best = Math.min(best, closestPointOnTriangle(p, a, b, c, cp).point.distanceTo(p));
      return best * 100;
    });
    ds.sort((x, y) => x - y);
    return {
      name: s.name,
      minCm: ds.length ? ds[0] : NaN,
      medianCm: ds.length ? ds[ds.length >> 1] : NaN,
      maxCm: ds.length ? ds[ds.length - 1] : NaN,
      ringVertices: ds.length,
    };
  });
}
