/**
 * Pose smoothing used by the single transform owner (ThreeSceneManager.setPose) and by replay.
 * Snaps on request (first acquisition / after a tracking gap); otherwise eases with
 * a = 1 − exp(−dt/τ): position lerp + quaternion slerp (no Euler interpolation).
 * Pure: mutates only the `current` pose passed in.
 */

import * as THREE from 'three';

export interface PoseLike {
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
}

export class PoseSmoother {
  private pendingSnap = false;

  constructor(public tauS: number) {}

  requestSnap(): void {
    this.pendingSnap = true;
  }

  get snapPending(): boolean {
    return this.pendingSnap;
  }

  /** Advances `current` toward `target`. Returns the factor applied (1 = snap). */
  step(current: PoseLike, target: PoseLike, dt: number): { a: number; snapped: boolean } {
    if (this.pendingSnap) {
      current.position.copy(target.position);
      current.quaternion.copy(target.quaternion);
      this.pendingSnap = false;
      return { a: 1, snapped: true };
    }
    const a = 1 - Math.exp(-dt / this.tauS);
    current.position.lerp(target.position, a);
    current.quaternion.slerp(target.quaternion, a);
    return { a, snapped: false };
  }
}
