// The checks that belong to no one widget: that every rendered page is
// covered, the site pages themselves, the day sheet's print layout, the
// homepage hero, keyboard and disclosure navigation, the readiness pages,
// the wide handbook table, the host-root/offline fallbacks, and the slides.
// Each exported function is one named scenario, run through
// harness.scenario() by scripts/check_navigation.cjs.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');

const pages = ['index', 'notebooks', 'interactive', 'kahoot', 'references', 'companion', 'teach',
  'faq', 'facilitator-guide', 'day-sheet', 'assessments', 'worked-mistakes', 'group-tasks',
  'workshop-feedback', 'tensors_workshop_plan_with_quizzes'];
// The readiness pages are unlisted diagnostics with no navbar, so they get a
// block of their own rather than the `pages` loop; so do the decks.
const readinessPages = ['readiness-check', 'readiness-instructor', 'readiness-refresher'];
const decks = ['slides/en/index', 'slides/es/index'];
// A page rendered and checked by nothing here, with the reason. Everything in
// `render:` in `_quarto.yml` is either one of the lists above (in both
// languages) or in this map, and coverage fails on anything that is neither:
// the day sheet shipped with none of the checks every other page gets, and
// nothing noticed, because nothing asked. Key by the path as `render:` lists
// it, without the extension, e.g. `'es/some-page': 'why nothing checks it'`.
const EXEMPT = {};

