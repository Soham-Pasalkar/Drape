# DRAPE — Workstream B: 3D Rendering and Garment Engineering Research

**Phase:** 0.2 Technology Evaluation, M0 research supporting M4 and M5.
**Status:** Research complete; no renderer, asset pipeline, deformation technique, M4, or M5 implementation is authorized.
**Prepared / sources accessed:** 2026-11-04.

## 1. Executive summary

DRAPE can investigate a staged browser garment-preview path, but only with a small, rights-cleared asset set and measured WebGL performance. A GLB/glTF asset can package runtime geometry, PBR materials, textures, skins, animation, and morph targets; it does not create a physically correct garment, a body surface, cloth collision, occlusion, size/fit evidence, or commercial rights.

**M4 research target:** a WebGL-baseline, static or lightly rigged/morph-assisted garment preview with bounded, front-facing landmark registration, explicit preview-only wording, and product-imagery fallback.
**M5 research target:** after M4 gates pass, compare controlled authored skin/morph deformation with one constrained dynamic-cloth experiment and separately assess occlusion/clipping. Full physical cloth simulation, FEM, and WebGPU are not M4 dependencies.

Three.js, React Three Fiber (R3F), Babylon.js, CLO, Marvelous Designer, Blender, GLB/glTF, and compression tools are evaluation candidates—not selections. **Current assessment: defer M4/M5 implementation; go only for a separately approved, rights-cleared asset and browser evaluation protocol.** Confidence is moderate in this staged research strategy and low in production feasibility until assets, devices, registration, visual quality, and rights are measured.

## 2. Research methodology

- Primary sources were official specifications, vendor documentation/terms, original repositories/license files, official renderer documentation, and original academic papers. All sources are registered in Section 20 and were accessed 2026-11-04.
- **Verified** means a source directly supports a claim. **Assumption** means DRAPE has not measured or approved it. **Recommendation** is a proposed evaluation direction, not an architecture decision.
- No garment assets, models, packages, benchmarks, browser runs, authoring tests, or user data were created/collected. Performance, cost, compatibility, visual quality, and licensing suitability are therefore not measured for DRAPE.
- Every future experiment must pin renderer/runtime/model/decoder/asset revisions, record rights provenance, and separate visual plausibility from body measurement or physical fit.

## 3. Three.js investigation

### Verified capabilities

Three.js documents scene graph, cameras, `BufferGeometry`, meshes, materials/textures, animation, skins, morph targets, and instancing APIs (S1–S5). `GLTFLoader` supports glTF/GLB loading (S6). `BufferGeometry` is appropriate for efficient typed-buffer geometry, while runtime dynamic vertices require careful updates; morph attributes cannot be changed after first render without disposing/recreating the geometry (S3). Mesh exposes morph-target influences and accounts for skinning/morph state in relevant calculations (S4).

Materials expose depth testing and depth writing; transparent double-sided rendering can require additional draws (S7). These are renderer controls, not an answer to physical depth reconstruction from a camera image.

Three.js is MIT-licensed (S8). Its `dev` branch and mutable documentation must not be treated as a pinned production release; exact version/revision is a later inventory decision.

### WebGL and WebGPU

`WebGPURenderer` documents a WebGPU-oriented renderer with WebGL 2 fallback behavior (S9). Browser support guidance still describes WebGPU as limited availability and not Baseline (S10). **Recommendation:** WebGL 2 remains the M4 baseline; WebGPU may be profiled as progressive enhancement only. A browser that lacks WebGPU must retain the WebGL/product-imagery path.

### Performance implications

Draw calls, texture resolution/format, geometry/vertex count, material variants, skin/morph target count, transparency, decoder initialization, asset fetch/decode, and GPU/JS memory are the relevant measurable drivers. No upstream documentation establishes a DRAPE asset budget or device performance result. Instancing is useful only when the same geometry/material is repeated; a unique garment preview is unlikely to benefit unless a measured scene design shows otherwise.

