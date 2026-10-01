// The parts of check_navigation.cjs that belong to no one page and no one
// widget: sharding, the static server, browser/context/page setup, the axe
// pass, and scenario() -- the single place a failed scenario's evidence
// (a Playwright trace chunk, screenshots) is kept.
// scripts/check_navigation.cjs is still the entry point and still owns the
// flags and env vars; this module is what it wires together.
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const {AxeBuilder} = require('@axe-core/playwright');
const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs/promises');

// The seven widgets, and the order the widgets/*.cjs `drive*` functions are
// written in. `check_navigation.cjs`'s own ALL_WIDGETS table keeps the two in
// step: with seven of them a reader looking for one callback has nothing else
// to go on. This is the full set regardless of sharding -- WIDGET_FILES is
// what decides who runs which -- checked against ALL_WIDGETS there, so a
// widget dropped from every shard's table is still caught rather than
// quietly never run anywhere.
const WIDGET_FILES = ['image-tensor', 'broadcasting-simulator', 'attention-stage',
  'linalg-stage', 'factor-stage', 'voice-stage', 'genome-stage'];
const SHARD_WIDGETS_FOR_3 = [
  [],                                                          // 0: site + hero only
  ['linalg-stage', 'attention-stage', 'genome-stage'],           // 1
  ['voice-stage', 'factor-stage', 'image-tensor', 'broadcasting-simulator']  // 2
];

function parseShard() {
  const i = process.argv.indexOf('--shard');
  const inline = process.argv.find(a => a.startsWith('--shard='));
  const raw = i >= 0 ? process.argv[i + 1] : inline ? inline.slice('--shard='.length) : process.env.NAV_SHARD;
  if (!raw) return null;
  const [index, total] = raw.split('/').map(Number);
  if (!Number.isInteger(index) || !Number.isInteger(total) || total < 1 || index < 0 || index >= total) {
    throw new Error(`--shard wants "i/N" with 0 <= i < N, got "${raw}"`);
  }
  return {index, total};
}

// Every shard also runs the site pages, the hero &c. unless it is explicitly
// one of the widget-only shards a 3-way split creates -- so a single-shard
// invocation (`--shard 0/1`, or no flag at all) still runs everything, and a
// 2-way or 4-way split still gives every shard something of its own to check.
function widgetsForShard({index, total}) {
  if (total === 1) return WIDGET_FILES;
  if (index === 0) return [];
  if (total === 3) return SHARD_WIDGETS_FOR_3[index] || [];
  const rest = total - 1;
  return WIDGET_FILES.filter((_, n) => n % rest === index - 1);
}

// The accessibility pass. axe runs over every page and every widget, and a
// `serious` or `critical` WCAG 2.x A/AA violation fails the check unless the
// rule *and the element* are listed here with the reason. Entries are by
// element, not by rule, so a listed rule still fires on any other node. The
// list is for markup Quarto generates that no source file here can reach;
// never for something on our own pages, and never `color-contrast` -- the
// widgets tune every colour they put on text per theme to clear 4.5:1, so a
// contrast finding there is a real one. The decks are not audited: Reveal's
// hidden-slide DOM is its own, and the pass exists for our pages.
const A11Y_KNOWN = [
  // Quarto's search box (Algolia autocomplete, rendered by quarto-search.js
  // after load): the button has an icon and no text, and the combobox no
  // name. Fixing either means patching Quarto's DOM from an include and
  // re-checking it on every Quarto bump; see whether 1.7+ names them.
  {rule: 'button-name', target: '.aa-DetachedSearchButton'},
  {rule: 'aria-input-field-name', target: '.aa-Autocomplete'},
];
const known = (rule, node) => A11Y_KNOWN.some(k => k.rule === rule && node.target.join(' ') === k.target);

async function audit(page, where, a11y) {
  await page.setViewportSize({width: 1440, height: 1000});
  const {violations} = await new AxeBuilder({page})
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  for (const v of violations) {
    if (!['serious', 'critical'].includes(v.impact)) continue;
    v.nodes = v.nodes.filter(n => !known(v.id, n));
    if (!v.nodes.length) continue;
    const targets = v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(', ');
    const line = `${where}: ${v.id} (${v.impact}) — ${v.help}; ${v.nodes.length} node(s): ${targets}`;
    console.error(line);
    a11y.push(line);
  }
}