// Every rendered page has a check, and every page this file checks is
// rendered. Read from `_quarto.yml` in the checkout, not from the render, so
// the list is the one the site is built from. A line parser rather than a
// YAML library: `render:` is a flat block list, and nothing here installs one.
async function checkCoverage() {
  const lines = (await fs.readFile(path.resolve(__dirname, '../../_quarto.yml'), 'utf8')).split('\n');
  const start = lines.findIndex(line => /^\s+render:\s*$/.test(line));
  assert(start >= 0, '_quarto.yml: no `render:` list under `project:`');
  const indent = lines[start].search(/\S/);
  const rendered = [];
  for (const line of lines.slice(start + 1)) {
    if (!line.trim() || /^\s*#/.test(line)) continue;
    const item = line.match(/^(\s*)-\s+(\S+?)\s*(#.*)?$/);
    if (!item || item[1].length <= indent) break;
    rendered.push(item[2].replace(/^['"]|['"]$/g, '').replace(/\.(qmd|md|ipynb)$/, ''));
  }
  assert(rendered.length, '_quarto.yml: the `render:` list is empty');
  const bilingual = list => list.flatMap(name => [name, `es/${name}`]);
  const covered = new Set([...bilingual(pages), ...bilingual(readinessPages), ...decks]);
  const unassigned = rendered.filter(name => !covered.has(name) && !Object.hasOwn(EXEMPT, name));
  assert.deepEqual(unassigned, [],
    `rendered but assigned to no check -- add each to \`pages\` in scripts/navigation/site.cjs, ` +
    `or to \`EXEMPT\` with the reason nothing checks it: ${unassigned.join(', ')}`);
  const unrendered = [...covered, ...Object.keys(EXEMPT)].filter(name => !rendered.includes(name));
  assert.deepEqual(unrendered, [],
    `checked or exempted here but not in \`render:\` in _quarto.yml: ${unrendered.join(', ')}`);
  console.log(`Coverage: all ${rendered.length} rendered pages are assigned to a check`);
}

// Every site page, both languages: the language switch, translation markers,
// axe, and no horizontal overflow at 1440 or 390px.
async function runPages(ctx) {
  const {page, origin, prefix, audit, counters} = ctx;
  for (const lang of ['en', 'es']) {
    const other = lang === 'en' ? 'es' : 'en';
    for (const name of pages) {
      const current = `${origin}${prefix}${lang === 'es' ? 'es/' : ''}${name}.html`;
      const target = `${origin}${prefix}${other === 'es' ? 'es/' : ''}${name}.html`;
      console.log(`Checking ${lang}/${name}`);
      await page.goto(current);
      const link = page.locator(`nav a[rel="lang-switch-${other}"]`);
      await page.waitForFunction(({selector, href}) =>
        document.querySelector(selector)?.href.replace(/index\.html$/, '') === href.replace(/index\.html$/, ''),
        {selector: `nav a[rel="lang-switch-${other}"]`, href: target}, {timeout: 10000})
        .catch(async error => { console.error('Expected', target, 'found', await link.getAttribute('href')); throw error; });
      assert.equal(await link.getAttribute('hreflang'), other);
      assert.equal(await page.locator(`nav a[rel="lang-switch-${lang}"]`).getAttribute('aria-current'), 'page');

      // Compare every explicit translation marker, plus IDs shared by the
      // two documents. This checks the HTML attachment, not just source text.
      const pairs = await page.evaluate(async targetURL => {
        const html = await (await fetch(targetURL)).text();
        const targetDoc = new DOMParser().parseFromString(html, 'text/html');
        const targetKeys = new Map([...targetDoc.querySelectorAll('[data-language-key]')]
          .map(e => [e.dataset.languageKey, e.closest('section[id]')?.id]));
        const result = [];
        for (const marker of document.querySelectorAll('[data-language-key]')) {
          const sourceID = marker.closest('section[id]')?.id;
          const targetID = targetKeys.get(marker.dataset.languageKey);
          if (!sourceID || !targetID) throw new Error(`Unattached language key: ${marker.dataset.languageKey}`);
          result.push([sourceID, targetID]);
        }
        for (const section of document.querySelectorAll('main section[id]')) {
          if (targetDoc.getElementById(section.id) && !result.some(pair => pair[0] === section.id))
            result.push([section.id, section.id]);
        }
        return result;
      }, target);
      for (const [sourceID, targetID] of pairs) {
        await page.evaluate(id => {location.hash = id;}, sourceID);
        await page.waitForFunction(({selector, id}) =>
          decodeURIComponent(new URL(document.querySelector(selector).href).hash.slice(1)) === id,
        {selector: `nav a[rel="lang-switch-${other}"]`, id: targetID});
        counters.anchors++;
      }
      await page.evaluate(() => {location.hash = 'no-such-section';});
      await page.waitForFunction(selector => !new URL(document.querySelector(selector).href).hash,
        `nav a[rel="lang-switch-${other}"]`);
      await audit(`${lang}/${name}`);
      for (const width of [1440, 390]) {
        await page.setViewportSize({width, height: 1000});
        const fits = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
        if (!fits) console.error(await page.evaluate(() => [...document.querySelectorAll('main *')]
          .filter(e => e.getBoundingClientRect().right > innerWidth + 1)
          .slice(0, 8).map(e => ({tag:e.tagName, class:e.className, text:e.textContent.slice(0, 100), width:e.getBoundingClientRect().width}))));
        assert(fits,
          `${lang}/${name}: horizontal overflow at ${width}`);
      }
    }
  }
}

// The day sheet exists to be printed, so its print layout is the page.
// `custom.scss` promises that on paper Quarto's chrome and the intro go,
// the sheet fits one A4 page, and the timing strip prints as a second
// page of its own (`break-before: page`). Two pages is both halves of
// that at once: the sheet spilling over, or the strip, makes three, and
// the break going missing makes one. Both languages, since the Spanish
// copy runs longer and would be the first to spill.
async function runDaySheetPrint(ctx) {
  const {page, origin, prefix, screenshots} = ctx;
  for (const lang of ['en', 'es']) {
    const where = `${lang}/day-sheet (print)`;
    console.log(`Checking ${where}`);
    await page.setViewportSize({width: 1440, height: 1000});
    await page.goto(`${origin}${prefix}${lang === 'es' ? 'es/' : ''}day-sheet.html`);
    const chrome = ['#quarto-header', '#quarto-margin-sidebar', 'footer.footer', '.day-sheet-intro'];
    const sheet = ['.day-sheet', '.day-sheet-strip'];
    const becomes = (selector, state) => page.locator(selector).first()
      .waitFor({state, timeout: 5000})
      .catch(() => assert.fail(`${where}: ${selector} should be ${state}`));
    // On screen first, so that what disappears on paper is print's doing,
    // and a selector that has stopped matching cannot pass as hidden.
    for (const selector of [...chrome, ...sheet]) await becomes(selector, 'visible');
    await page.emulateMedia({media: 'print'});
    try {
      // No page here draws `#quarto-sidebar` today; the rule hides it too.
      for (const selector of [...chrome, '#quarto-sidebar']) await becomes(selector, 'hidden');
      for (const selector of sheet) await becomes(selector, 'visible');
    } finally {
      await page.emulateMedia({media: null});
    }
    // The faces decide the line breaks, and so where the page breaks fall.
    await page.evaluate(() => document.fonts.ready);
    const pdf = await page.pdf({preferCSSPageSize: true,
      path: path.join(screenshots, `day-sheet-${lang}.pdf`)});
    // Chromium writes each page as its own `/Type /Page` dictionary, in
    // the clear; `/Type /Pages` is the page tree's root, not a page.
    const printed = (pdf.toString('latin1').match(/\/Type\s*\/Page(?!s)/g) || []).length;
    assert.equal(printed, 2,
      `${where}: printed on ${printed} A4 page(s), not 2 -- the sheet on one, the timing strip on the next`);
  }
}

// The hero carries a still of every widget, behind one tab each, in the
// page's own language, and each still is a link to its widget. The static
// diagram is the fallback and must still be in the document for phones. The
// count is pinned because a widget added to `repo.widgets` and not to the
// hero is the failure this catches -- the attention stage shipped invisible
// from the front door for exactly that reason.
async function runHero(ctx) {
  const {page, origin, prefix} = ctx;
  const heroTabs = [
    ['layout', 'image-tensor'], ['broadcast', 'broadcasting-simulator'],
    ['linalg', 'linalg-stage'], ['voice', 'voice-stage'],
    ['attention', 'attention-stage'], ['factor', 'factor-stage'],
    ['genome', 'genome-stage']];
  // Desktop width, set explicitly rather than inherited from whatever the
  // pages loop left it at: at 390px `.hero-demos` is CSS-hidden in favour
  // of `.hero-fallback`, and a shard that runs the pages loop but never the
  // widgets loop (which used to leave the viewport at 1440 as a side effect
  // of its own embed checks) would open the hero at mobile width and fail
  // every panel-visible assertion below.
  await page.setViewportSize({width: 1440, height: 1000});
  for (const lang of ['en', 'es']) {
    console.log(`Checking the hero demos (${lang})`);
    await page.goto(`${origin}${prefix}${lang === 'es' ? 'es/' : ''}index.html`);

    // The two vendored faces arrived and were accepted. This is the only
    // guard a @font-face gets from a browser: `check_links.py` sees the
    // files reach docs/, but a woff2 that is corrupt, or a url() that
    // resolves to the wrong depth on one language's pages, fails
    // silently -- the page renders in the fallback stack and looks
    // merely a bit different. The Spanish half matters most: the
    // stylesheet is linked at a different depth there.
    await page.evaluate(() => document.fonts.ready);
    for (const face of ['1em Inter', '1em "Source Serif 4"']) {
      assert(await page.evaluate(f => document.fonts.check(f), face),
        `${lang}/index: ${face} did not load — see fonts/README.md`);
    }

    // No widget runs on the front door: the pictures are pictures, and
    // the way into a widget is clicking one.
    assert.equal(await page.locator('.hero-visual iframe').count(), 0,
      `${lang}/index: an iframe is back in the hero`);
    assert.equal(await page.locator('.hero-open').count(), 0,
      `${lang}/index: the open-the-widget button is back`);
    assert(await page.locator('.hero-visual.has-js').count() === 1, `${lang}/index: tab script did not run`);
    const stills = page.locator('.hero-panel a.hero-still');
    assert.equal(await stills.count(), heroTabs.length, `${lang}/index: one still per widget`);
    for (const [i, [tab, file]] of heroTabs.entries()) {
      if (i) await page.locator(`#hero-tab-${tab}`).click();
      const panel = page.locator(`#hero-panel-${tab}`);
      // Polled rather than read once: a click's own layout, or the very
      // first panel's on a machine busy with other shards' browsers, can
      // lag a synchronous read past what a single check tolerates.
      await panel.waitFor({state: 'visible', timeout: 5000}).catch(() => {});
      assert(await panel.isVisible(), `${lang}/index: ${tab} tab`);
      for (const [other] of heroTabs) {
        if (other !== tab) assert(await page.locator(`#hero-panel-${other}`).isHidden(),
          `${lang}/index: ${other} panel shown with ${tab} open`);
      }
      const link = panel.locator('a.hero-still');
      assert((await link.getAttribute('href')).endsWith(`interactive/${file}.html?lang=${lang}`),
        `${lang}/index: the ${tab} still does not link to ${file}`);
      const img = link.locator('img');
      assert((await img.getAttribute('src')).endsWith(`images/hero-${file}-${lang}.webp`),
        `${lang}/index: the ${tab} still is not its own language's picture`);
      assert((await img.getAttribute('alt')).length > 20, `${lang}/index: the ${tab} still has no alt`);
      // The picture arrived: a lazy image in a panel just opened.
      await page.waitForFunction(el => el.complete && el.naturalWidth > 0,
        await img.elementHandle(), {timeout: 10000});
    }
    // The loop above leaves the last tab open, and the panel clicked below
    // is the factorisation stage's -- which stopped being the last one when
    // the genome stage was added, so its panel was hidden and the click went
    // nowhere. Select it rather than assume the loop ended on it.
    await page.locator('#hero-tab-factor').click();
    await page.locator('#hero-panel-factor').waitFor({state: 'visible', timeout: 5000});
    // Clicking the picture is the way in, in the same tab. `no-external`
    // is what keeps it there: Quarto's link script compares a link with
    // `site-url`, so off the live host it would open every still in a
    // new tab and this wait would never see the navigation.
    await Promise.all([
      page.waitForURL(u => u.pathname.endsWith('/interactive/factor-stage.html')
        && u.searchParams.get('lang') === lang, {waitUntil: 'commit'}),
      page.locator('#hero-panel-factor a.hero-still').click()]);
    // Back to the homepage by address, not by history: goBack() asked the
    // factor stage for its history while three.js was still booting, and
    // with two other shards' browsers on the runner that page's target
    // was sometimes already detached ("Not attached to an active page").
    await page.goto(`${origin}${prefix}${lang === 'es' ? 'es/' : ''}index.html`);
    assert.equal(await page.locator('.hero-fallback svg.hero-diagram').count(), 1);
    await page.setViewportSize({width: 390, height: 1000});
    assert(await page.locator('.hero-fallback').isVisible(), `${lang}/index: diagram fallback on a phone`);
    assert(await page.locator('.hero-demos').isHidden(), `${lang}/index: stills hidden on a phone`);
    await page.setViewportSize({width: 1440, height: 1000});
  }
}

// Keyboard activation on desktop and through the collapsed mobile menu, then
// the disclosure widgets (assessment keys) staying folded until chosen.
async function runKeyboardAndDisclosures(ctx) {
  const {page, origin, prefix, screenshots} = ctx;
  for (const width of [1440, 390]) {
    console.log(`Checking keyboard controls at ${width}px`);
    await page.setViewportSize({width, height: 1000});
    await page.goto(`${origin}${prefix}assessments.html${width === 390 ? '#exit-5-minutes' : ''}`);
    if (width === 1440) await page.locator('#toc-exit-5-minutes').click();
    const spanish = page.locator('nav a[rel="lang-switch-es"]');
    await page.waitForFunction(() => document.querySelector('nav a[rel="lang-switch-es"]').hash === '#salida-5-minutos');
    if (width === 390) {
      const toggle = page.locator('.navbar-toggler');
      await toggle.focus();
      await page.keyboard.press('Enter');
      assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
    }
    await spanish.focus();
    assert(await spanish.evaluate(e => document.activeElement === e));
    await page.keyboard.press('Enter');
    await page.waitForURL('**/es/assessments.html#salida-5-minutos');
    assert.equal(await page.locator('html').getAttribute('lang'), 'es');
    const exitKey = page.locator('#salida-5-minutos details');
    assert.equal(await exitKey.getAttribute('open'), null);
    await exitKey.locator('summary').click();
    assert.notEqual(await exitKey.getAttribute('open'), null);
    await page.screenshot({path: path.join(screenshots, `workshop-assessment-es-${width}.png`), fullPage: true});
    if (width === 390) await page.locator('.navbar-toggler').click();
    await page.locator('nav a[rel="lang-switch-en"]').focus();
    await page.keyboard.press('Enter');
    await page.waitForURL('**/assessments.html#exit-5-minutes');
  }

  // Each assessment key stays folded until the learner chooses to reveal
  // it. Scope by section: the page now has entry/exit and in-lesson keys.
  for (const lang of ['en', 'es']) {
    for (const width of [1440, 390]) {
      await page.setViewportSize({width, height: 1000});
      await page.goto(`${origin}${prefix}${lang === 'es' ? 'es/' : ''}assessments.html#in-section-checkpoints`);
      const section = page.locator('section.level2').filter({
        has: page.locator('[data-language-key="in-section-checkpoints"]')});
      assert.equal(await section.count(), 1, 'Checkpoint marker belongs to a rendered section');
      const key = section.locator('details');
      assert.equal(await key.getAttribute('open'), null);
      await key.locator('summary').focus();
      await page.keyboard.press('Enter');
      assert.notEqual(await key.getAttribute('open'), null);
      await page.keyboard.press('Enter');
      assert.equal(await key.getAttribute('open'), null);
    }
  }
}

// The readiness pages: unlisted diagnostics with no navbar, kept out of
// search and the sitemap, and the instructor key off the learner sheet.
async function runReadiness(ctx) {
  const {page, root, audit} = ctx;
  const searchIndex = await fs.readFile(path.join(root, 'search.json'), 'utf8');
  const sitemap = await fs.readFile(path.join(root, 'sitemap.xml'), 'utf8');
  assert(!searchIndex.includes('readiness-'), 'Diagnostic leaked into site search');
  assert(!sitemap.includes('readiness-'), 'Diagnostic leaked into sitemap');
  for (const lang of ['en', 'es']) {
    for (const width of [1440, 390]) {
      await page.setViewportSize({width, height: 1000});
      const base = `${ctx.origin}${ctx.prefix}${lang === 'es' ? 'es/' : ''}`;
      for (const name of readinessPages) {
        await page.goto(`${base}${name}.html`);
        assert.equal(await page.locator('nav.navbar').count(), 0);
        assert((await page.locator('meta[name="robots"]').getAttribute('content')).includes('noindex'));
        if (width === 1440) await audit(`${lang}/${name}`);
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
          `${lang}/${name}: horizontal overflow at ${width}`);
        if (name === 'readiness-check') {
          assert.equal(await page.locator('main section.level2').count(), 4);
          assert.equal(await page.locator('main details, main a[href*="readiness-instructor"]').count(), 0);
          await page.screenshot({path: path.join(ctx.screenshots, `${name}-${lang}-${width}.png`), fullPage: true});
        }
        if (name === 'readiness-instructor') {
          assert.equal(await page.locator('main a[href*="readiness-refresher.html#"]').count(), 4);
          // Explicit draft links must survive Quarto's link resolution.
          assert((await page.locator('main a[href*="readiness-check.html"]').count()) >= 2);
        }
      }
    }
  }
}

// The wide handbook table is a focusable scroll region on a phone.
async function runWideTable(ctx) {
  const {page, origin, prefix} = ctx;
  await page.goto(`${origin}${prefix}tensors_workshop_plan_with_quizzes.html`);
  const table = page.locator('.table-responsive').first();
  await table.focus();
  assert(await table.evaluate(e => document.activeElement === e && e.scrollWidth > e.clientWidth));
  await page.keyboard.press('ArrowRight');
  await page.waitForFunction(() => document.querySelector('.table-responsive').scrollLeft > 0);
}

// Host-root deployment, directories, query strings, missing fragments, and
// failed counterpart fetches must still leave usable links.
async function runFallbacks(ctx) {
  const {page, origin, prefix} = ctx;
  await page.goto(`${origin}/es/?view=workshop`);
  await page.waitForFunction(() => {
    const url = new URL(document.querySelector('nav a[rel="lang-switch-en"]').href);
    return ['/', '/index.html'].includes(url.pathname) && url.search === '?view=workshop';
  });
  await page.route('**/es/faq.html', route => route.abort());
  await page.goto(`${origin}${prefix}faq.html#offline`);
  await page.waitForFunction(() => document.querySelector('nav a[rel="lang-switch-es"]').href.endsWith('/es/faq.html'));
  await page.unroute('**/es/faq.html');
}

// Exercise Reveal's presentation mode; phone widths activate its separate
// scrolling reader. The website's mobile navigation is checked above.
async function runSlides(ctx) {
  const {page, origin, prefix, screenshots} = ctx;
  await page.setViewportSize({width: 1440, height: 1000});
  for (const lang of ['en', 'es']) {
    console.log(`Checking ${lang} slide links`);
    const other = lang === 'en' ? 'es' : 'en';
    await page.goto(`${origin}${prefix}slides/${lang}/`);
    await page.waitForFunction(() => typeof Reveal !== 'undefined' && Reveal.isReady());
    const outcomes = await page.locator('section.outcomes-slide').evaluateAll(slides => slides.map(s => s.id));
    assert.equal(outcomes.length, 13, `${lang}: every section needs visible outcomes`);
    for (const id of outcomes) {
      await page.evaluate(id => {
        const index = Reveal.getIndices(document.getElementById(id));
        Reveal.slide(index.h, index.v);
        Reveal.layout();
      }, id);
      const slide = page.locator(`section#${id}`);
      assert((await slide.innerText()).includes(lang === 'en' ? 'Practise today' : 'Practica hoy'));
      assert((await slide.innerText()).includes(lang === 'en' ? 'Explore later' : 'Explora después'));
      const overflow = await slide.evaluate(s => {
        const rect = s.getBoundingClientRect();
        return [...s.querySelectorAll('h2, h3, p')].filter(e => !e.closest('.notes, .colab-tab'))
          .filter(e => {const r = e.getBoundingClientRect();
            return r.bottom > rect.bottom + 2 || r.right > rect.right + 2;})
          .map(e => e.textContent);
      });
      assert.deepEqual(overflow, [], `${lang}/${id}: outcome text overflows`);
      await page.screenshot({path: path.join(screenshots, `outcomes-${lang}-${id}.png`)});
    }
    await page.evaluate(() => {
      const indices = Reveal.getIndices(document.getElementById('sec-07-inverses-and-pseudoinverse'));
      Reveal.slide(indices.h, indices.v);
    });
    await page.waitForFunction(otherLang => document.querySelector(`a[rel="lang-switch-${otherLang}"]`)?.hash
      === '#/sec-07-inverses-and-pseudoinverse', other, {timeout: 10000})
      .catch(async error => {
        console.error(await page.evaluate(() => ({hash:location.hash, ready:Reveal.isReady(),
          links:[...document.querySelectorAll('a[rel^="lang-switch"]')].map(a => a.outerHTML)})));
        throw error;
      });
    const link = page.locator(`a[rel="lang-switch-${other}"]`);
    assert((await link.getAttribute('href')).includes(`/slides/${other}/`));
    await link.click();
    await page.waitForFunction(() => typeof Reveal !== 'undefined' && Reveal.isReady()
      && Reveal.getCurrentSlide().id === 'sec-07-inverses-and-pseudoinverse');
  }
}

module.exports = {
  pages, readinessPages, decks, EXEMPT,
  checkCoverage, runPages, runDaySheetPrint, runHero,
  runKeyboardAndDisclosures, runReadiness, runWideTable, runFallbacks, runSlides,
};
