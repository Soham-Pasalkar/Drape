/**
 * DRAPE One Euro Filter Subsystem
 *
 * Implements the 1€ Filter (Casiez, Roussel, & Vogel, CHI 2012)
 * for real-time human pose stabilization, noise reduction, and low-latency tracking.
 *
 * Features:
 * - Adaptive cutoff frequency based on movement speed.
 * - Tangent-space / SLERP filtering for unit quaternions with shortest-path antipodal check.
 * - Velocity clamping to prevent explosive simulation impulses.
 * - Forward pose prediction for display-latency compensation.
 */

export interface OneEuroConfig {
  fMin: number;      // Minimum cutoff frequency in Hz (e.g. 1.0 - 1.5)
  beta: number;      // Speed coefficient (e.g. 0.005 - 0.02)
  dCutOff: number;   // Cutoff frequency for derivative in Hz (typically 1.0)
  maxVelocity?: number; // Clamping threshold in units/sec
}

export class LowPassFilter {
  private y: number | null = null;
  private s: number | null = null;

  filter(value: number, alpha: number): number {
    if (this.y === null) {
      this.s = value;
      this.y = value;
      return value;
    }
    this.s = alpha * value + (1.0 - alpha) * this.s!;
    this.y = this.s;
    return this.y;
  }

  filterWithAlpha(value: number, alpha: number): number {
    return this.filter(value, alpha);
  }

  hasLast(): boolean {
    return this.y !== null;
  }

  last(): number {
    return this.y ?? 0;
  }

  reset(): void {
    this.y = null;
    this.s = null;
  }
}

export class OneEuroFilter {
  private fMin: number;
  private beta: number;
  private dCutOff: number;
  private maxVelocity: number;

  private xFilt: LowPassFilter;
  private dxFilt: LowPassFilter;
  private lastTime: number | null = null;

  constructor(config: OneEuroConfig) {
    this.fMin = Math.max(0.001, config.fMin);
    this.beta = Math.max(0.0, config.beta);
    this.dCutOff = Math.max(0.001, config.dCutOff);
    this.maxVelocity = config.maxVelocity ?? Infinity;

    this.xFilt = new LowPassFilter();
    this.dxFilt = new LowPassFilter();
  }

  private computeAlpha(rate: number, cutoff: number): number {
    const tau = 1.0 / (2.0 * Math.PI * cutoff);
    const te = 1.0 / rate;
    return 1.0 / (1.0 + tau / te);
  }

  filter(value: number, timestamp: number): number {
    if (this.lastTime === null || this.lastTime === timestamp) {
      this.lastTime = timestamp;
      return this.xFilt.filter(value, 1.0);
    }

    const dt = Math.max((timestamp - this.lastTime) / 1000.0, 0.0001);
    this.lastTime = timestamp;
    const rate = 1.0 / dt;

    // Estimate derivative
    const prevX = this.xFilt.last();
    let dx = (value - prevX) * rate;

    // Clamp velocity if needed
    if (Math.abs(dx) > this.maxVelocity) {
      dx = Math.sign(dx) * this.maxVelocity;
    }

    const edx = this.dxFilt.filter(dx, this.computeAlpha(rate, this.dCutOff));
    const cutoff = this.fMin + this.beta * Math.abs(edx);
    return this.xFilt.filter(value, this.computeAlpha(rate, cutoff));
  }

  reset(): void {
    this.xFilt.reset();
    this.dxFilt.reset();
    this.lastTime = null;
  }
}

export class OneEuroFilterVec3 {
  private x: OneEuroFilter;
  private y: OneEuroFilter;
  private z: OneEuroFilter;

  constructor(config: OneEuroConfig) {
    this.x = new OneEuroFilter(config);
    this.y = new OneEuroFilter(config);
    this.z = new OneEuroFilter(config);
  }

  filter(val: [number, number, number], timestamp: number): [number, number, number] {
    return [
      this.x.filter(val[0], timestamp),
      this.y.filter(val[1], timestamp),
      this.z.filter(val[2], timestamp),
    ];
  }

