/** Compiles node-safe AR modules and runs every scripts/test-ar-*.cjs suite. */
const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist_test');
fs.rmSync(dist, { recursive: true, force: true });
execSync('npx tsc -p scripts/tsconfig.ar-test.json', { cwd: root, stdio: 'inherit' });

const files = fs.readdirSync(__dirname).filter((f) => /^test-ar-.*\.c?js$/.test(f)).sort();
let passed = 0, failed = 0, crashed = 0;
for (const f of files) {
  const r = spawnSync(process.execPath, ['--no-deprecation', path.join(__dirname, f)], { cwd: root, encoding: 'utf8' });
  process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  const m = /: (\d+) passed, (\d+) failed/.exec(r.stdout);
  if (m) { passed += +m[1]; failed += +m[2]; }
  if (r.status !== 0 && !m) crashed++;
  if (r.status !== 0 && m && +m[2] === 0) crashed++;
}
const pm = spawnSync(process.execPath, ['--no-deprecation', path.join(__dirname, 'test-glb-loader-parity.mjs')], { cwd: root, encoding: 'utf8' });
process.stdout.write(pm.stdout);
if (pm.stderr) process.stderr.write(pm.stderr);
const pmm = /: (\d+) passed, (\d+) failed/.exec(pm.stdout);
if (pmm) { passed += +pmm[1]; failed += +pmm[2]; } else crashed++;

fs.rmSync(dist, { recursive: true, force: true });
console.log(`\n================ AR TEST TOTAL: ${passed} passed, ${failed} failed, ${crashed} suites crashed ================`);
process.exit(failed || crashed ? 1 : 0);
