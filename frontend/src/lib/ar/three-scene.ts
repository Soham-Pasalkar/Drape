/**
 * DRAPE Three.js WebGL2 Scene Manager (Parametric Architecture)
 *
 * Implements:
 * 1. Off-axis pinhole camera projection matrix directly from calibrated intrinsics.
 * 2. MHR Body Proxy with depth-only occlusion geometry (colorWrite = false, depthWrite = true).
 * 3. Luxury PBR fabric materials with KHR_materials_sheen properties and procedural micro-weave normals.
 * 4. Environmental webcam lighting adaptation (ambient color, illuminance, key direction).
 * 5. Garment correspondence deformation & XPBD cloth simulation updates.
 * 6. High-performance, zero-leak WebGL2 resource lifecycle management.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { GarmentMetadata, Transform3D, BodyMeasurements, CameraIntrinsics, MHRJointName } from './types';
import { RigidPose3D } from './fitting-engine';
import { MHRBodyProxy } from './mhr-body-proxy';
import { FabricMaterialFactory } from './fabric-materials';
import { EnvironmentalLightingEstimator } from './environmental-lighting';
import { GarmentCorrespondenceManager, VertexCorrespondence } from './garment-correspondence';
import { XPBDClothSolver } from './xpbd-cloth-solver';
import { SkeletalSkinningEngine } from './skeletal-skinning';

export class ThreeSceneManager {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer | null = null;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  private gltfLoader: GLTFLoader;

  // Body Proxy & Depth Occlusion
  public bodyProxy: MHRBodyProxy;

  // Active Garment Model & Skinning/Simulation Subsystems
  private currentModelGroup: THREE.Group | null = null;
  private activeGarmentId: string | null = null;
  private modelCache: Map<string, THREE.Group> = new Map();
  private garmentMeshes: THREE.Mesh[] = [];

  // Correspondence & XPBD Solver
  private correspondenceManager: GarmentCorrespondenceManager;
  private meshCorrespondences: Map<string, VertexCorrespondence[]> = new Map();
  private xpbdSolver: XPBDClothSolver | null = null;
  private skinningEngine: SkeletalSkinningEngine;

  // Environmental Lighting
  private lightingEstimator: EnvironmentalLightingEstimator;
  private ambientLight!: THREE.AmbientLight;
  private keyLight!: THREE.DirectionalLight;
  private fillLight!: THREE.DirectionalLight;
  private rimLight!: THREE.DirectionalLight;

  // Animation & Interpolation
  private targetTransform: Transform3D | null = null;
  private currentTransform: Transform3D = {
    position: [0, 0, -1.6],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
  };

  // 6-DoF Rigid Poses for Garment and Body Proxy (Vector & Quaternion)
  private targetGarmentPos = new THREE.Vector3(0, 0, -1.6);
  private targetGarmentQuat = new THREE.Quaternion();
  private targetGarmentScale = new THREE.Vector3(1, 1, 1);
  private currentGarmentPos = new THREE.Vector3(0, 0, -1.6);
  private currentGarmentQuat = new THREE.Quaternion();
  private currentGarmentScale = new THREE.Vector3(1, 1, 1);

  private targetBodyPos = new THREE.Vector3(0, 0, -1.6);
  private targetBodyQuat = new THREE.Quaternion();
  private currentBodyPos = new THREE.Vector3(0, 0, -1.6);
  private currentBodyQuat = new THREE.Quaternion();

  private hasPoses = false;
  private latestJointRotations: Record<MHRJointName, [number, number, number, number]> | null = null;
  private latestLimbJoints: Partial<Record<MHRJointName, [number, number, number]>> | null = null;

  private isDisposed = false;
  private isMirrored = true;
  private lastRenderTime = performance.now();

  constructor(container: HTMLElement) {
    this.container = container;
    this.scene = new THREE.Scene();

    const width = container.clientWidth || 1280;
    const height = container.clientHeight || 720;
    const aspect = width / height;

    // 1. Perspective Camera (Initialized with standard frustum, later overwritten by calibrated matrix)
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.05, 20.0);
    this.camera.position.set(0, 0, 0); // Camera at origin in camera-space

    // 2. WebGL2 Renderer with transparent background for AR overlay
    try {
      this.renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
      this.renderer.setSize(width, height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.1;

      this.renderer.domElement.addEventListener('webglcontextlost', (e) => {
        e.preventDefault();
        console.warn('ThreeSceneManager: WebGL context lost.');
      });

      this.container.appendChild(this.renderer.domElement);
    } catch (err) {
      console.error('ThreeSceneManager: Failed to initialize WebGL2 renderer', err);
      throw new Error('WEBGL_UNAVAILABLE');
    }

    // 3. Studio Lighting
    this.setupLighting();

    // 4. MHR Body Proxy with Depth Occlusion
    this.bodyProxy = new MHRBodyProxy();
    this.scene.add(this.bodyProxy.group);

    // 5. Correspondence & Skinning Subsystems
    this.correspondenceManager = new GarmentCorrespondenceManager();
    this.skinningEngine = new SkeletalSkinningEngine();
    this.lightingEstimator = new EnvironmentalLightingEstimator();
    this.gltfLoader = new GLTFLoader();
  }

  private setupLighting(): void {
    this.ambientLight = new THREE.AmbientLight(0xffffff, 1.3);
    this.scene.add(this.ambientLight);

    this.keyLight = new THREE.DirectionalLight(0xfff8ee, 2.2);
    this.keyLight.position.set(1.5, 3.0, 2.0);
    this.scene.add(this.keyLight);

    this.fillLight = new THREE.DirectionalLight(0xe8f0ff, 0.9);
    this.fillLight.position.set(-2.0, -1.0, 1.5);
    this.scene.add(this.fillLight);

    this.rimLight = new THREE.DirectionalLight(0xffffff, 0.7);
    this.rimLight.position.set(0, 2.5, -2.0);
    this.scene.add(this.rimLight);
  }

  /**
   * Applies calibrated camera projection matrix directly to Three.js camera.
   */
  setCalibratedProjectionMatrix(matrix: THREE.Matrix4, isMirrored = true): void {
    this.isMirrored = isMirrored;
    this.camera.projectionMatrix.copy(matrix);
    this.camera.projectionMatrixInverse.copy(matrix).invert();
  }

  /**
   * Resizes viewport when container or camera stream resolution changes.
   */
  resize(width: number, height: number): void {
    if (!this.renderer || this.isDisposed) return;
    this.renderer.setSize(width, height);
  }

  /**
   * Updates lighting from live webcam frame.
   */
  updateEnvironmentalLighting(video: HTMLVideoElement): void {
    const est = this.lightingEstimator.estimateFromVideo(video);
    if (this.ambientLight) {
      this.ambientLight.intensity = est.ambientIntensity;
      this.ambientLight.color.copy(est.ambientColor);
    }
    if (this.keyLight) {
      this.keyLight.intensity = est.keyIntensity;
    }
  }

  /**
   * Loads or switches to a garment model by metadata without reloading the scene.
   */
  async loadGarment(garment: GarmentMetadata): Promise<void> {
    if (this.activeGarmentId === garment.id && this.currentModelGroup) return;

    let modelGroup = this.modelCache.get(garment.id);

    if (!modelGroup) {
      modelGroup = await new Promise<THREE.Group>((resolve, reject) => {
        this.gltfLoader.load(
          garment.modelPath,
          (gltf) => {
            const root = gltf.scene;
            root.updateMatrixWorld(true);

            // Read anchor from metadata and reposition root so anchor coincides with (0,0,0)
            const anchor = garment.modelAnchor;
            root.position.set(-anchor.x, -anchor.y, -anchor.z);

            const wrapper = new THREE.Group();
            wrapper.name = `garment_wrapper_${garment.id}`;
            wrapper.add(root);

            resolve(wrapper);
          },
          undefined,
          (error) => reject(error)
        );
      });

      this.modelCache.set(garment.id, modelGroup);
    }

    // Remove existing model from scene
    if (this.currentModelGroup) {
      this.scene.remove(this.currentModelGroup);
    }

    this.currentModelGroup = modelGroup;
    this.activeGarmentId = garment.id;
    this.scene.add(this.currentModelGroup);

    // Apply luxury PBR fabric material with sheen and micro-weave normal map
    this.garmentMeshes = [];
    const fabricMaterial = FabricMaterialFactory.createFabricMaterial(
      garment.material.color,
      garment.fabric
    );

    this.currentModelGroup.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.material = fabricMaterial;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.renderOrder = 1; // Render after depth-only body proxy (0)
        this.garmentMeshes.push(mesh);
      }
    });

    // Initialize XPBD cloth solver if simulation is enabled
    if (garment.simulation.enabled && this.garmentMeshes.length > 0) {
      this.xpbdSolver = new XPBDClothSolver(garment.simulation);
      const primaryGeom = this.garmentMeshes[0].geometry;
      const posAttr = primaryGeom.getAttribute('position');
      const idxAttr = primaryGeom.getIndex();

      if (posAttr && idxAttr) {
        this.xpbdSolver.initializeMesh(
          posAttr.array as Float32Array,
          idxAttr.array as Uint16Array
        );
      }
    } else {
      this.xpbdSolver = null;
    }
  }

  /**
   * Deforms active garment to match personalized body measurements and radial ease.
   */
  adaptGarmentToBody(measurements: BodyMeasurements, easeOffsetM = 0.015): void {
    if (!this.currentModelGroup || this.garmentMeshes.length === 0) return;

    this.bodyProxy.updateSectionsFromMeasurements(
      measurements.shoulderBreadthCm / 100.0,
      measurements.chestCircumferenceCm / 100.0,
      measurements.waistCircumferenceCm / 100.0,
      measurements.hipCircumferenceCm / 100.0
    );

    for (const mesh of this.garmentMeshes) {
      let correspondences = this.meshCorrespondences.get(mesh.uuid);
      if (!correspondences) {
        correspondences = this.correspondenceManager.generateCorrespondence(
          mesh.geometry,
          this.bodyProxy,
          'shoulder_center'
        );
        this.meshCorrespondences.set(mesh.uuid, correspondences);
      }

      this.correspondenceManager.applyDeformation(
        mesh.geometry,
        correspondences,
        easeOffsetM
      );
    }
  }

  /**
   * Sets unified 6-DoF target poses for both garment and body proxy with joint rotations and limb colliders.
   */
  setTargetPoses(
    garmentPose: RigidPose3D | null,
    bodyPose: RigidPose3D | null,
    jointRotations?: Record<MHRJointName, [number, number, number, number]>,
    limbJoints?: Partial<Record<MHRJointName, [number, number, number]>>
  ): void {
    if (!garmentPose || !bodyPose) {
      this.hasPoses = false;
      if (this.currentModelGroup) this.currentModelGroup.visible = false;
      this.bodyProxy.group.visible = false;
      return;
    }

    if (this.currentModelGroup) this.currentModelGroup.visible = true;
    this.bodyProxy.group.visible = true;
    this.hasPoses = true;

    this.targetGarmentPos.set(
      garmentPose.position[0],
      garmentPose.position[1],
      garmentPose.position[2]
    );
    this.targetGarmentQuat.set(
      garmentPose.quaternion[0],
      garmentPose.quaternion[1],
      garmentPose.quaternion[2],
      garmentPose.quaternion[3]
    );
    this.targetGarmentScale.set(
      garmentPose.scale[0],
      garmentPose.scale[1],
      garmentPose.scale[2]
    );

    this.targetBodyPos.set(
      bodyPose.position[0],
      bodyPose.position[1],
      bodyPose.position[2]
    );
    this.targetBodyQuat.set(
      bodyPose.quaternion[0],
      bodyPose.quaternion[1],
      bodyPose.quaternion[2],
      bodyPose.quaternion[3]
    );

    if (jointRotations) {
      this.latestJointRotations = jointRotations;
    }

    if (limbJoints) {
      this.latestLimbJoints = limbJoints;
      const limbVecs: Partial<Record<MHRJointName, THREE.Vector3>> = {};
      for (const [k, v] of Object.entries(limbJoints)) {
        if (v) limbVecs[k as MHRJointName] = new THREE.Vector3(v[0], v[1], v[2]);
      }
      this.bodyProxy.updateLimbs(limbVecs);
    }
  }

  /**
   * Backward-compatible transform setter.
   */
  setTargetTransform(transform: Transform3D | null): void {
    this.targetTransform = transform;
    if (!transform && this.currentModelGroup) {
      this.currentModelGroup.visible = false;
      this.bodyProxy.group.visible = false;
    } else if (transform && this.currentModelGroup) {
      this.currentModelGroup.visible = true;
      this.bodyProxy.group.visible = true;
    }
  }

  /**
   * Backward-compatible body root transform setter.
   */
  setBodyRootTransform(
    position: [number, number, number],
    quaternion: [number, number, number, number]
  ): void {
    this.bodyProxy.setRootTransform(position, quaternion);
  }

  /**
   * Continuous render loop with XPBD cloth step, kinematic sleeve deformation, and smooth transform interpolation.
   */
  render(): void {
    if (!this.renderer || this.isDisposed) return;

    const now = performance.now();
    const dt = Math.min((now - this.lastRenderTime) / 1000.0, 0.05);
    this.lastRenderTime = now;

    // 1. Primary: Unified 6-DoF SLERP & Vector LERP
    if (this.hasPoses && this.currentModelGroup && this.currentModelGroup.visible) {
      const alphaPos = 0.45;
      const alphaRot = 0.45;
      const alphaScale = 0.3;

      this.currentGarmentPos.lerp(this.targetGarmentPos, alphaPos);
      this.currentGarmentQuat.slerp(this.targetGarmentQuat, alphaRot);
      this.currentGarmentScale.lerp(this.targetGarmentScale, alphaScale);

      this.currentModelGroup.position.copy(this.currentGarmentPos);
      this.currentModelGroup.quaternion.copy(this.currentGarmentQuat);
      this.currentModelGroup.scale.copy(this.currentGarmentScale);

      this.currentBodyPos.lerp(this.targetBodyPos, alphaPos);
      this.currentBodyQuat.slerp(this.targetBodyQuat, alphaRot);

      this.bodyProxy.setRootTransform(
        [this.currentBodyPos.x, this.currentBodyPos.y, this.currentBodyPos.z],
        [this.currentBodyQuat.x, this.currentBodyQuat.y, this.currentBodyQuat.z, this.currentBodyQuat.w]
      );

      // Rotate sleeves with shoulder kinematics
      if (this.latestJointRotations) {
        this.updateSleeveJoints(this.latestJointRotations);
      }
    } else if (this.targetTransform && this.currentModelGroup) {
      // Legacy fallback
      const posLerp = 0.35;
      const rotLerp = 0.35;
      const scaleLerp = 0.25;

      this.currentTransform.position[0] += (this.targetTransform.position[0] - this.currentTransform.position[0]) * posLerp;
      this.currentTransform.position[1] += (this.targetTransform.position[1] - this.currentTransform.position[1]) * posLerp;
      this.currentTransform.position[2] += (this.targetTransform.position[2] - this.currentTransform.position[2]) * posLerp;

      this.currentTransform.rotation[0] += (this.targetTransform.rotation[0] - this.currentTransform.rotation[0]) * rotLerp;
      this.currentTransform.rotation[1] += (this.targetTransform.rotation[1] - this.currentTransform.rotation[1]) * rotLerp;
      this.currentTransform.rotation[2] += (this.targetTransform.rotation[2] - this.currentTransform.rotation[2]) * rotLerp;

      this.currentTransform.scale[0] += (this.targetTransform.scale[0] - this.currentTransform.scale[0]) * scaleLerp;
      this.currentTransform.scale[1] += (this.targetTransform.scale[1] - this.currentTransform.scale[1]) * scaleLerp;
      this.currentTransform.scale[2] += (this.targetTransform.scale[2] - this.currentTransform.scale[2]) * scaleLerp;

      this.currentModelGroup.position.set(
        this.currentTransform.position[0],
        this.currentTransform.position[1],
        this.currentTransform.position[2]
      );

      this.currentModelGroup.rotation.set(
        this.currentTransform.rotation[0],
        this.currentTransform.rotation[1],
        this.currentTransform.rotation[2],
        'ZYX'
      );

      this.currentModelGroup.scale.set(
        this.currentTransform.scale[0],
        this.currentTransform.scale[1],
        this.currentTransform.scale[2]
      );

      this.bodyProxy.group.position.copy(this.currentModelGroup.position);
      this.bodyProxy.group.quaternion.copy(this.currentModelGroup.quaternion);
    }

    // 2. Step XPBD Cloth Simulation with Body Collisions
    if (this.xpbdSolver && this.garmentMeshes.length > 0) {
      const rootPos: [number, number, number] = this.currentModelGroup
        ? [this.currentModelGroup.position.x, this.currentModelGroup.position.y, this.currentModelGroup.position.z]
        : [0, 0, -1.6];

      this.xpbdSolver.step(dt, this.bodyProxy, rootPos);

      const simPositions = this.xpbdSolver.getSimulatedPositions();
      if (simPositions) {
        const primaryGeom = this.garmentMeshes[0].geometry;
        const posAttr = primaryGeom.getAttribute('position') as THREE.BufferAttribute;
        if (posAttr && posAttr.array.length === simPositions.length) {
          posAttr.array.set(simPositions);
          posAttr.needsUpdate = true;
          primaryGeom.computeVertexNormals();
        }
      }
    }

    // 3. Render WebGL2 scene
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Updates sleeve rotations dynamically from shoulder swing-twist rotations.
   */
  private updateSleeveJoints(
    jointRotations: Record<MHRJointName, [number, number, number, number]>
  ): void {
    if (!this.currentModelGroup) return;

    const leftShoulderQuat = jointRotations.left_shoulder;
    const rightShoulderQuat = jointRotations.right_shoulder;

    this.currentModelGroup.traverse((child) => {
      if (child.name === 'left_sleeve' && leftShoulderQuat) {
        const baseQ = new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(0, 0, 1),
          -Math.PI / 4.2
        );
        const jointQ = new THREE.Quaternion(
          leftShoulderQuat[0],
          leftShoulderQuat[1],
          leftShoulderQuat[2],
          leftShoulderQuat[3]
        );
        child.quaternion.copy(jointQ.multiply(baseQ));
      } else if (child.name === 'right_sleeve' && rightShoulderQuat) {
        const baseQ = new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(0, 0, 1),
          Math.PI / 4.2
        );
        const jointQ = new THREE.Quaternion(
          rightShoulderQuat[0],
          rightShoulderQuat[1],
          rightShoulderQuat[2],
          rightShoulderQuat[3]
        );
        child.quaternion.copy(jointQ.multiply(baseQ));
      }
    });
  }

  setDebugSkeletonVisible(visible: boolean): void {
    this.bodyProxy.setDebugVisible(visible);
  }

  /**
   * Completely disposes Three.js WebGL resources.
   */
  dispose(): void {
    if (this.isDisposed) return;
    this.isDisposed = true;

    this.bodyProxy.dispose();

    this.modelCache.forEach((group) => {
      group.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.geometry.dispose();
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => m.dispose());
          } else if (mesh.material) {
            mesh.material.dispose();
          }
        }
      });
    });
    this.modelCache.clear();

    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement && this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
      this.renderer = null;
    }
  }
}
