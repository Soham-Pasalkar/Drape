/**
 * DRAPE Three.js Scene Manager
 *
 * Owns the WebGL renderer, the camera (projection built from intrinsics + the video display
 * transform, never mirrored — see coordinates.ts), lighting, the body root and the active
 * garment instance. The scene graph is:
 *
 *   scene
 *    ├─ lights
 *    └─ bodyRoot  ← single smoothed body pose (body-local → camera), from the fitting engine
 *        ├─ bodyProxy.group      (identity: proxy geometry is authored in body-local space)
 *        └─ garment wrapper      (see garment-instance.ts for the anchor hierarchy)
 *
 * Because the garment hangs under the same bodyRoot as the proxy, garment and body share one
 * transform by construction — there is no separately interpolated "garment pose".
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { CameraIntrinsics, GarmentMetadata, MHRJointName } from './types';
import { MHRBodyProxy, BodyShape } from './mhr-body-proxy';
import { FabricMaterialFactory } from './fabric-materials';
import { GarmentInstance, GarmentDebugFlags, GarmentDiagnostics, SimulationData } from './garment-instance';
import { buildProjectionMatrix, VideoDisplayTransform, ndcToDisplay, Vec2 } from './coordinates';
import { DetailedFittingResult } from './fitting-engine';
import { PoseSmoother } from './pipeline/pose-smoother';
import {
  DebugMaterialMode,
  OrientationProbe,
  computeOrientationProbe,
  createAxesGizmo,
  createFaceColorMaterial,
  createMidGreyMaterial,
  readPixelAtNdc,
} from './debug/stage1-probe';

/** Per-frame transform log (Stage-1 diagnosis of the "static" symptom). */
export interface FrameLog {
  renderFrame: number;
  dtMs: number;
  /** Pose smoothing factor applied this frame (0 = frozen, 1 = snap). */
  lerpA: number;
  snapped: boolean;
  targetPos: [number, number, number];
  bodyRootPos: [number, number, number];
  /** Garment wrapper is a child of bodyRoot (otherwise it can never move). */
  garmentParentedToBodyRoot: boolean;
  bodyRootVisible: boolean;
}

export interface SceneDebugLayers extends GarmentDebugFlags {
  bodyProxy: boolean;
}

export interface SceneDiagnostics {
  garment: GarmentDiagnostics | null;
  renderMs: number;
  garmentUpdateMs: number;
  contextLost: boolean;
  drawCalls: number;
  triangles: number;
  frame: FrameLog;
  orientation: OrientationProbe | null;
  /** sRGB pixel at the projected chest point of the garment (debug probe only). */
  probeRgb: [number, number, number] | null;
  materialMode: DebugMaterialMode;
}

/** Pose smoothing time constants (s). The fitting engine already filters; keep these short. */
const POSE_TAU_S = 0.05;
/** Acceleration low-pass (s) and clamp (m/s²) for cloth inertial coupling. */
const ACCEL_TAU_S = 0.1;
const ACCEL_CLAMP = 10;
/** After this long without tracking, the pose snaps instead of easing on re-acquisition. */
const SNAP_AFTER_LOSS_MS = 500;

export class ThreeSceneManager {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer | null = null;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  private gltfLoader = new GLTFLoader();

  public bodyProxy: MHRBodyProxy;
  public bodyRoot: THREE.Group;

  private instances = new Map<string, GarmentInstance>();
  private materials = new Map<string, THREE.MeshPhysicalMaterial>();
  private loading = new Map<string, Promise<GarmentInstance>>();
  private active: GarmentInstance | null = null;


  // Targets from the latest fit.
  private hasTarget = false;
  private tracking = false;
  private lastTrackedAt = 0;
  private targetPos = new THREE.Vector3(0, 0, -1.6);
  private targetQuat = new THREE.Quaternion();
  private targetScale = new THREE.Vector3(1, 1, 1);
  private armL: THREE.Vector3 | null = null;
  private armR: THREE.Vector3 | null = null;
  private chordL: THREE.Vector3 | null = null;
  private chordR: THREE.Vector3 | null = null;