// The static server. Off-origin requests are aborted by the caller's browser
// context, so three.js, which is vendored, is same-origin and loads.
async function startServer(root, prefix, types) {
  const server = http.createServer(async (request, response) => {
    try {
      let relative = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      if (relative.startsWith(prefix)) relative = relative.slice(prefix.length);
      else relative = relative.slice(1);
      if (!relative || relative.endsWith('/')) relative += 'index.html';
      const file = path.resolve(root, relative);
      if (!file.startsWith(root + path.sep)) throw new Error('Invalid path');
      const body = await fs.readFile(file);
      response.writeHead(200, {'Content-Type': types[path.extname(file)] || 'application/octet-stream'});
      response.end(body);
    } catch { response.writeHead(404); response.end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  return {server, origin};
}

// Browser, context and page. Keeps the test independent of YouTube,
// NotebookLM and other remote embeds by aborting every off-origin request,
// and collects uncaught page errors for the caller to assert empty at the end.
async function openBrowserPage(origin) {
  const browser = await chromium.launch({headless: true,
    ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
  const context = await browser.newContext();
  await context.route('**/*', route => route.request().url().startsWith(origin)
    ? route.continue() : route.abort());
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => { errors.push(error.message); console.error(error.message); });
  return {browser, context, page, errors};
}

// A named boundary around one check. Every scenario in site.cjs, and every
// widget x language drive in check_navigation.cjs, runs through this, so a
// new check calls it rather than running bare.
//
// With `NAV_EVIDENCE` set (CI sets it), each scenario is one Playwright trace
// chunk. A scenario that passes discards its chunk; one that fails keeps it,
// with a full-page screenshot of every open page and the error, under
// `<NAV_EVIDENCE>/<shard>/<scenario>/`. The first failure ends the shard, so
// there is at most one such folder per shard, and a green run writes nothing.
// Open the trace with `npx playwright show-trace trace.zip`, or drop it on
// trace.playwright.dev.
//
// The trace records the screencast, every action with its timing, the
// console and the network -- not DOM snapshots. Those cost the widget shards
// 44% (224 s against 156 s for shard 1/3; the screencast alone, 152 s), and
// their timing-sensitive checks are the last thing to slow down on a runner.
// `NAV_TRACE_DOM=1` adds them for a local rerun of the one scenario you are
// chasing.
async function scenario(ctx, name, fn) {
  const evidence = ctx.evidence;
  if (!evidence) return fn(ctx);
  const tracing = ctx.context.tracing;
  // `start` opens the first chunk itself; every later scenario opens its own.
  if (!evidence.tracing) {
    await tracing.start({title: name, screenshots: true,
      snapshots: process.env.NAV_TRACE_DOM === '1'});
    evidence.tracing = true;
  } else {
    await tracing.startChunk({title: name});
  }
  try {
    const result = await fn(ctx);
    await tracing.stopChunk();
    return result;
  } catch (error) {
    await keepEvidence(ctx, name, error).catch(e =>
      console.error(`Could not save the evidence for "${name}": ${e.message}`));
    throw error;
  }
}

async function keepEvidence(ctx, name, error) {
  const dir = path.join(ctx.evidence.dir, name.replace(/[^\w.-]+/g, '-'));
  await fs.mkdir(dir, {recursive: true});
  await fs.writeFile(path.join(dir, 'error.txt'), `${name}\n\n${error.stack || error}\n`);
  let n = 0;
  for (const page of ctx.context.pages()) {
    // A page the failure left mid-navigation or closed can refuse; the trace
    // still has its last frame, so one missing screenshot is not worth a throw.
    await page.screenshot({path: path.join(dir, `page-${n++}.png`), fullPage: true, timeout: 10000})
      .catch(e => console.error(`No screenshot of ${page.url()}: ${e.message}`));
  }
  await ctx.context.tracing.stopChunk({path: path.join(dir, 'trace.zip')});
  console.error(`Evidence for "${name}": ${dir}`);
}

module.exports = {
  WIDGET_FILES, SHARD_WIDGETS_FOR_3, parseShard, widgetsForShard,
  A11Y_KNOWN, audit, startServer, openBrowserPage, scenario,
};
