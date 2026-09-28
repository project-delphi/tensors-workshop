// Spawns `scripts/check_navigation.cjs --shard i/N` once per shard,
// concurrently, each with its own browser and its own static server (see
// check_navigation.cjs's `root`/`origin` -- one HTTP server per process, on
// a port each picks for itself, so nothing here shares one).
//
// Debugging one shard, or the whole check unsharded, does not go through
// this file: `node scripts/check_navigation.cjs --shard 1/3` or
// `node scripts/check_navigation.cjs` (no flag at all) run check_navigation.cjs
// directly, the way they always could. This file exists only to run every
// shard at once and give them one exit code between them.
const {spawn} = require('node:child_process');
const path = require('node:path');

const SHARDS = Number(process.env.NAV_SHARDS || (process.argv.find(a => a.startsWith('--shards='))
  || '').slice('--shards='.length) || 3);

// A line-buffered prefix for one child's stdout/stderr, so two shards
// writing at once still leave readable, attributable lines rather than
// interleaved fragments.
function prefixed(tag, stream, sink) {
  let buf = '';
  stream.on('data', (chunk) => {
    buf += chunk.toString();
    const lines = buf.split('\n');
    buf = lines.pop();
    for (const line of lines) sink(`[${tag}] ${line}`);
  });
  stream.on('end', () => { if (buf) sink(`[${tag}] ${buf}`); });
}

async function runShard(i, total) {
  const tag = `shard ${i + 1}/${total}`;
  const args = [path.join(__dirname, 'check_navigation.cjs'), '--shard', `${i}/${total}`];
  const child = spawn(process.execPath, args, {env: process.env, stdio: ['ignore', 'pipe', 'pipe']});
  prefixed(tag, child.stdout, (line) => console.log(line));
  prefixed(tag, child.stderr, (line) => console.error(line));
  const code = await new Promise((resolve) => child.on('close', resolve));
  return {tag, code};
}

(async () => {
  const total = SHARDS;
  console.log(`Running the navigation check across ${total} shards.`);
  const results = await Promise.all(
    Array.from({length: total}, (_, i) => runShard(i, total)));
  const failed = results.filter((r) => r.code !== 0);
  for (const r of results) console.log(`${r.tag}: ${r.code === 0 ? 'passed' : `FAILED (exit ${r.code})`}`);
  if (failed.length) {
    console.error(`${failed.length} of ${total} shard(s) failed.`);
    process.exitCode = 1;
  } else {
    console.log('All shards passed.');
  }
})();
