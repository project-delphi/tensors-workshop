// Render first. Requires Playwright and its Chromium browser (see CONTRIBUTING).
// This file is the entry point: every flag and env var it has always
// honoured (`--shard i/N` / `NAV_SHARD`, `--slides-only`, `NAV_ROOT`,
// `SCREENSHOT_DIR`, `PLAYWRIGHT_MODULE`, `BROWSER_EXECUTABLE`), and
// `NAV_EVIDENCE` -- where a failed scenario's trace and screenshots go --
// still lands
// here, because `package.json`'s scripts, `scripts/run_navigation_shards.cjs`,
// CI and the docs all call it by this name. What it actually checks is split
// across `scripts/navigation/`: `harness.cjs` for sharding, the server,
// browser setup, axe and `scenario()`; `site.cjs` for the checks that belong
// to no one widget; `widgets/<file>.cjs`, one per widget, for its own
// `drive`/`fallback`/`embed`. The ALL_WIDGETS table below is the order the
// widgets/*.cjs `drive*` functions are written in, kept here because it is
// what ties every module together.
const assert = require('node:assert/strict');
const path = require('node:path');
const harness = require('./navigation/harness.cjs');
const site = require('./navigation/site.cjs');
const common = require('./navigation/widgets/common.cjs');
const imageTensor = require('./navigation/widgets/image-tensor.cjs');
const broadcastingSimulator = require('./navigation/widgets/broadcasting-simulator.cjs');
const attentionStage = require('./navigation/widgets/attention-stage.cjs');
const linalgStage = require('./navigation/widgets/linalg-stage.cjs');
const factorStage = require('./navigation/widgets/factor-stage.cjs');
const voiceStage = require('./navigation/widgets/voice-stage.cjs');

const root = process.env.NAV_ROOT ? path.resolve(process.env.NAV_ROOT) : path.resolve(__dirname, '../docs');
const screenshots = process.env.SCREENSHOT_DIR || require('node:os').tmpdir();
const prefix = '/tensors-workshop/';
const types = {'.html':'text/html', '.js':'text/javascript', '.css':'text/css',
  '.json':'application/json', '.svg':'image/svg+xml', '.png':'image/png', '.gif':'image/gif',
  '.webp':'image/webp', '.woff2':'font/woff2'};

// Sharding. `scripts/run_navigation_shards.cjs` is what `npm run
// check:navigation` actually runs: it spawns one process per shard, each
// with `--shard i/N` (or `NAV_SHARD=i/N`), and this file answers to that flag
// on its own too, so a single shard -- or the whole thing, unsharded -- can
// still be run directly for debugging. Shard 0 carries every check that
// belongs to no one widget: that every rendered page is assigned a check,
// the site pages, the day sheet's print layout, the hero, keyboard and
// disclosure navigation, the readiness pages, the wide table and the
// host-root/offline fallbacks, and the slides. The six widgets are spread
// across the rest, sized from measured wall time rather than line count
// (see DECISIONS.md) so three concurrent shards land close together.
const shard = harness.parseShard();
const runsSite = !shard || shard.index === 0 || shard.total === 1;
const shardWidgets = shard ? harness.widgetsForShard(shard) : harness.WIDGET_FILES;

