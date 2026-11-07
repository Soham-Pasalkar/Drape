/**
 * DRAPE Luxury PBR Fabric Materials Subsystem
 *
 * Configures Three.js MeshPhysicalMaterial with glTF KHR_materials_sheen properties:
 * - Sheen color and sheen roughness for editorial cotton, cashmere, wool, and silk.
 * - Micro-roughness, specular tint, and double-sided rendering.
 */

import * as THREE from 'three';
import { FabricProperties } from './types';

export class FabricMaterialFactory {
  /**
   * Creates a luxury MeshPhysicalMaterial tailored to the specific fabric properties.
   */
  static createFabricMaterial(
    baseColorHex: string,
    fabric: FabricProperties
  ): THREE.MeshPhysicalMaterial {
    const color = new THREE.Color(baseColorHex);

    const material = new THREE.MeshPhysicalMaterial({
      color,
      roughness: fabric.roughness,
      metalness: fabric.metalness,
      side: THREE.DoubleSide, // Essential for garment hems, collars, and sleeves
      shadowSide: THREE.BackSide,

      // Sheen properties (produces soft fabric velvet/sheen response at grazing angles)
      sheen: 1.0,
      sheenColor: new THREE.Color(fabric.sheenColor || '#ffffff'),
      sheenRoughness: fabric.sheenRoughness,

      // Subtle clearcoat for treated/waxed luxury finishes
      clearcoat: fabric.clearcoat ?? 0.0,
      clearcoatRoughness: 0.2,

      // High-precision depth testing
      depthWrite: true,
      depthTest: true,
    });

    // Generate procedural micro-weave normal bump pattern for organic fabric tactile quality
    material.normalMap = FabricMaterialFactory.generateMicroWeaveNormalMap(fabric.fabricType);
    material.normalScale = new THREE.Vector2(0.35, 0.35);

    return material;
  }

  /**
   * Generates a 64x64 procedural twill / jersey normal texture in memory.
   */
  private static generateMicroWeaveNormalMap(fabricType: string): THREE.CanvasTexture {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      return new THREE.CanvasTexture(canvas);
    }

    const imgData = ctx.createImageData(size, size);
    const data = imgData.data;

    const isTwill = fabricType.includes('wool') || fabricType.includes('denim');

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 4;

        // Wave formula for fabric weave
        let pattern = 0;
        if (isTwill) {
          // Diagonal 45-degree twill ribbing
          pattern = Math.sin(((x + y) / size) * Math.PI * 16.0);
        } else {
          // Plain cross-weave / jersey knit
          pattern = Math.sin((x / size) * Math.PI * 24.0) * Math.cos((y / size) * Math.PI * 24.0);
        }

        // Convert height delta to tangent-space normal vector [R, G, B] -> [X, Y, Z]
        const nx = pattern * 0.25;
        const ny = pattern * 0.25;
        const nz = 1.0;
        const len = Math.hypot(nx, ny, nz) || 1.0;

        // Map [-1, 1] to [0, 255]
        data[idx] = Math.floor(((nx / len) * 0.5 + 0.5) * 255);
        data[idx + 1] = Math.floor(((ny / len) * 0.5 + 0.5) * 255);
        data[idx + 2] = Math.floor(((nz / len) * 0.5 + 0.5) * 255);
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(imgData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(16, 16); // High-frequency tiling across garment surface
    texture.needsUpdate = true;

    return texture;
  }
}