  // Kinematics for inertial coupling.
  private prevPos: THREE.Vector3 | null = null;
  private prevVel = new THREE.Vector3();
  private accel = new THREE.Vector3();

  private projectionKey = '';
  private isDisposed = false;
  private contextLost = false;
  private lastRenderTime: number | null = null;
  private debug: SceneDebugLayers = { bodyProxy: false, bounds: false, anchors: false, correspondence: false, collisionNormals: false };
  private lastRenderMs = 0;
  private lastGarmentMs = 0;

  // Stage-1 diagnostics
  private renderFrame = 0;
  private poseSmoother = new PoseSmoother(POSE_TAU_S);
  private frameLog: FrameLog = {
    renderFrame: 0, dtMs: 0, lerpA: 0, snapped: false, targetPos: [0, 0, 0], bodyRootPos: [0, 0, 0],
    garmentParentedToBodyRoot: false, bodyRootVisible: false,
  };
  private materialMode: DebugMaterialMode = 'normal';
  private originalMaterials = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
  private frontOnlyMaterials = new Map<THREE.Material, THREE.Material>();
  private faceColorMaterial: THREE.Material | null = null;
  private midGreyMaterial: THREE.Material | null = null;
  private axesGizmo: THREE.Group | null = null;
  private axesVisible = false;
  private probeEnabled = false;
  private probeRgb: [number, number, number] | null = null;
  // Stage-1b registration probes (magenta = 3D, projected by the render camera)
  private registrationGroup: THREE.Group | null = null;
  private registrationVisible = false;
  private registrationCube: THREE.Mesh | null = null;
  private shoulderNdc: { left: { x: number; y: number }; right: { x: number; y: number } } | null = null;

  private onContextLost = (e: Event) => {
    e.preventDefault();
    this.contextLost = true;
  };
  private onContextRestored = () => {
    this.contextLost = false;
    this.projectionKey = '';
  };

  constructor(container: HTMLElement) {
    this.container = container;
    this.scene = new THREE.Scene();

    const width = container.clientWidth || 1280;
    const height = container.clientHeight || 720;
    // fov/aspect are placeholders: the projection matrix is always replaced by
    // setProjection() before the first meaningful frame and never recomputed by three.
    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.05, 20.0);
    this.camera.position.set(0, 0, 0);
    this.camera.matrixAutoUpdate = false;
    this.camera.updateMatrixWorld(true);

    try {
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch (err) {
      console.error('ThreeSceneManager: WebGL initialisation failed', err);
      throw new Error('WEBGL_UNAVAILABLE');
    }
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(width, height);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    // Stages 1–3: linear workflow, sRGB output, NO tone mapping, fixed neutral lights.
    // Video-driven lighting returns only in Stage 4.7.
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.addEventListener('webglcontextlost', this.onContextLost, false);
    this.renderer.domElement.addEventListener('webglcontextrestored', this.onContextRestored, false);
    this.container.appendChild(this.renderer.domElement);

    this.setupLighting();

    this.bodyRoot = new THREE.Group();
    this.bodyRoot.name = 'body_root';
    this.bodyRoot.visible = false;
    this.scene.add(this.bodyRoot);

    this.bodyProxy = new MHRBodyProxy();
    this.bodyRoot.add(this.bodyProxy.group);
  }