// The widgets are resources, not Quarto pages, so none has a navbar and none
// is reachable by clicking. Three.js is vendored, so it is same-origin and
// this check -- which aborts every off-origin request -- can finally load
// it. Each widget drives differently, so each one carries its own driver in
// its own file rather than the loop branching on a flag.
async function driveOneWidget(ctx, widget, where, lang) {
  const {page, origin, prefix} = ctx;
  await page.goto(`${origin}${prefix}interactive/${widget.file}.html?lang=${lang}`);
  assert.equal(await page.locator('html').getAttribute('lang'), lang);
  assert.equal(await page.locator('#title').innerText(), widget[lang]);
  // The way back to the site, in the page's language, from the frame
  // every widget shares (interactive/widget-chrome.css).
  const home = page.locator('header .site-nav a.site-home');
  assert.equal(await home.count(), 1, `${where}: one home link`);
  assert.equal(await home.getAttribute('href'), lang === 'es' ? '../es/index.html' : '../index.html',
    `${where}: home link points at the ${lang} homepage`);
  assert.equal(await page.locator('header .site-nav a#site-interactive').getAttribute('href'),
    lang === 'es' ? '../es/interactive.html' : '../interactive.html', `${where}: interactive link`);
  assert.equal(await page.locator('header .site-nav a#site-notebooks').getAttribute('href'),
    lang === 'es' ? '../es/notebooks.html' : '../notebooks.html', `${where}: notebooks link`);
  // Wired from each page's own copy table -- the widgets share a
  // stylesheet, not a script -- so an untranslated pill is a real
  // possibility and the label is checked, not just the href.
  assert.equal(await page.locator('header .site-nav a#site-interactive').innerText(),
    lang === 'es' ? 'Interactivo' : 'Interactive', `${where}: interactive pill label`);
  await widget.drive(ctx, page, where, lang);

  for (const width of [1440, 390]) {
    await page.setViewportSize({width, height: 1000});
    const fits = await page.evaluate(() =>
      document.documentElement.scrollWidth <= innerWidth + 1);
    assert(fits, `${where}: horizontal overflow at ${width}`);
  }
  await ctx.audit(where);
  // One language: the motion has no copy in it, and it costs seconds.
  if (lang === 'en') await common.movesOnLoad(ctx, widget.file, where);

  // The widgets that draw in three.js also check their flat/twin fallback,
  // with the GL module deliberately lost.
  if (widget.fallback) await widget.fallback(ctx, page, where, lang);

  // Embed mode is what the homepage hero shows: stage and caption only, no
  // three.js, on the band's navy. Only for the widgets the hero actually
  // carries.
  if (!widget.heroEmbed) return;
  await page.goto(
    `${origin}${prefix}interactive/${widget.file}.html?lang=${lang}&embed=1&theme=navy`);
  await page.waitForSelector('#embedcap b');
  // A caption never carries a link; the embed is only ever a picture.
  assert.equal(await page.locator('#embedcap a').count(), 0, `${where} embed: link in the caption`);
  assert(await page.locator('aside').isHidden(), `${where} embed: panel shown`);
  assert(await page.locator('header').isHidden(), `${where} embed: header shown`);
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'navy');
  await widget.embed(ctx, page, where, lang);
  for (const [width, height] of [[560, 448], [330, 264]]) {
    await page.setViewportSize({width, height});
    const fits = await page.evaluate(() =>
      document.documentElement.scrollWidth <= innerWidth + 1);
    assert(fits, `${where} embed: horizontal overflow at ${width}`);
  }
  await page.setViewportSize({width: 1440, height: 1000});
}