  reset(): void {
    this.x.reset();
    this.y.reset();
    this.z.reset();
  }
}

/**
 * Quaternion 1€ Filter with geodesic distance / SLERP in SO(3).
 * Enforces shortest path (q1 · q2 >= 0) to avoid antipodal flipping.
 */
export class OneEuroFilterQuat {
  private fMin: number;
  private beta: number;
  private dCutOff: number;
  private maxAngularVelocity: number;

  private prevQuat: [number, number, number, number] | null = null;
  private dOmegaFilt: LowPassFilter;
  private lastTime: number | null = null;

  constructor(config: OneEuroConfig) {
    this.fMin = config.fMin;
    this.beta = config.beta;
    this.dCutOff = config.dCutOff;
    this.maxAngularVelocity = config.maxVelocity ?? Math.PI * 4; // Max rad/s
    this.dOmegaFilt = new LowPassFilter();
  }

  private computeAlpha(rate: number, cutoff: number): number {
    const tau = 1.0 / (2.0 * Math.PI * cutoff);
    const te = 1.0 / rate;
    return 1.0 / (1.0 + tau / te);
  }

  filter(
    q: [number, number, number, number],
    timestamp: number
  ): [number, number, number, number] {
    let [qx, qy, qz, qw] = q;
    // Normalize input
    const len = Math.hypot(qx, qy, qz, qw) || 1.0;
    qx /= len;
    qy /= len;
    qz /= len;
    qw /= len;

    if (this.prevQuat === null || this.lastTime === null) {
      this.prevQuat = [qx, qy, qz, qw];
      this.lastTime = timestamp;
      return [qx, qy, qz, qw];
    }

    const dt = Math.max((timestamp - this.lastTime) / 1000.0, 0.0001);
    this.lastTime = timestamp;
    const rate = 1.0 / dt;

    let [px, py, pz, pw] = this.prevQuat;

    // Antipodal alignment: if dot < 0, negate q to take the shortest path
    let dot = px * qx + py * qy + pz * qz + pw * qw;
    if (dot < 0) {
      qx = -qx;
      qy = -qy;
      qz = -qz;
      qw = -qw;
      dot = -dot;
    }

    // Clamp dot product
    dot = Math.min(1.0, Math.max(-1.0, dot));
    const angle = 2.0 * Math.acos(dot); // Angular difference in radians
    let omega = angle / dt;

    if (omega > this.maxAngularVelocity) {
      omega = this.maxAngularVelocity;
    }

    const eomega = this.dOmegaFilt.filter(omega, this.computeAlpha(rate, this.dCutOff));
    const cutoff = this.fMin + this.beta * eomega;
    const alpha = this.computeAlpha(rate, cutoff);

    // SLERP interpolation: slerp(prevQuat, targetQuat, alpha)
    let rx: number, ry: number, rz: number, rw: number;

    if (dot > 0.9995) {
      // Linear interpolation when very close to avoid division by zero
      rx = px + alpha * (qx - px);
      ry = py + alpha * (qy - py);
      rz = pz + alpha * (qz - pz);
      rw = pw + alpha * (qw - pw);
    } else {
      const theta0 = Math.acos(dot);
      const sinTheta0 = Math.sin(theta0);
      const theta = theta0 * alpha;
      const sinTheta = Math.sin(theta);

      const s0 = Math.cos(theta) - (dot * sinTheta) / sinTheta0;
      const s1 = sinTheta / sinTheta0;

      rx = s0 * px + s1 * qx;
      ry = s0 * py + s1 * qy;
      rz = s0 * pz + s1 * qz;
      rw = s0 * pw + s1 * qw;
    }

    const rlen = Math.hypot(rx, ry, rz, rw) || 1.0;
    const filtered: [number, number, number, number] = [
      rx / rlen,
      ry / rlen,
      rz / rlen,
      rw / rlen,
    ];

    this.prevQuat = filtered;
    return filtered;
  }

  reset(): void {
    this.prevQuat = null;
    this.dOmegaFilt.reset();
    this.lastTime = null;
  }
}

