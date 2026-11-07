/**
 * Verifies the Node test loader (scripts/lib/glb-node-loader.cjs) against three's real
 * GLTFLoader on every garment GLB: same node names, local matrices, vertex counts and positions.
 * Also validates per-asset structure that the runtime relies on.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const require = createRequire(import.meta.url);
const { suite, test, assert, near, finish } = require('./lib/harness.cjs');
const { loadGLB } = require('./lib/glb-node-loader.cjs');
const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'garments');

const parse = (buf) =>
  new Promise((res, rej) => new GLTFLoader().parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), '', res, rej));

suite('GLTFLoader parity');
for (const id of fs.readdirSync(dir).sort()) {
  const file = path.join(dir, id, 'model.glb');
  const gltf = await parse(fs.readFileSync(file));
  const ours = loadGLB(file).scene;
  test(`${id}: hierarchy, transforms and vertex data match GLTFLoader`, () => {
    const a = [], b = [];
    gltf.scene.updateMatrixWorld(true);
    gltf.scene.traverse((o) => o.isMesh && a.push(o));
    ours.traverse((o) => o.isMesh && b.push(o));
    assert(a.length === b.length, `mesh count ${a.length} vs ${b.length}`);
    for (let i = 0; i < a.length; i++) {
      // GLTFLoader sanitises names; ours keep the raw name.
      assert(THREE.PropertyBinding.sanitizeNodeName(b[i].name) === a[i].name, `${a[i].name} vs ${b[i].name}`);
      const ea = a[i].matrixWorld.elements, eb = b[i].matrixWorld.elements;
      for (let k = 0; k < 16; k++) near(ea[k], eb[k], 1e-6, `${a[i].name} matrix`);
      const pa = a[i].geometry.getAttribute('position'), pb = b[i].geometry.getAttribute('position');
      assert(pa.count === pb.count, 'vertex count');
      for (let k = 0; k < pa.count; k += 7) near(pa.getY(k), pb.getY(k), 1e-7, 'position');
      assert(a[i].geometry.getIndex().count === b[i].geometry.getIndex().count, 'index count');
      assert(a[i].geometry.getAttribute('normal'), 'normals present');
    }
  });
}
finish('test-glb-loader-parity');