## 4. React Three Fiber investigation

R3F is a React renderer for Three.js that expresses Three.js objects declaratively (S11). Its documentation states v8 pairs with React 18 and v9 with React 19; v10 is described as alpha and is not a baseline candidate (S11). R3F is MIT-licensed (S12).

**Verified upstream claim:** R3F documentation describes its objects as operating outside the React render loop. This is not a DRAPE performance result. Suspense/asset loading, React state updates, ownership of the render loop, cleanup, and Next.js client/server boundaries all require a later version-pinned proof.

**Recommendation:** treat R3F as the primary ergonomic evaluation candidate if the approved frontend later uses React. Keep a small imperative Three.js control experiment rather than committing two production architectures. Prefer imperative Three.js only if profiling shows R3F lifecycle/state integration materially harms a required render path or if the scene remains intentionally isolated from React composition.

## 5. Alternative renderer comparison

| Candidate | Verified strengths | Limits / evidence gap | Licensing | DRAPE research posture |
|---|---|---|---|---|
| Three.js, direct | Full low-level control of documented renderer/scene/asset APIs (S1–S9) | More manual lifecycle/state/asset orchestration; no DRAPE benchmark | MIT (S8) | Narrow baseline/control candidate. |
| Three.js + R3F | React declarative integration; documented React compatibility pairs (S11) | React/render lifecycle, loading, and performance must be measured | MIT (S12) | Primary evaluation candidate, not selected. |
| Babylon.js | First-party animated-character/glTF workflow; WebGPU capability can be investigated (S13) | Switching engine does not solve garment rights, registration, deformation, or occlusion; no DRAPE benchmark | Apache-2.0 (S14) | Compare only if asset tooling/WebGPU workflow addresses a measured missing need. |
| 2D compositing fallback | Can preserve non-3D product access on unsupported/failed paths | Not a 3D garment solution; cannot validate M4/M5 | N/A | Required fallback concept, not a replacement for M4 research. |

WebGL remains the baseline in every candidate. WebGPU must be feature-detected and optional. No renderer selection is justified until identical representative assets are profiled across the approved device/browser matrix.

## 6. Garment creation tool comparison

| Tool / path | Verified capability | Pipeline trade-off | Rights / terms consideration |
|---|---|---|---|
| CLO | Supports glTF 2.0 import/export with scale/axis controls; PBR and certain physical fabric properties can export, while SBSAR export is restricted by licensing (S15, S16) | Pattern/simulation authoring candidate; export does not guarantee browser-ready topology, metadata retention, rigging, or rights | Service is licensed; terms and selected tier must be reviewed. Work-product statements do not clear patterns, fabrics, avatars, brands, or third-party inputs (S17). |
| Marvelous Designer | v2026.0 documents glTF/GLB export, thickness, unified UVs, animation/keyframe baking, scale/axis conversion, and optional XML metadata for patterns/mesh/physical/sewing data (S18) | Strong authoring/interchange candidate; source metadata must be preserved outside browser delivery and export result reviewed | Selected product terms/tier, source assets, avatar and pattern rights require review. |
| Blender | glTF exporter supports meshes, Principled-BSDF/PBR materials, textures, cameras/lights, skinning, shape-key animation, extras; physics/material animation is not preserved, and triangulation/UV discontinuities can increase vertices (S19) | Useful cleanup, retopology review, baking, LOD preparation, rigging/weights, morph targets, and delivery inspection | Blender is GPL, while artists retain ownership/commercial use of their artwork; third-party source assets/design rights remain separate (S20). |
| Automatic product-image conversion | No reviewed primary evidence establishes accurate production garment reconstruction from arbitrary product imagery | Hidden geometry, patterns, seams, materials, sizes, construction, and rights are unresolved | Photo rights do not grant garment-design/geometry rights | Not a production acquisition route; separate research only if ever approved. |

### Candidate authoring pipeline

