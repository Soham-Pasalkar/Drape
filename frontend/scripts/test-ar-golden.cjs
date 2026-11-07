/**
 * Golden regression test. Compares the CURRENT pipeline against scripts/fixtures/golden.json.
 * History: T2–T4 refactors were proven behaviour-identical against golden-pre-refactor.archived.json (tag
 * m1-pre-refactor, max |Δ| = 0). Intended behaviour changes re-baseline golden.json via golden-rebaseline.cjs in the
 * same commit, with the reason stored in the file. Tolerance: max |Δ| < 1e-6 on every number.
 */
const fs = require('fs');
const path = require('path');
const { suite, test, assert, finish } = require('./lib/harness.cjs');
const { makeFixture } = require('./lib/landmark-fixture.cjs');

const GOLDEN = path.join(__dirname, 'fixtures', 'golden.json');
const TOL = 1e-6;

function maxDiff(a, b, where, acc) {
  if (typeof a === 'number' || typeof b === 'number') {
    if (typeof a !== 'number' || typeof b !== 'number') throw new Error(`type mismatch at ${where}`);
    const d = Math.abs(a - b);
    if (!(d <= acc.max)) { acc.max = d; acc.at = where; }
    return acc;
  }
  if (a === null || b === null || typeof a !== 'object') {
    if (a !== b) throw new Error(`value mismatch at ${where}: ${JSON.stringify(a)} vs ${JSON.stringify(b)}`);
    return acc;
  }
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    if (!(k in a) || !(k in b)) throw new Error(`key ${k} missing at ${where}`);
    maxDiff(a[k], b[k], `${where}.${k}`, acc);
  }
  return acc;
}

async function main() {
  suite('Golden: current pipeline vs scripts/fixtures/golden.json');
  if (!fs.existsSync(GOLDEN)) {
    test('golden file present', () => assert(false, 'scripts/fixtures/golden.json missing'));
    return finish('test-ar-golden');
  }
  const gfile = JSON.parse(fs.readFileSync(GOLDEN, 'utf8'));
  const golden = gfile.frames;
  console.log(`      baseline: on top of ${gfile.rebaselinedOnTopOf} — ${gfile.reason}`);
  const { run } = require('./golden-current.cjs');
  const current = await run(makeFixture());
  test(`frame count matches (${golden.length})`, () => assert(current.length === golden.length, `${current.length}`));
  for (const field of ['pose', 'pnpKeypointsCamera', 'smoothedRoot', 'anchorWorld', 'registration']) {
    test(`${field}: max |Δ| < ${TOL}`, () => {
      const acc = { max: 0, at: '' };
      golden.forEach((g, i) => maxDiff(g[field], current[i][field], `frame[${i}].${field}`, acc));
      console.log(`      max |Δ| = ${acc.max.toExponential(2)}${acc.at ? ' at ' + acc.at : ''}`);
      assert(acc.max < TOL, `max |Δ| ${acc.max} at ${acc.at}`);
    });
  }
  finish('test-ar-golden');
}
main();
