/**
 * Re-baselines scripts/fixtures/golden.json from the CURRENT pipeline (golden-current.cjs). Run ONLY in a commit
 * that intentionally changes behaviour, with the reason; test-ar-golden then guards against unintended changes.
 * Usage: node scripts/golden-rebaseline.cjs "<reason>"
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { run } = require('./golden-current.cjs');
const { makeFixture } = require('./lib/landmark-fixture.cjs');
const reason = process.argv[2];
if (!reason) { console.error('a reason is required'); process.exit(2); }
run(makeFixture()).then((frames) => {
  const parent = execSync('git rev-parse --short HEAD').toString().trim();
  const file = path.join(__dirname, 'fixtures', 'golden.json');
  fs.writeFileSync(file, JSON.stringify({ rebaselinedOnTopOf: parent, reason, frames }));
  console.log('wrote', file, frames.length, 'frames —', reason);
});