`CLO or Marvelous Designer → Blender → GLB/glTF → browser renderer` is technically plausible, not automatically optimal:

1. Obtain rights-cleared pattern/source garment, textures, brand permissions, and licensed avatar/reference inputs.
2. Author/simulate in CLO or Marvelous Designer for source design/reference; record units, axis, avatar, fabric and pattern/seam information.
3. Export controlled interchange data. Scale/axis, UV handling, garment thickness, animation, metadata, and format-specific loss require review.
4. Use Blender for cleanup, triangulation/topology review, material baking, LOD preparation, rigging/weights, morph target preparation, texture preparation, and glTF export inspection.
5. Deliver a separate GLB or `.gltf` browser asset plus a governed external provenance/metadata package. Validate delivery assets independently.

**Verified export limitation:** Blender does not preserve all non-mesh/physics/material animation information in glTF (S19). **Recommendation:** treat authoring source files, patterns/seams, simulation settings, physical parameters, rights evidence, and browser delivery assets as different controlled artifacts.

## 7. Proposed garment asset contract

### M4 mandatory delivery contract

| Field / artifact | Requirement / purpose | Representation |
|---|---|---|
| Asset identity | Stable asset ID, version, product/variant/size association, category, status | External governed metadata. |
| Rights provenance | Creator, brand/design/pattern/texture/scan rights, customer-preview and derivative/optimization/redistribution permissions, license expiry/limits | External contract; not inferred from file. |
| Geometry | Validated triangulated mesh, normal direction, topology/vertex statistics, declared units/metres, right-handed axes, orientation, origin/scale | glTF mesh/node/transform plus external QA data (S21). |
| UV/materials | UVs; PBR metallic-roughness maps/material inputs; texture inventory/resolution/color space | glTF core material/texture definitions (S21). |
| Render metadata | LOD policy, texture/geometry budget, fallback product imagery, supported renderer test status | External contract. |
| Registration | Garment category-specific anchors and documented expected front-facing registration scope | External contract or carefully defined extras; external source of truth. |
| Validation | glTF validation report, asset QA result, source/version checksum, known limitations | Validator output plus external QA record (S22). |

### M5 additions

- Defined garment/body-registration skeleton or compatible rig, joints, bind pose, and skin weights; optional approved pose-corrective morph targets.
- Category-specific deformation limits, anchor policies, occlusion/intersection policy, and test-pose coverage.
- Optional authoring-source seam, pattern, and fabric physical metadata retained externally; it is not a delivery guarantee merely because an authoring tool can export metadata.
- Deformation/occlusion visual-review evidence, performance observations, failure states, and no-physical-fit disclaimer.

### Native versus external representation

glTF 2.0.1 natively represents scenes/nodes, meshes/accessors/buffers, PBR metallic-roughness materials, textures, skins/joints/inverse bind matrices, animations, morph targets, cameras, and extensions; it uses a right-handed coordinate system with metres as base unit (S21). `extras` can carry application data, but **Recommendation:** do not use it as the sole governed source for rights, product, size, provenance, seams/patterns, physical fabric, QA, or business metadata. Those require a versioned external asset contract with controlled validation.

## 8. Garment asset acquisition strategy

| Route | Feasibility / cost posture | Quality / scale posture | Rights gate |
|---|---|---|---|
| Commissioned initial collection | Most controllable for a small prototype; high artist/authoring/cleanup/QA labor | Can meet contract if scope is very small | Contract must cover design, patterns, textures, scans/avatars, browser delivery, derivative optimization, and customer rendering. |
| Brand/manufacturer-provided assets | Most scalable and product-faithful where available | May arrive as CAD/manufacturing assets that need web normalization, rights and QA | Explicit customer-facing rendering, derivative optimization, storage/distribution, and territory/duration rights. |
| Licensed third-party assets | Useful only for generic evaluation or explicitly licensed catalog | Quality/provenance may vary; license-by-asset review burden | Download/platform tier does not imply modification, redistribution, brand, or customer-preview rights. |
| Product-image conversion | Lowest apparent upfront asset effort | Unreliable for hidden geometry/material/construction/size; no source of truth | Source photography does not confer garment-design/geometry rights. |

