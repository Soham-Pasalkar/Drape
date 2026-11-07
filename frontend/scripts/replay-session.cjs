/**
 * Replay a recorded DRAPE AR session and print the per-position registration report.
 * Usage (frontend/):  npx tsc -p scripts/tsconfig.ar-test.json && node scripts/replay-session.cjs <session.json> [--json out.json]
 */
const fs = require('fs');
const { replaySession, diffAgainstRecorded, positionReport } = require('./lib/replay.cjs');

(async () => {
  const file = process.argv[2];
  if (!file) { console.error('usage: replay-session.cjs <session.json> [--json out.json]'); process.exit(2); }
  const session = JSON.parse(fs.readFileSync(file, 'utf8'));
  const replayed = await replaySession(session);
  const diff = diffAgainstRecorded(session, replayed);
  const rows = positionReport(session, replayed);
  const f = (v, d = 1) => (v === null || v === undefined ? '—' : v.toFixed(d));
  console.log(`session: ${session.header.userAgent.slice(0, 60)}… | mirror ${session.header.mirror.value} (${session.header.mirror.source}) | frames ${session.frames.length} | markers ${session.markers.length}`);
  console.log(`replay vs recorded: max registration |Δ| = ${f(diff.maxPx, 4)} px (${diff.worstAt || '—'}), pose |Δ| = ${f(diff.maxPoseM * 1000, 3)} mm, smoothed root |Δ| = ${f(diff.maxRootM * 1000, 3)} mm`);
  console.log('position     frames settled invalid | kp err p50/max px | anchor err p50/max px | reproj p50 | hips used | hips vis∧off-frame');
  for (const r of rows) {
    console.log(`${r.position.padEnd(12)} ${String(r.frames).padStart(6)} ${String(r.settled).padStart(7)} ${String(r.invalid).padStart(7)} | ${f(r.kpP50).padStart(6)} / ${f(r.kpMax).padStart(6)} | ${f(r.anchorP50).padStart(8)} / ${f(r.anchorMax).padStart(6)} | ${f(r.reprojP50).padStart(9)} | ${String(r.hipsUsedFrames).padStart(9)} | ${r.hipsVisibleOffFrame}`);
  }
  const bad = rows.filter((r) => (r.kpMax ?? 0) >= 8 || (r.anchorMax ?? 0) >= 8);
  console.log(bad.length ? `FR-05 (< 8 px settled) NOT met at: ${bad.map((r) => r.position).join(', ')}` : 'FR-05 (< 8 px settled) met at every labelled position');
  const i = process.argv.indexOf('--json');
  if (i > 0) fs.writeFileSync(process.argv[i + 1], JSON.stringify({ diff, rows }, null, 2));
})().catch((e) => { console.error(e.message); process.exit(1); });
