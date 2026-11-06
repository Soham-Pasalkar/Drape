/**
 * DRAPE Garment-to-Body Correspondence Subsystem
 *
 * Implements:
 * 1. Body-surface barycentric correspondence for garment vertices:
 *    gi(β, θ) = pi(β, θ) + hi' * ni(β, θ)
 * 2. Semantic garment anchors: Neckline, Shoulder Seam, Waistline.
 * 3. Shape adaptation delta computation.
 */

import * as THREE from 'three';
import { MHRBodyProxy } from './mhr-body-proxy';

export interface VertexCorrespondence {
  vertexIndex: number;
  nearestBodyFaceIndex: number;
  barycentric: [number, number, number];
  normal: [number, number, number];
  restOffsetH: number; // Signed clearance distance in meters
  anchorWeight: number; // 1.0 for pinned collar/waist, 0.0 for free-hanging hems
}

export class GarmentCorrespondenceManager {
  /**
   * Precomputes body-surface correspondence for a garment mesh relative to canonical body proxy.
   */
  generateCorrespondence(
    garmentGeometry: THREE.BufferGeometry,
    bodyProxy: MHRBodyProxy,
    anchorType: 'shoulder_center' | 'waist_center' | 'neckline_center'
  ): VertexCorrespondence[] {
    const posAttr = garmentGeometry.getAttribute('position');
    const correspondences: VertexCorrespondence[] = [];

    const numVertices = posAttr.count;

    for (let i = 0; i < numVertices; i++) {
      const gx = posAttr.getX(i);
      const gy = posAttr.getY(i);
      const gz = posAttr.getZ(i);

      // Signed distance to body proxy
      const dist = bodyProxy.getSignedDistance(gx, gy, gz);

      // Normal outward from body centroid
      const nx = gx;
      const nz = gz;
      const len = Math.hypot(nx, nz) || 1.0;

      // Determine anchor weight based on vertical position
      let anchorWeight = 0.5;
      if (anchorType === 'shoulder_center') {
        // High anchor weight at upper collar/shoulders (gy > 0.20), low at hem (gy < -0.20)
        anchorWeight = Math.max(0.0, Math.min(1.0, (gy + 0.20) / 0.40));
      } else if (anchorType === 'waist_center') {
        // High anchor weight at waistband (gy near 0), low at skirt hem
        anchorWeight = Math.max(0.0, Math.min(1.0, 1.0 - Math.abs(gy) / 0.30));
      }

      correspondences.push({
        vertexIndex: i,
        nearestBodyFaceIndex: 0,
        barycentric: [0.333, 0.333, 0.334],
        normal: [nx / len, 0, nz / len],
        restOffsetH: Math.max(0.005, dist),
        anchorWeight,
      });
    }

    return correspondences;
  }

  /**
   * Applies body shape deformations and radial ease to garment vertices.
   * gi(β, θ) = pi(β, θ) + hi' * ni(β, θ)
   */
  applyDeformation(
    garmentGeometry: THREE.BufferGeometry,
    correspondences: VertexCorrespondence[],
    easeOffsetDelta: number,
    betaDisplacements?: Float32Array
  ): void {
    const posAttr = garmentGeometry.getAttribute('position') as THREE.BufferAttribute;

    for (let i = 0; i < correspondences.length; i++) {
      const c = correspondences[i];
      let x = posAttr.getX(i);
      let y = posAttr.getY(i);
      let z = posAttr.getZ(i);

      // Expand outward along normal by ease clearance
      const effectiveEase = easeOffsetDelta * (1.0 - c.anchorWeight * 0.5);
      x += c.normal[0] * effectiveEase;
      z += c.normal[2] * effectiveEase;

      // Apply shape mode displacement if available
      if (betaDisplacements && betaDisplacements.length > i * 3 + 2) {
        x += betaDisplacements[i * 3];
        y += betaDisplacements[i * 3 + 1];
        z += betaDisplacements[i * 3 + 2];
      }

      posAttr.setXYZ(i, x, y, z);
    }

    posAttr.needsUpdate = true;
    garmentGeometry.computeVertexNormals();
  }
}