**Recommendation:** for low-budget research, use a tiny commissioned or brand-authorized, rights-cleared set across a few categories. For commercial scale, pursue brand/manufacturer delivery plus intake/normalization/provenance controls. Do not use automatic image conversion as a product asset source.

## 9. Deformation technique comparison

| Technique | Verified basis | Visual / runtime trade-off | Metadata burden | M4/M5 posture |
|---|---|---|---|---|
| Skeletal skinning | glTF supports joint hierarchy, inverse bind matrices, vertex joint/weight attributes (S21) | Efficient coarse pose response; can collapse/stretch at joints without garment-specific weights/correctives | Rig, bind pose, weights, compatible anchors | M4 candidate. |
| Morph targets / blend shapes | glTF supports weighted per-vertex deltas; clients need only support a bounded number of morphed attributes (S21) | Good for authored known pose/shape corrections; asset size/coverage rise with targets | Target set, weights, intended pose envelope | M4/M5 candidate for controlled cases. |
| Landmark/vertex deformation | Three.js supports geometry/vertex operations; mutable geometry requires careful lifecycle handling (S3) | Can give coarse visual response; 2D landmark ambiguity/topology artifacts likely | Anchor mapping, constraints, deformation policy | Research fallback only. |
| Position-Based Dynamics | Original PBD paper describes position-level constraint projection and real-time cloth/collision demonstrations (S23) | Potentially controllable real-time visual dynamics; collision/tuning/stability and browser cost unmeasured | Particle/constraint/collision model, material parameters, initialization | Conditional M5 experiment after M4. |
| Mass-spring | Research models cloth with masses/springs; stability and implicit/adaptive variants exist (S24, S25) | Simple conceptual model; timestep, collision, tuning, and realism burden | Spring graph, stiffness/damping, collision constraints | M5 comparison only. |
| FEM | Physically richer simulation family | Computational/authoring complexity unsuitable as M4 baseline; browser feasibility unproven here | Material model, mesh/solver/boundaries | Defer; not M4/M5 baseline. |

**Staged recommendation:** M4 evaluates static/skinned/morph-assisted visual registration only. M5, if M4 passes, compares authored skin/morph baseline with one constrained PBD or mass-spring proof on a limited category/pose set. Do not use full physical simulation as a marketing or fit claim.

## 10. Body-to-garment registration analysis

Workstream A establishes that browser pose landmarks are estimated visible points, not a complete body surface, calibrated anthropometry, or fit model. 2D landmarks can drive coarse anchors, scale, orientation, and a registration skeleton; they cannot resolve hidden-body geometry, absolute depth, side/back topology, garment ease, or material behavior.

### Proposed bounded registration flow

1. Accept only the Workstream A quality/consent/camera state; normalize camera orientation, mirror behavior, crop, and coordinate transforms.
2. Use category-specific shoulder, torso, hip, and limb anchors; map normalized image coordinates into a documented render/camera coordinate frame.
3. Estimate only coarse scale/orientation from visible anchor relationships; do not display a measurement or fit score.
4. Restrict initial evaluation to front-facing, sufficiently visible poses and declared categories. Side-facing, moving camera, partial body, crossing limbs, and low-confidence tracking are failure/recovery states.
5. On tracking loss/drift, fade/reset the garment and offer imagery rather than freeze stale placement.

**Assumption requiring test:** a controlled camera/render transform and authored anchors may provide visually plausible registration for a narrow pose/category set. It is not evidence of physical garment fit.

## 11. Occlusion and depth analysis

Four separate problems must not be conflated:

