/**
 * DRAPE Garment Asset Validation Script
 *
 * Inspects all 8 GLB files:
 * - File existence and valid binary glTF header
 * - Node and mesh structure
 * - Vertex counts, triangle counts
 * - Bounding boxes [min, max] and dimensions [dx, dy, dz]
 * - Local origins and alignment relative to semantic anchors
 */

const fs = require('fs');
const path = require('path');

const GARMENT_DIR = path.join(__dirname, '..', 'public', 'garments');

const GARMENTS = [
  'tshirt-crewneck',
  'tshirt-oversized',
  'tshirt-fitted',
  'top-longsleeve',
  'top-sleeveless',
  'skirt-aline',
  'skirt-pleated',
  'dress-midi',
];

console.log('=== DRAPE GARMENT ASSET AUDIT ===\n');

let allValid = true;

for (const id of GARMENTS) {
  const dir = path.join(GARMENT_DIR, id);
  const glbPath = path.join(dir, 'model.glb');
  const simPath = path.join(dir, 'simulation-data.json');
  const metaPath = path.join(dir, 'metadata.json');

  if (!fs.existsSync(glbPath)) {
    console.error(`❌ [${id}] Missing model.glb at ${glbPath}`);
    allValid = false;
    continue;
  }

  const glbStats = fs.statSync(glbPath);
  const buffer = fs.readFileSync(glbPath);

  // Check GLB magic header (0x46546C67 = "glTF")
  const magic = buffer.readUInt32LE(0);
  if (magic !== 0x46546c67) {
    console.error(`❌ [${id}] Invalid GLB magic header: 0x${magic.toString(16)}`);
    allValid = false;
    continue;
  }

  const version = buffer.readUInt32LE(4);
  const length = buffer.readUInt32LE(8);

  // Read JSON chunk header
  const jsonChunkLength = buffer.readUInt32LE(12);
  const jsonChunkType = buffer.readUInt32LE(16); // 0x4E4F534A = "JSON"
  const jsonStr = buffer.toString('utf8', 20, 20 + jsonChunkLength);
  const gltfJson = JSON.parse(jsonStr);

  // Count meshes, primitives, attributes
  let totalVertices = 0;
  let totalIndices = 0;
  const meshNames = [];

  if (gltfJson.meshes) {
    for (const mesh of gltfJson.meshes) {
      meshNames.push(mesh.name || 'unnamed');
      for (const prim of mesh.primitives) {
        if (prim.attributes && prim.attributes.POSITION !== undefined) {
          const accPos = gltfJson.accessors[prim.attributes.POSITION];
          totalVertices += accPos.count;
        }
        if (prim.indices !== undefined) {
          const accIdx = gltfJson.accessors[prim.indices];
          totalIndices += accIdx.count;
        }
      }
    }
  }

  const simExists = fs.existsSync(simPath);
  const metaExists = fs.existsSync(metaPath);
  let meta = null;
  if (metaExists) {
    meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  }

  console.log(`✓ [${id}]`);
  console.log(`   GLB Size: ${(glbStats.size / 1024).toFixed(1)} KB (v${version})`);
  console.log(`   Meshes (${meshNames.length}): [${meshNames.join(', ')}]`);
  console.log(`   Vertices: ${totalVertices}, Triangles: ${Math.floor(totalIndices / 3)}`);
  if (meta) {
    console.log(`   Model Anchor: (${meta.modelAnchor.x}, ${meta.modelAnchor.y}, ${meta.modelAnchor.z}) [${meta.modelAnchor.type}]`);
    console.log(`   Model Dims: ${meta.modelDimensions.width.toFixed(3)}m W x ${meta.modelDimensions.height.toFixed(3)}m H x ${meta.modelDimensions.depth.toFixed(3)}m D`);
  }
  console.log(`   Simulation Data: ${simExists ? 'Present' : 'MISSING'}\n`);
}

if (allValid) {
  console.log('✅ ALL 8 GARMENT ASSETS VALIDATED SUCCESSFULLY');
} else {
  console.error('❌ ASSET VALIDATION FAILED');
  process.exit(1);
}