  /** Fixed neutral white lights (no per-frame overrides). */
  private setupLighting(): void {
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const key = new THREE.DirectionalLight(0xffffff, 1.0);
    key.position.set(0.5, 1.0, 2.0); // camera side, slightly above
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.3);
    fill.position.set(-1.0, 0.0, 1.0);
    this.scene.add(fill);
  }

  /**
   * Sets the projection from intrinsics and the video display transform. Cheap no-op when
   * nothing changed; call every frame.
   */
  setProjection(K: CameraIntrinsics, display: VideoDisplayTransform, near = 0.05, far = 20): void {
    const key = [K.fx, K.fy, K.cx, K.cy, display.containerWidth, display.containerHeight, display.scaleX, display.scaleY, display.offsetX, display.offsetY, near, far]
      .map((v) => v.toFixed(4))
      .join('|');
    if (key === this.projectionKey) return;
    this.projectionKey = key;
    buildProjectionMatrix(K, display, near, far, this.camera.projectionMatrix);
    this.camera.projectionMatrixInverse.copy(this.camera.projectionMatrix).invert();
  }

  resize(width: number, height: number): void {
    if (!this.renderer || this.isDisposed || width <= 0 || height <= 0) return;
    this.renderer.setSize(width, height, false);
  }

  private async fetchSimulationData(garment: GarmentMetadata): Promise<SimulationData | null> {
    if (!garment.simulation.enabled) return null;
    const url = garment.modelPath.replace(/model\.glb$/, 'simulation-data.json');
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      return (await res.json()) as SimulationData;
    } catch {
      return null;
    }
  }

  private loadInstance(garment: GarmentMetadata): Promise<GarmentInstance> {
    const cached = this.instances.get(garment.id);
    if (cached) return Promise.resolve(cached);
    const inFlight = this.loading.get(garment.id);
    if (inFlight) return inFlight;

    const p = (async () => {
      const [gltf, simData] = await Promise.all([this.gltfLoader.loadAsync(garment.modelPath), this.fetchSimulationData(garment)]);
      const material = FabricMaterialFactory.createFabricMaterial(garment.material.color, garment.fabric);
      gltf.scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh) return;
        const old = m.material as THREE.Material | THREE.Material[];
        if (Array.isArray(old)) old.forEach((x) => x.dispose());
        else old?.dispose();
        m.material = material;
        m.renderOrder = 1; // after the depth-only proxy (0)
      });
      const inst = new GarmentInstance(gltf.scene, garment, simData);
      if (this.isDisposed) {
        inst.dispose();
        material.normalMap?.dispose();
        material.dispose();
        throw new Error('SCENE_DISPOSED');
      }
      this.materials.set(garment.id, material);
      this.instances.set(garment.id, inst);
      return inst;
    })();
    this.loading.set(garment.id, p);
    p.finally(() => this.loading.delete(garment.id)).catch(() => undefined);
    return p;
  }

  /** Loads (or reuses) and activates a garment. */
  async loadGarment(garment: GarmentMetadata): Promise<void> {
    const inst = await this.loadInstance(garment);
    if (this.isDisposed) return;
    if (this.active === inst) return;
    this.active?.detach();
    this.active = inst;
    inst.attach(this.bodyRoot);
    inst.setDebug(this.debug, this.bodyProxy);
    this.applyMaterialMode();
    this.attachGizmo();
    this.attachRegistrationCube();
    // Legs are inside skirts / dresses; arms are outside every garment's torso panel.
    this.bodyProxy.setCollisionCapsules(garment.category === 'tops' ? [] : ['left_thigh', 'right_thigh']);
  }

  get activeGarment(): GarmentInstance | null {
    return this.active;
  }

  /** Applies a fitting result (or null when tracking is lost). */
  setFrameTarget(fit: DetailedFittingResult | null, nowMs = performance.now()): void {
    if (!fit || !fit.pnpResult.valid) {
      this.tracking = false;
      return;
    }
    const lostFor = nowMs - this.lastTrackedAt;
    this.tracking = true;
    this.lastTrackedAt = nowMs;
    this.targetPos.fromArray(fit.bodyPose.position);
    this.targetQuat.fromArray(fit.bodyPose.quaternion);
    this.targetScale.fromArray(fit.garmentScale);
    this.armL = fit.armDirectionsBody.left ? new THREE.Vector3(...fit.armDirectionsBody.left) : null;
    this.armR = fit.armDirectionsBody.right ? new THREE.Vector3(...fit.armDirectionsBody.right) : null;
    this.chordL = fit.fullArmDirectionsBody.left ? new THREE.Vector3(...fit.fullArmDirectionsBody.left) : null;
    this.chordR = fit.fullArmDirectionsBody.right ? new THREE.Vector3(...fit.fullArmDirectionsBody.right) : null;

    if (this.registrationGroup) {
      for (const [name, p] of Object.entries(fit.pnpKeypointsCamera)) {
        this.registrationGroup.getObjectByName('reg_' + name)?.position.set(p[0], p[1], p[2]);
      }
    }

    this.bodyProxy.setShape(fit.bodyShape);
    const limbs: Partial<Record<MHRJointName, THREE.Vector3>> = {};
    for (const [k, v] of Object.entries(fit.limbJoints)) if (v) limbs[k as MHRJointName] = new THREE.Vector3(v[0], v[1], v[2]);
    this.bodyProxy.updateLimbs(limbs);

    // Only REQUEST a snap; the transform itself is written exclusively by setPose().
    if (!this.hasTarget || lostFor > SNAP_AFTER_LOSS_MS) this.poseSmoother.requestSnap();
    this.hasTarget = true;
  }

  /** Shape-only update (e.g. for tests or when only the body model changed). */
  setBodyShape(shape: BodyShape): void {
    this.bodyProxy.setShape(shape);
  }

  setDebugLayers(layers: Partial<SceneDebugLayers>): void {
    this.debug = { ...this.debug, ...layers };
    this.bodyProxy.setDebugVisible(this.debug.bodyProxy);
    this.active?.setDebug(this.debug, this.bodyProxy);
  }

  /** Backward-compatible toggle used by the skeleton button. */
  setDebugSkeletonVisible(visible: boolean): void {
    this.setDebugLayers({ bodyProxy: visible });
  }

  // ------------------------------------------------------------------ Stage-1 diagnostics

  setDebugMaterialMode(mode: DebugMaterialMode): void {
    this.materialMode = mode;
    this.applyMaterialMode();
  }

  setAxesGizmoVisible(visible: boolean): void {
    this.axesVisible = visible;
    this.attachGizmo();
  }

  /** Enables the per-frame pixel probe (one gl.readPixels per frame; debug only). */
  setProbeEnabled(enabled: boolean): void {
    this.probeEnabled = enabled;
    if (!enabled) this.probeRgb = null;
  }

  /** Shoulder landmarks in NDC, for comparing garment +X with the image. */
  setShoulderNdcHint(hint: { left: { x: number; y: number }; right: { x: number; y: number } } | null): void {
    this.shoulderNdc = hint;
  }

  /** Magenta spheres at R·X_i + t (raw PnP pose) and a magenta cube at the garment anchor. */
  setRegistrationVisible(visible: boolean): void {
    this.registrationVisible = visible;
    if (!this.registrationGroup) {
      const mat = new THREE.MeshBasicMaterial({ color: 0xff00ff, depthTest: false });
      this.registrationGroup = new THREE.Group();
      this.registrationGroup.name = 'registration_probe';
      for (const n of ['left_shoulder', 'right_shoulder', 'left_hip', 'right_hip']) {
        const m = new THREE.Mesh(new THREE.SphereGeometry(0.012, 12, 8), mat);
        m.name = 'reg_' + n;
        m.renderOrder = 30;
        this.registrationGroup.add(m);
      }
      this.scene.add(this.registrationGroup); // camera space == scene space
      this.registrationCube = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.025, 0.025), mat);
      this.registrationCube.renderOrder = 30;
      this.registrationCube.name = 'reg_garment_anchor';
    }
    this.registrationGroup.visible = visible;
    this.attachRegistrationCube();
  }

  private attachRegistrationCube(): void {
    if (!this.registrationCube) return;
    this.registrationCube.parent?.remove(this.registrationCube);
    if (this.active && this.registrationVisible) {
      this.registrationCube.position.copy(this.active.anchor.anchor);
      this.active.anchorGroup.add(this.registrationCube);
    }
  }

  /**
   * Container-pixel (pre-CSS-flip) positions of the magenta probes, projected with THE camera
   * used for rendering (Vector3.project → NDC → container px).
   */
  registrationPixels(display: VideoDisplayTransform): { keypoints: Record<string, Vec2>; garmentAnchor: Vec2 | null } {
    const keypoints: Record<string, Vec2> = {};
    this.camera.updateMatrixWorld();
    if (this.registrationGroup) {
      for (const c of this.registrationGroup.children) {
        const p = c.position.clone().project(this.camera);
        keypoints[c.name.replace('reg_', '')] = ndcToDisplay({ x: p.x, y: p.y }, display);
      }
    }
    let garmentAnchor: Vec2 | null = null;
    if (this.active) {
      const w = this.active.anchorGroup.localToWorld(this.active.anchor.anchor.clone()).project(this.camera);
      garmentAnchor = ndcToDisplay({ x: w.x, y: w.y }, display);
    }
    return { keypoints, garmentAnchor };
  }

  private attachGizmo(): void {
    if (!this.axesGizmo) this.axesGizmo = createAxesGizmo();
    this.axesGizmo.parent?.remove(this.axesGizmo);
    if (this.active && this.axesVisible) {
      this.axesGizmo.position.copy(this.active.anchor.anchor);
      this.active.anchorGroup.add(this.axesGizmo);
    }
  }

  private applyMaterialMode(): void {
    // Restore originals first.
    this.originalMaterials.forEach((mat, mesh) => (mesh.material = mat));
    this.originalMaterials.clear();
    if (!this.active || this.materialMode === 'normal') return;
    this.active.gltfRoot.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      this.originalMaterials.set(mesh, mesh.material);
      const base = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.Material;
      if (this.materialMode === 'frontOnly') {
        let fo = this.frontOnlyMaterials.get(base);
        if (!fo) {
          fo = base.clone();
          fo.side = THREE.FrontSide;
          this.frontOnlyMaterials.set(base, fo);
        }
        mesh.material = fo;
      } else if (this.materialMode === 'faceColors') {
        mesh.material = this.faceColorMaterial ??= createFaceColorMaterial();
      } else {
        mesh.material = this.midGreyMaterial ??= createMidGreyMaterial();
      }
    });
  }

  /**
   * THE ONLY writer of the body-root (and therefore garment + occluder) transform.
   * Snaps on first acquisition / after a tracking gap, otherwise eases toward the target with
   * a = 1 − exp(−dt/τ): position lerp + quaternion slerp (no Euler interpolation).
   * Returns the factor applied (1 = snap).
   */
  private setPose(dt: number): number {
    const r = this.poseSmoother.step(this.bodyRoot, { position: this.targetPos, quaternion: this.targetQuat }, dt);
    if (r.snapped) {
      this.prevPos = null;
      this.frameLog.snapped = true;
    }
    this.bodyRoot.updateMatrixWorld(true);
    return r.a;
  }

  /** Resets frame timing (call when the tab becomes visible again). */
  resetTiming(): void {
    this.lastRenderTime = null;
    this.prevPos = null;
  }

  render(nowMs = performance.now()): void {
    if (!this.renderer || this.isDisposed || this.contextLost) return;
    const t0 = performance.now();
    const dt = this.lastRenderTime === null ? 1 / 60 : Math.min(0.1, Math.max(0, (nowMs - this.lastRenderTime) / 1000));
    this.lastRenderTime = nowMs;

    const visible = this.hasTarget && this.tracking && this.active !== null;
    this.bodyRoot.visible = visible;
    this.renderFrame++;
    let lerpA = 0;

    if (visible) {
      lerpA = this.setPose(dt);

      // Body-root acceleration (camera space), low-passed and clamped.
      if (this.prevPos && dt > 1e-4) {
        const v = this.bodyRoot.position.clone().sub(this.prevPos).divideScalar(dt);
        const rawA = v.clone().sub(this.prevVel).divideScalar(dt);
        if (rawA.length() > ACCEL_CLAMP) rawA.setLength(ACCEL_CLAMP);
        this.accel.lerp(rawA, 1 - Math.exp(-dt / ACCEL_TAU_S));
        this.prevVel.copy(v);
      } else {
        this.prevVel.set(0, 0, 0);
        this.accel.set(0, 0, 0);
      }
      this.prevPos = (this.prevPos ?? new THREE.Vector3()).copy(this.bodyRoot.position);
    }

    const g0 = performance.now();
    if (this.active && this.hasTarget) {
      this.active.update({
        bodyProxy: this.bodyProxy,
        bodyRoot: this.bodyRoot,
        dt,
        nowMs,
        armDirsBody: { left: this.armL, right: this.armR },
        fullArmDirsBody: { left: this.chordL, right: this.chordR },
        targetScale: this.targetScale,
        tracking: visible,
        frameAccelWorld: this.accel,
      });
    }
    this.lastGarmentMs = performance.now() - g0;

    this.renderer.render(this.scene, this.camera);

    this.frameLog = {
      renderFrame: this.renderFrame,
      dtMs: dt * 1000,
      lerpA,
      snapped: this.frameLog.snapped,
      targetPos: [this.targetPos.x, this.targetPos.y, this.targetPos.z],
      bodyRootPos: [this.bodyRoot.position.x, this.bodyRoot.position.y, this.bodyRoot.position.z],
      garmentParentedToBodyRoot: this.active?.wrapper.parent === this.bodyRoot,
      bodyRootVisible: this.bodyRoot.visible,
    };
    this.frameLog.snapped = false;
    if (this.probeEnabled && this.active && visible) {
      // Chest point 25 cm below / 10 cm to +X of the anchor on the front (+Z), clear of the F gizmo.
      const chest = this.active.anchor.anchor.clone().add(new THREE.Vector3(0.1, -0.25, 0.1)).applyMatrix4(this.active.anchorGroup.matrixWorld);
      const ndc = chest.applyMatrix4(this.camera.matrixWorldInverse).applyMatrix4(this.camera.projectionMatrix);
      this.probeRgb = readPixelAtNdc(this.renderer, ndc);
    }
    this.lastRenderMs = performance.now() - t0;
  }

  getDiagnostics(): SceneDiagnostics {
    const info = this.renderer?.info.render;
    return {
      garment: this.active ? this.active.diagnostics(this.bodyProxy, this.bodyRoot, this.tracking) : null,
      renderMs: this.lastRenderMs,
      garmentUpdateMs: this.lastGarmentMs,
      contextLost: this.contextLost,
      drawCalls: info?.calls ?? 0,
      triangles: info?.triangles ?? 0,
      frame: { ...this.frameLog },
      orientation: this.active
        ? computeOrientationProbe(
            this.active.anchorGroup,
            this.active.anchor.anchor,
            this.camera,
            (this.active.meshes.find((m) => m.mesh.name === this.active!.metadata.construction.simulationMesh)?.mesh as THREE.Mesh) ?? null,
            this.shoulderNdc
          )
        : null,
      probeRgb: this.probeRgb,
      materialMode: this.materialMode,
    };
  }

  dispose(): void {
    if (this.isDisposed) return;
    this.isDisposed = true;
    this.instances.forEach((inst) => inst.dispose());
    this.instances.clear();
    this.materials.forEach((m) => {
      m.normalMap?.dispose();
      m.dispose();
    });
    this.materials.clear();
    this.frontOnlyMaterials.forEach((m) => m.dispose());
    this.faceColorMaterial?.dispose();
    this.midGreyMaterial?.dispose();
    this.bodyProxy.dispose();
    if (this.renderer) {
      this.renderer.domElement.removeEventListener('webglcontextlost', this.onContextLost);
      this.renderer.domElement.removeEventListener('webglcontextrestored', this.onContextRestored);
      this.renderer.dispose();
      this.renderer.domElement.parentNode?.removeChild(this.renderer.domElement);
      this.renderer = null;
    }
  }
}