1. Rendering a 3D garment mesh.
2. Registering it visually over pose landmarks.
3. Ordering body parts, hair/accessories, garment surfaces, and camera imagery convincingly.
4. Simulating physical cloth/body interaction.

Depth buffers/depth testing/depth writing resolve ordering among rendered 3D scene objects, while alpha blending/transparency introduces ordering/draw artifacts (S7). They cannot establish real-world person depth from a monocular RGB camera. A person segmentation mask from Workstream A can assist a coarse compositing effect, but is not a depth map, body mesh, collision model, or reliable garment/body-occlusion solution.

### Staged progression

- **M4:** bounded front-facing registration, opaque/simplified material cases where possible, explicit fallbacks for limbs/hair/accessories, and failure labeling. Do not claim accurate occlusion.
- **M5:** evaluate arm/hand/hair/self-occlusion, alpha ordering, clipping, garment/body intersection, depth approximation, and tracking-loss recovery against representative scenarios. Consider an authored proxy/body mesh or depth-estimation research only after its privacy, performance, quality, and rights implications are approved.

## 12. GLB/glTF and optimization analysis

GLB packs JSON and binary resources into a single file; `.gltf` can reference external buffers/textures (S21). **Recommendation:** test GLB for atomic small initial assets and external-resource glTF for independent texture caching; neither is universally superior.

Relevant extensions/tools to evaluate only after baseline asset evidence:

- `KHR_draco_mesh_compression` for compressed geometry (S26).
- `EXT_meshopt_compression` for meshopt-compressed buffer data (S27).
- `KHR_texture_basisu` for KTX2/Basis Universal textures (S28).
- glTF-Validator for structural validation/stats (S22); it does not certify rights, visual realism, performance, or fit.

Meshoptimizer provides optimization/simplification/compression and `gltfpack` (MIT); Draco, Basis Universal, and KTX-Software are Apache-2.0 (S29–S32). These licenses apply to software, not input garment assets. Compression can reduce transfer size while adding encode/decode/transcode, initialization, compatibility, and memory trade-offs. Measure actual download, decode, first render, GPU/JS memory, visual quality, and supported-device behavior before adopting any optimization.

**Early:** validator-clean core glTF/GLB, unit/axis/material/texture discipline, source/provenance contract, baseline load/render measurement.
**Premature:** mandatory compression stack, aggressive LOD/texture strategy, WebGPU-only path, or dynamic cloth simulation before a representative uncompressed baseline exists.

## 13. Licensing and commercial rights matrix

| Item | Software license / terms evidence | Separate commercial-rights questions |
|---|---|---|
| Three.js | MIT (S8) | Renderer license does not clear garment geometry, textures, logos, scans, designs, or customer-facing output. |
| R3F | MIT (S12) | Same asset/output rights separation; pin selected version. |
| Babylon.js | Apache-2.0 (S14) | Same asset/output rights separation. |
| Blender | GPL software; artist owns artwork per official guidance (S20) | Clear third-party patterns/textures/scans/add-ons/brand designs independently. |
| CLO | Licensed service; current general terms mutable (S17) | Confirm selected tier, work-product, embedded content, analytics, patterns/fabrics/avatars and export rights at procurement. |
| Marvelous Designer | Product/export documentation reviewed (S18); selected terms not evaluated here | Confirm commercial service/license tier and every source asset/right. |
| glTF/GLB | Open Khronos specification (S21) | File format gives no license to individual geometry, texture, material, design, or brand assets. |
| Draco/meshopt/Basis/KTX | Apache-2.0 / MIT software evidence (S29–S32) | Review exact decoder/transcoder/runtime builds and notices; software license does not clear compressed assets. |
| Garment/product assets | No DRAPE asset reviewed | Require ownership/license, modification, web delivery, caching/CDN, derivative optimization, preview rendering, territories, duration, attribution, and termination terms. |
| Textures/materials/fonts/brand marks | No DRAPE source reviewed | Each has independent commercial/redistribution/derivative/display rights. |

