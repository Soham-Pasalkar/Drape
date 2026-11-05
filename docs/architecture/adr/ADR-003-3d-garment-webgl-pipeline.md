# ADR-003: 3D Garment Pipeline & Asset Format Baseline

* **Status:** accepted
* **Deciders:** Technical Architect (Antigravity Agent), Human Project Owner
* **Date:** 2026-11-05
* **Technical Story:** Links to PRD Requirements [`FR-017`](file:///Users/soham/Github/Drape/docs/aidlc/PRD.md#fr-017)–[`FR-022`](file:///Users/soham/Github/Drape/docs/aidlc/PRD.md#fr-022), [`NFR-001`](file:///Users/soham/Github/Drape/docs/aidlc/PRD.md#nfr-001), [`NFR-002`](file:///Users/soham/Github/Drape/docs/aidlc/PRD.md#nfr-002) and Risks [`RSK-004`](file:///Users/soham/Github/Drape/docs/aidlc/RISK_REGISTER.md#rsk-004), [`RSK-005`](file:///Users/soham/Github/Drape/docs/aidlc/RISK_REGISTER.md#rsk-005)

## Context and Problem Statement

DRAPE's Pillar 2 includes a real-time, interactive 3D virtual try-on engine operating in standard customer mobile and desktop web browsers without external plugins or native application downloads.

The browser rendering pipeline must deliver smooth framerates (≥ 30 FPS) across heterogeneous mobile chipsets, support multi-layer garment draping on an avatar body, maintain manageable asset transfer sizes (≤ 5 MB), and establish a standard 3D asset interchange format for brand catalog onboarding.

## Decision Drivers

* **Ubiquitous Browser Compatibility:** Must render reliably on iOS Safari, Android Chrome, and desktop browsers without requiring bleeding-edge hardware flags.
* **Rendering Performance & Frame Stability:** Architectural requirement to target 30+ FPS during active pose tracking without crashing mobile WebGL contexts due to Out-Of-Memory (OOM) errors.
* **Standardized 3D Asset Interchange:** Must adopt an open, industry-standard 3D format supported by major digital fashion authoring suites (CLO3D, Browzwear, Marvelous Designer, Blender).
* **Progressive Enhancement:** Must allow high-end devices to leverage advanced graphics capabilities without penalizing baseline mobile users.

## Considered Options

* **Option 1: 2D Perspective Warping & Flat Alpha Overlays** (traditional image stickers dynamically scaled to bounding boxes).
* **Option 2: Native WebGPU-Only Rendering Pipeline** (cutting-edge compute shaders and advanced particle simulation).
* **Option 3: Three.js / React Three Fiber on WebGL 2.0 Baseline with GLB/glTF 2.0 as Provisional Asset Format** (mature WebGL 2 rendering pipeline with skeletal skinning and KTX2 texture compression, treating WebGPU as a future progressive enhancement).

## Decision Outcome

Chosen option: **"Option 3: Three.js / React Three Fiber on WebGL 2.0 Baseline with GLB/glTF 2.0 as Provisional Asset Format"**, because WebGL 2.0 provides broad browser API compatibility across modern desktop and mobile browsers, while Three.js / R3F provides a declarative, reactive scene graph deeply integrated into our Next.js frontend ecosystem.

> [!IMPORTANT]
> **API Support vs. Real Performance Distinction:** While WebGL 2.0 API support is present in >98% of modern mobile and desktop browser engines, API presence does not guarantee sufficient GPU fill-rate, VRAM capacity, or thermal stability under active 3D rendering. Actual rendering capability varies drastically across device tiers and must be treated as an empirical validation target rather than an assumed given.

### Asset Format Classification & Provisional M4 Engineering Targets

**GLB / glTF 2.0 (developed by The Khronos Group and standardized internationally as ISO/IEC 12113:2022) is classified as a PROVISIONAL RESEARCH BASELINE**, pending empirical performance and pipeline validation during Milestone 4 ([`DEC-CAT-004`](file:///Users/soham/Github/Drape/docs/aidlc/OPEN_DECISIONS_REGISTER.md#dec-cat-004)). 

> [!IMPORTANT]
> **Format Standardization vs. Authoring Interoperability:** While glTF 2.0 provides an ISO/IEC standardized runtime schema, standard ratification does not guarantee automatic, friction-free interoperability across digital fashion authoring suites (e.g. CLO3D, Browzwear, Marvelous Designer, Blender). Practical interchange depends heavily on suite-specific export plugins, PBR material mappings (roughness/metallic conversion from physical fabric parameters), extension support (e.g. `KHR_materials_transmission`, `KHR_texture_basisu`), skeletal joint hierarchies, and asset optimization tooling. Production viability requires empirical intake pipeline validation in Milestone 4 ([`DEC-CAT-003`](file:///Users/soham/Github/Drape/docs/aidlc/OPEN_DECISIONS_REGISTER.md#dec-cat-003)).

Full production adoption is contingent upon meeting the following **provisional M4 engineering targets** (which serve as planning guidelines, not yet empirically validated limits):
1. **Geometric Complexity (Provisional Target):** ≤ 40,000 triangles (LOD0) for primary upper-body garments; automated lower-detail LOD generation for distant views.
2. **Texture Memory (Provisional Target):** ≤ 2048×2048 resolution per map, evaluated with KTX2 / Basis Universal GPU texture compression to minimize mobile VRAM footprints.
3. **Asset Transfer Size (Provisional Target):** ≤ 5 MB per individual GLB binary.
4. **Scene Draw Calls (Provisional Target):** ≤ 10 draw calls per composite try-on scene.

### Garment Deformation, Layering & Skeletal Kinematics

* **Pose Landmark to Rig Rotation Transformation:**
  - MediaPipe Pose outputs 33 spatial coordinate landmarks $(x, y, z)$ with confidence visibility scores. These landmarks represent heuristic anatomical keypoints with relative depth, **not** exact physical metric measurements, tailored sizing metrics, or a dense 3D surface scan of the body.
  - The 33 landmarks do **not** map 1:1 to a 33-joint garment rig (many points represent facial landmarks or fingers irrelevant to garment deformation). Instead, an anatomical subset of key torso, shoulder, and limb landmarks is selected.
  - A kinematic vector solver computes directional unit vectors between connected anatomical landmarks (e.g. left shoulder $\to$ left elbow $\to$ left wrist; left hip $\to$ right hip $\to$ neck).
  - Relative rotation quaternions are calculated between these directional vectors and the neutral T-pose/A-pose resting vectors of a simplified standardized avatar rig (e.g. 15–20 active driving bones).
  - The resulting quaternions are applied to corresponding bones in the avatar and garment skeleton hierarchy (`THREE.Bone.quaternion.slerp(...)`).
  - Standard linear blend skinning (LBS) in the WebGL vertex shader deforms garment mesh vertices based on bone weights encoded in the provisional GLB asset.
* **Hierarchical Depth Offsets:** Multi-layering (e.g. jacket over blouse) will use explicit Z-bias, depth-masking, and alpha-hash techniques to prevent visual clipping and Z-fighting.
* **Cloth Simulation as Conditional Candidate:** Real-time Position-Based Dynamics (PBD) or mass-spring cloth simulation is designated as a **Conditional Candidate** due to intense mobile CPU/thermal overhead. It will not be deployed to production without explicit performance benchmarking.

### Positive Consequences

* **Broadest Addressable Platform Reach:** Leverages standard WebGL 2.0 APIs available across iOS Safari, Android Chrome, and desktop browsers without native app installs.
* **Open Standard Runtime Specification:** glTF 2.0 is an established open standard authored by The Khronos Group and ratified as ISO/IEC 12113:2022, providing an open runtime container for 3D geometry, PBR materials, and skeletal animations.
* **Declarative React Integration:** React Three Fiber aligns 3D canvas lifecycle cleanly with Next.js state management and UI overlays.

### Negative Consequences / Trade-offs

* **Asset Preparation & Interoperability Overhead:** Raw CAD garments exported from CLO3D/Browzwear frequently contain millions of polygons, non-standard material models, and uncompressed textures, requiring a dedicated retopology, rigging, and optimization pipeline ([`DEC-CAT-003`](file:///Users/soham/Github/Drape/docs/aidlc/OPEN_DECISIONS_REGISTER.md#dec-cat-003)).
  - *Mitigation:* Asset intake pipeline must evaluate automated Draco/meshoptimizer geometry simplification and KTX2 texture transcoding during catalog ingestion in Milestone 4.
* **Mobile Context Loss:** WebGL contexts can be terminated abruptly by mobile operating systems under memory pressure.
  - *Mitigation:* The 3D viewport component must implement `webglcontextlost` and `webglcontextrestored` event handlers with graceful fallbacks to 2D product imagery.

## Pros and Cons of the Options

### Option 1: 2D Perspective Warping & Flat Alpha Overlays

* Good, because it requires negligible compute and renders instantly on any device.
* Bad, because it lacks 3D depth, cannot drape over curved torsos, fails when the user turns, and looks like a rudimentary sticker rather than an editorial luxury experience.

### Option 2: Native WebGPU-Only Rendering Pipeline

* Good, because modern compute shaders permit ultra-realistic real-time cloth simulation.
* Bad, because WebGPU support across mobile devices (especially older iOS and Android chipsets) remains fragmented and incomplete.
* Bad, because it would exclude a massive portion of DRAPE's target global audience.

### Option 3: Three.js / R3F on WebGL 2.0 with Provisional GLB Baseline

* Good, because it delivers true 3D volumetric depth with widespread global browser compatibility.
* Good, because GLB/glTF 2.0 is an ISO/IEC standardized runtime format with strong ecosystem tooling.
* Good, because it allows progressive enhancement pathways toward WebGPU without breaking the baseline.
* Bad, because fashion CAD export variability requires rigorous normalization and asset optimization.

## Compliance and Verification

* **M4 (First Real 3D Try-On):** Formal benchmarking on target device matrix (iPhone 12+, Samsung Galaxy S21+, mid-range Android, M-series Mac, Intel PC). Verification that frame rendering maintains ≥ 30 FPS without thermal throttling or WebGL context loss.
* **Automated Asset Ingestion Linter:** CI tool checks GLB assets against triangle, texture, and draw call thresholds before allowing catalog publish.