(async () => {
  // First, and before a browser starts: an unassigned page fails in a second.
  if (runsSite) await site.checkCoverage();
  const {server, origin} = await harness.startServer(root, prefix, types);
  let browser;
  const counters = {anchors: 0, widgetCount: 0, widgets: []};
  const a11y = [];
  try {
    const {browser: b, context, page, errors} = await harness.openBrowserPage(origin);
    browser = b;
    const ctx = {
      page, context, origin, prefix, root, screenshots, counters, a11y,
      audit: (where) => harness.audit(page, where, a11y),
      // One folder per shard, since the shards run at once and share the root.
      evidence: process.env.NAV_EVIDENCE ? {
        dir: path.join(path.resolve(process.env.NAV_EVIDENCE),
          shard ? `shard-${shard.index}-of-${shard.total}` : 'unsharded'),
        tracing: false,
      } : null,
    };
    if (!process.argv.includes('--slides-only')) {
      if (runsSite) {
        await harness.scenario(ctx, 'site pages', site.runPages);
        await harness.scenario(ctx, 'day sheet print', site.runDaySheetPrint);
      }

      // The widgets, and the order the widgets/*.cjs `drive*` functions are
      // written in. Keep the two in step: with six of them a reader looking
      // for one callback has nothing else to go on. This is the full set
      // regardless of sharding -- WIDGET_FILES above, which decides who
      // runs which, is checked against it below, so a widget dropped from
      // every shard's table is still caught rather than quietly never run
      // anywhere.
      const ALL_WIDGETS = [
        {file: 'image-tensor', heroEmbed: true, ...imageTensor},
        {file: 'broadcasting-simulator', heroEmbed: true, ...broadcastingSimulator},
        // Its embed mode is the softmax scene, flat and still: no scroller,
        // and -- unlike every other widget here -- nothing to fetch at all.
        {file: 'attention-stage', heroEmbed: true, ...attentionStage},
        // Its embed mode is the portal's still frame -- no scroller, no
        // three.js -- which is the third hero tab below.
        {file: 'linalg-stage', heroEmbed: true, ...linalgStage},
        // Its embed mode fetches the real (~2 kB) taxi tensor rather than a
        // synthesised stand-in: it is small enough that a still picture of
        // the real thing costs nothing extra.
        {file: 'factor-stage', heroEmbed: true, ...factorStage},
        // Its embed mode draws the same scene from a synthesised stand-in
        // rather than fetching half a megabyte of audio onto the homepage,
        // which is the fourth hero tab below.
        {file: 'voice-stage', heroEmbed: true, ...voiceStage},
      ];
      assert.equal(ALL_WIDGETS.length, harness.WIDGET_FILES.length,
        'WIDGET_FILES (the sharding table) and the widgets table have drifted apart');
      assert.deepEqual(ALL_WIDGETS.map(w => w.file).sort(), harness.WIDGET_FILES.slice().sort(),
        'WIDGET_FILES (the sharding table) and the widgets table name different files');
      const widgets = shard ? ALL_WIDGETS.filter(w => shardWidgets.includes(w.file)) : ALL_WIDGETS;
      counters.widgetCount = widgets.length;
      counters.widgets = widgets;
      for (const widget of widgets) {
        console.log(`Checking ${widget.file}`);
        for (const lang of ['en', 'es']) {
          const where = `${widget.file} ${lang}`;
          await harness.scenario(ctx, where, () => driveOneWidget(ctx, widget, where, lang));
        }
      }

      if (runsSite) {
        await harness.scenario(ctx, 'hero', site.runHero);
        await harness.scenario(ctx, 'keyboard and disclosures', site.runKeyboardAndDisclosures);
        await harness.scenario(ctx, 'readiness pages', site.runReadiness);
        await harness.scenario(ctx, 'wide table', site.runWideTable);
        await harness.scenario(ctx, 'host-root fallbacks', site.runFallbacks);
      }
    }

    // Exercise Reveal's presentation mode; phone widths activate its
    // separate scrolling reader. Bundled into the site shard along with the
    // pages, the hero &c.: it is not one widget's to own any more than they
    // are. Unconditional on `--slides-only` -- that flag skips everything
    // above, not this.
    if (runsSite) await harness.scenario(ctx, 'slides', site.runSlides);

    assert.deepEqual(errors, [], 'Uncaught browser errors');
    assert.deepEqual(a11y, [], 'Accessibility violations (axe, serious or critical)');
    if (process.argv.includes('--slides-only')) {
      console.log('Slide links passed.');
    } else if (!shard) {
      console.log(`Passed: every rendered page assigned a check, ${site.pages.length * 2} pages at desktop/mobile widths, the day sheet on two printed pages, ${counters.anchors} section switches, keyboard navigation, disclosures, slide links, fallbacks, ${counters.widgetCount} interactive widgets, both stages' idle drift, the SVD stage's camera under a drag, the arrow keys and Home, the SVD portal's A v = sigma u, and axe on every page and widget.`);
    } else {
      const scope = runsSite
        ? `page coverage, the site pages, the day sheet's print layout, the hero, keyboard/disclosure navigation, the readiness pages, the wide table, host-root fallbacks and the slides`
        : `${counters.widgetCount} widget(s) (${counters.widgets.map(w => w.file).join(', ') || 'none'})`;
      console.log(`Shard ${shard.index + 1}/${shard.total} passed: ${scope}.`);
    }
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