### Rights checklist

Before an asset enters an experiment or product: identify legal owner; source file/pattern origin; garment-design and trademark permission; scan/photo/avatar/model rights; texture/material license; authoring-tool/content terms; permitted modification/retopology/rigging/compression; browser delivery/CDN/storage; public rendering/output; territory/duration/exclusivity; attribution; audit trail; sublicense/transfer restrictions; and revocation/removal process. Treat unknown terms as a release blocker.

## 14. M4 rendering evaluation protocol

### Test assets and scenarios

Use a small rights-cleared set spanning at least the approved category representation (for example top, jacket, dress) with declared static/skinned/morph state, texture complexity, size/variant association, and source provenance. Test the Workstream A browser/device matrix, portrait/landscape/front-facing camera conditions, selected anchor poses, camera/crop behavior, renderer/model failures, and imagery fallback.

### Measures

Asset file/download/decode and first-render time; geometry/texture bytes; draw calls; texture/GPU/JS memory where observable; frame-time/FPS distribution; rendering stability; registration drift; tracking-loss recovery; context/asset/decoder failure; product fallback; and rights/contract completeness.

### Method and gate

Pin browser/OS/device/GPU/runtime/renderer/loader/decoder/asset revision; repeat scripted runs; record capability, cache/network, power/thermal, capture, and result timestamps. Store raw user images/landmarks only if separately approved; otherwise use minimized/aggregate metrics. **All numeric thresholds are TBD — requires explicit approval before testing.** M4 cannot proceed beyond research unless WebGL baseline, asset provenance/contract, visual-registration behavior, fallback, and measured quality/performance gates are approved.

## 15. M5 deformation and occlusion evaluation protocol

### Test matrix

After M4 gate approval only, use the same validated assets plus deformation states: neutral, arm raise/lower, torso rotation within scope, limb crossing, partial visibility, rapid transition, tracking loss/recovery, opaque/transparent material cases, hair/accessory/hand overlap, and representative lighting/background conditions from Workstream A.

### Measures

Use blinded human visual review for deformation plausibility, clipping, garment/body intersection, occlusion ordering, temporal/vertex stability, registration drift, and recovery. Capture simulation/update frame cost, draw calls, memory, frame-time impact, collision/deformation failure modes, and fallback behavior. Score visual plausibility only; it is never an assessment of physical fit.

### Method and gate

Compare authored skin/morph baseline against at most one constrained PBD or mass-spring experiment under identical asset/device/pose conditions. Record solver/timestep/constraint/quality parameters and failures. **All numeric thresholds are TBD — requires explicit approval before testing.** M5 is defer/no-go unless M4 is approved and deformation/occlusion evidence demonstrates acceptable visual behavior, safe failure states, rights completeness, and a measured performance envelope.

## 16. Cost and feasibility analysis

| Route | Major cost categories | Feasibility conclusion |
|---|---|---|
| Manual/commissioned initial set | Garment authoring, 3D artist/design effort, cleanup, retopology, rigging, textures, optimization, rights, QA, device testing, CDN/storage | Most credible low-budget research route at very small scope; labor intensive. |
| Brand/manufacturer assets | Partner intake, conversion/normalization, QA, rights negotiation, version management, storage/delivery | Most plausible commercial scaling route where brands cooperate; asset readiness varies. |
| Licensed third-party assets | Asset/license search, legal review, normalization, QA, renewal/attribution/removal | Viable for narrow generic evaluation only when terms are clear; per-asset licensing burden. |
| Automated product-image conversion | Research/model/compute, manual correction, QA, IP review, hidden-geometry/material uncertainty | Not credible as a production source of truth at this stage. |

Across routes, browser/device testing, ongoing asset QA, rights operations, storage/CDN, texture/geometry optimization, and any dynamic runtime GPU/CPU cost must be budgeted. No exact price has been estimated because asset count, authoring quality, markets, license terms, devices, and service choices are unresolved.

