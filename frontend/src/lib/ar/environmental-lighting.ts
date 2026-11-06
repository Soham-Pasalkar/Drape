/**
 * DRAPE Environmental Lighting & WebCam Light Estimator
 *
 * Estimates real-time ambient illuminance, color temperature, and dominant key light
 * from live webcam frames to blend 3D PBR garments realistically into the video background.
 */

import * as THREE from 'three';

export interface EstimatedLighting {
  ambientIntensity: number;
  ambientColor: THREE.Color;
  keyIntensity: number;
  keyColor: THREE.Color;
  exposure: number;
}

export class EnvironmentalLightingEstimator {
  private sampleCanvas: HTMLCanvasElement | null = null;
  private sampleCtx: CanvasRenderingContext2D | null = null;
  private currentLighting: EstimatedLighting;

  constructor() {
    this.currentLighting = {
      ambientIntensity: 1.2,
      ambientColor: new THREE.Color(0xffffff),
      keyIntensity: 2.0,
      keyColor: new THREE.Color(0xfff8ee),
      exposure: 1.05,
    };
  }

  /**
   * Samples a downscaled 16x16 thumbnail of the video frame to estimate lighting.
   */
  estimateFromVideo(video: HTMLVideoElement): EstimatedLighting {
    if (
      video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
      video.videoWidth === 0 ||
      video.videoHeight === 0
    ) {
      return this.currentLighting;
    }

    if (!this.sampleCanvas) {
      this.sampleCanvas = document.createElement('canvas');
      this.sampleCanvas.width = 16;
      this.sampleCanvas.height = 16;
      this.sampleCtx = this.sampleCanvas.getContext('2d', { willReadFrequently: true });
    }

    if (!this.sampleCtx) {
      return this.currentLighting;
    }

    // Draw downscaled frame
    this.sampleCtx.drawImage(video, 0, 0, 16, 16);
    const imgData = this.sampleCtx.getImageData(0, 0, 16, 16).data;

    let totalR = 0;
    let totalG = 0;
    let totalB = 0;
    let maxLum = 0;

    for (let i = 0; i < imgData.length; i += 4) {
      const r = imgData[i] / 255.0;
      const g = imgData[i + 1] / 255.0;
      const b = imgData[i + 2] / 255.0;

      totalR += r;
      totalG += g;
      totalB += b;

      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      if (lum > maxLum) maxLum = lum;
    }

    const numPixels = 16 * 16;
    const avgR = totalR / numPixels;
    const avgG = totalG / numPixels;
    const avgB = totalB / numPixels;

    const avgLum = 0.2126 * avgR + 0.7152 * avgG + 0.0722 * avgB;

    // Smoothly adapt ambient light
    const targetAmbient = Math.min(1.8, Math.max(0.6, avgLum * 2.2));
    this.currentLighting.ambientIntensity =
      this.currentLighting.ambientIntensity * 0.9 + targetAmbient * 0.1;

    // Ambient color with slight warmth normalization
    const targetColor = new THREE.Color(
      Math.min(1.0, avgR * 1.3),
      Math.min(1.0, avgG * 1.3),
      Math.min(1.0, avgB * 1.3)
    );
    this.currentLighting.ambientColor.lerp(targetColor, 0.1);

    // Key light intensity proportional to overall contrast
    this.currentLighting.keyIntensity = Math.min(2.8, Math.max(1.2, maxLum * 2.5));

    return this.currentLighting;
  }
}