## 17. Risks and unresolved questions

- RSK-003: registration, deformation, collision, and occlusion can look implausible; visual realism is not fit accuracy.
- RSK-004/010: no garment asset or commercial-rights chain has been cleared; authoring-tool and source-asset terms require case-by-case review.
- RSK-007: no browser/device/render/memory benchmark exists; WebGPU cannot be required.
- Workstream A landmarks do not supply a 3D body surface or absolute garment registration solution.
- Exact initial garment categories, asset quality budget, triangle/texture/LOD budget, body proxy policy, supported pose envelope, transparency policy, and M4/M5 acceptance thresholds are unresolved.
- No Phase 0.1 requirement inconsistency was found. `prototype.html` remains a non-approved 2D canvas reference and must not supply M4/M5 technical claims.

## 18. Recommendation with confidence level

**Recommendation:** approve no implementation. For the next bounded research step, obtain a tiny rights-cleared asset set and evaluate core GLB/glTF delivery using WebGL baseline, Three.js/R3F plus a narrowly scoped imperative control, authored anchor registration, validator/contract checks, and product-imagery fallback. Test Babylon only if the baseline reveals a specific asset/tooling gap. Keep WebGPU progressive-only.

For M5, defer dynamic cloth/depth work until M4 produces measured asset, device, registration, and visual-quality evidence. Then compare authored skin/morph correction against one constrained PBD or mass-spring experiment; do not make FEM/full physical simulation a baseline.

**Confidence:** moderate in the staged investigation and external metadata/provenance requirement; low in production M4/M5 feasibility until actual assets and the evaluation protocols are measured.

## 19. Go/no-go/defer assessment for M4 and M5

- **M4 implementation:** **DEFER.** **GO only for a separately approved M4 evaluation protocol** after rights-cleared assets, contract, device matrix, test thresholds, privacy/fallback behavior, and renderer experiment scope are approved.
- **M5 implementation:** **DEFER.** **NO-GO** until M4 evidence passes and a deliberately narrow deformation/occlusion experiment has defined assets, quality criteria, performance methodology, and rights/metadata inputs.
- Neither outcome authorizes M1, production infrastructure, real user data collection, a fit/measurement representation, or technology selection.

## 20. Primary-source register

All sources were accessed 2026-11-04. Mutable documentation/repository URLs require version/revision pinning before later use.

| ID | Exact URL | Organization | Version / license or terms | Claims supported |
|---|---|---|---|---|
| S1 | https://threejs.org/docs/ | Three.js | Current mutable documentation; exact release TBD | Scene graph, renderers, cameras, meshes/materials/textures. |
| S2 | https://threejs.org/docs/pages/WebGLRenderer.html | Three.js | Current mutable documentation | WebGL renderer scope. |
| S3 | https://threejs.org/docs/pages/BufferGeometry.html | Three.js | Current mutable documentation | Buffer geometry and morph attribute lifecycle. |
| S4 | https://threejs.org/docs/pages/Mesh.html | Three.js | Current mutable documentation | Mesh morph/skinning behavior. |
| S5 | https://threejs.org/docs/pages/InstancedMesh.html | Three.js | Current mutable documentation | Instancing context. |
| S6 | https://threejs.org/docs/pages/GLTFLoader.html | Three.js | Current mutable documentation | glTF/GLB loader context. |
| S7 | https://threejs.org/docs/pages/Material.html | Three.js | Current mutable documentation | Depth test/write and transparency behavior. |
| S8 | https://github.com/mrdoob/three.js/blob/dev/LICENSE | Three.js | MIT; mutable dev branch | Three.js code license. |
| S9 | https://threejs.org/manual/pages/webgpurenderer | Three.js | Current mutable manual | WebGPU/WebGL 2 renderer fallback context. |
| S10 | https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API | MDN | Current reference | WebGPU limited-availability/Baseline context. |
| S11 | https://r3f.docs.pmnd.rs/getting-started/introduction | pmndrs | Current docs; v8/React 18, v9/React 19, v10 alpha context | R3F relationship/version compatibility. |
| S12 | https://github.com/pmndrs/react-three-fiber/blob/master/LICENSE | pmndrs | MIT | R3F license. |
| S13 | https://doc.babylonjs.com/features/featuresDeepDive/animation/animatedCharacter | Babylon.js | Current documentation | Babylon animated-character/glTF workflow. |
| S14 | https://github.com/BabylonJS/Babylon.js/blob/master/license.md | Babylon.js | Apache-2.0 | Babylon.js license. |
| S15 | https://support.clo3d.com/hc/en-us/articles/360051525034-glTF-2-0-GLTF-GLB-File | CLO | Mutable support page; exact version not stated | CLO glTF import/export, scale/axis. |
| S16 | https://support.clo3d.com/hc/en-us/articles/900005384946-glTF-a-Standard-Fabric-File-Compatibility-ver-6-1 | CLO | Version 6.1 documentation | Fabric PBR/physical export and SBSAR restriction. |
| S17 | https://legal.clo-set.com/modal-tou-general | CLO | Mutable general terms | CLO service/work-product terms context. |
| S18 | https://support.marvelousdesigner.com/hc/en-us/articles/55686813557913-glTG-2-0-glTF-GLB-File-ver-2026-0 | Marvelous Designer | Version 2026.0 documentation | GLB/glTF export, animation, metadata options. |
| S19 | https://docs.blender.org/manual/id/5.0/addons/import_export/scene_gltf2.html | Blender | Blender 5.0 manual | glTF export capabilities and losses. |
| S20 | https://www.blender.org/about/license/ | Blender | GPL software license / artwork ownership guidance | Blender license and artist-rights distinction. |
| S21 | https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html | Khronos Group | glTF 2.0.1 specification | Core format, coordinate/unit, PBR, skins, animations, morphs, GLB/glTF. |
| S22 | https://github.com/KhronosGroup/glTF-Validator | Khronos Group | Repository; exact release TBD | Structural asset validation and statistics. |
| S23 | https://doi.org/10.2312/PE/vriphys/vriphys06/071-080 | Müller et al. | 2006 Position Based Dynamics paper | PBD constraints/real-time cloth context. |
| S24 | https://onlinelibrary.wiley.com/doi/abs/10.1111/1467-8659.00281 | Howlett et al. | 1998 paper | Mass-spring cloth context. |
| S25 | https://augusta.elsevierpure.com/en/publications/an-efficient-animation-of-wrinkled-cloth-with-approximate-implici/ | Research record | Publication record; exact artifact/license TBD | Approximate implicit mass-spring context. |
| S26 | https://github.com/KhronosGroup/glTF/tree/main/extensions/2.0/Khronos/KHR_draco_mesh_compression | Khronos Group | Extension specification | Draco geometry compression extension. |
| S27 | https://github.com/KhronosGroup/glTF/tree/main/extensions/2.0/Vendor/EXT_meshopt_compression | Khronos Group | Extension specification | meshopt compression extension. |
| S28 | https://github.com/KhronosGroup/glTF/tree/main/extensions/2.0/Khronos/KHR_texture_basisu | Khronos Group | Extension specification | KTX2/Basis texture extension. |
| S29 | https://meshoptimizer.org/ | meshoptimizer | MIT; exact release TBD | Optimization/simplification/compression tools. |
| S30 | https://github.com/google/draco/blob/main/LICENSE | Google | Apache-2.0 | Draco license. |
| S31 | https://github.com/BinomialLLC/basis_universal/blob/master/LICENSE | Binomial | Apache-2.0 | Basis Universal license. |
| S32 | https://github.com/KhronosGroup/KTX-Software/blob/main/LICENSE.md | Khronos Group | Apache-2.0 | KTX-Software license. |
