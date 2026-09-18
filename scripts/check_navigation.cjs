// Render first. Requires Playwright and its Chromium browser (see CONTRIBUTING).
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const {AxeBuilder} = require('@axe-core/playwright');
const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const root = path.resolve(__dirname, '../docs');
const screenshots = process.env.SCREENSHOT_DIR || require('node:os').tmpdir();
const prefix = '/tensors-workshop/';
const types = {'.html':'text/html', '.js':'text/javascript', '.css':'text/css',
  '.json':'application/json', '.svg':'image/svg+xml', '.png':'image/png', '.gif':'image/gif',
  '.webp':'image/webp', '.woff2':'font/woff2'};
const pages = ['index', 'notebooks', 'kahoot', 'references', 'companion', 'teach',
  'faq', 'facilitator-guide', 'assessments', 'worked-mistakes', 'group-tasks',
  'workshop-feedback', 'tensors_workshop_plan_with_quizzes'];

// The accessibility pass. axe runs over every page and both widgets, and a
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
const a11y = [];
async function audit(page, where) {
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

(async () => {
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
  let browser;
  let anchors = 0;
  try {
    browser = await chromium.launch({headless: true,
      ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
    const context = await browser.newContext();
    // Keep the test independent of YouTube, NotebookLM and other remote embeds.
    await context.route('**/*', route => route.request().url().startsWith(origin)
      ? route.continue() : route.abort());
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => { errors.push(error.message); console.error(error.message); });
    if (!process.argv.includes('--slides-only')) {
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
            anchors++;
          }
          await page.evaluate(() => {location.hash = 'no-such-section';});
          await page.waitForFunction(selector => !new URL(document.querySelector(selector).href).hash,
            `nav a[rel="lang-switch-${other}"]`);
          await audit(page, `${lang}/${name}`);
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

      // The two widgets are resources, not Quarto pages, so neither has a
      // navbar and neither is reachable by clicking. Three.js is vendored, so
      // it is same-origin and this check -- which aborts every off-origin
      // request -- can finally load it. That is what `window.THREE` asserts.
      // The render mode is deliberately not asserted: whether headless
      // Chromium gives us WebGL is not something to hang CI on, and the
      // isometric canvas is a designed fallback, not a failure.
      const widgets = [
        {file: 'tensor-visualizer', en: 'Reshape, transpose and strides',
         es: 'Reshape, transpose y strides', three: true},
        {file: 'broadcasting-simulator', en: 'Broadcasting, step by step',
         es: 'Broadcasting, paso a paso', three: false}
      ];
      for (const widget of widgets) {
        console.log(`Checking ${widget.file}`);
        for (const lang of ['en', 'es']) {
          const where = `${widget.file} ${lang}`;
          await page.goto(
            `${origin}${prefix}interactive/${widget.file}.html?lang=${lang}`);
          assert.equal(await page.locator('html').getAttribute('lang'), lang);
          assert.equal(await page.locator('#title').innerText(), widget[lang]);
          if (widget.three) {
            // `attached`, not `visible`: once three.js loads, the isometric
            // fallback canvas is the one that gets display:none, and it is
            // also the first match.
            await page.waitForSelector('#stage canvas', {state: 'attached'});
            await page.waitForFunction(() => window.THREE !== undefined,
              null, {timeout: 10000});
            assert.equal(await page.evaluate(() => window.THREE.REVISION), '169',
              `${where}: vendored three.js did not load`);
            // The photos are a generated JSON fetched same-origin
            // (interactive/data/photos.json, from gen_figures.py). Without
            // them the widget silently falls back to counting numbers, which
            // is a designed fallback for a reader and a regression for CI.
            await page.waitForFunction(() =>
              document.querySelector('#stage').dataset.photos === '3',
              null, {timeout: 10000})
              .catch(() => assert.fail(`${where}: photos.json did not load`));
            const readout = () => page.locator('#shape-readout').innerText();
            // The controls live in tabs, and Playwright clicks only what is
            // visible, so each group of clicks opens its tab first.
            const tab = name => page.locator(`#tab-${name}`).click();
            assert((await readout()).includes('(3, 16, 16, 3)'),
              `${where}: photo batch is not NHWC 16px by default`);
            // Transpose permutes the shape; the reshape comparison adds a row.
            await tab('transpose');
            await page.locator('#order-NCHW').click();
            assert((await readout()).includes('(3, 3, 16, 16)'),
              `${where}: NCHW preset did not permute the shape`);
            assert.equal(await page.locator('#imgstrip .strip-row').count(), 1);
            await tab('reshape');
            await page.locator('#compare').check();
            assert.equal(await page.locator('#imgstrip .strip-row').count(), 2,
              `${where}: reshape comparison did not add its row`);
            assert(await page.locator('#imgstrip .strip-row.wrong').count() === 1,
              `${where}: reshape of a transposed view should be marked wrong`);
            await page.locator('#compare').uncheck();

            // The stage carries the shape, the strides and a signature of the
            // buffer, so the three operations can be checked for what they
            // promise rather than for how they look. `bufsig` hashes which
            // source element sits at each memory offset: a view must never
            // change it, and a copy must.
            const data = key => page.locator('#stage').evaluate((e, k) => e.dataset[k], key);
            const preset = text => page.locator('#shape-presets button')
              .filter({hasText: text}).first();
            await tab('transpose');
            await page.locator('#order-NHWC').click();
            const viewSig = await data('bufsig');
            assert.equal(await data('shape'), '3,16,16,3', `${where}: NHWC did not come back`);
            await tab('reshape');
            await preset('(2304,)').click();
            assert.equal(await data('shape'), '2304',
              `${where}: reshape preset did not take`);
            assert.equal(await data('bufsig'), viewSig,
              `${where}: a reshape of a contiguous view must not move a byte`);
            await preset('(3, 16, 16, 3)').click();
            await tab('transpose');
            await page.locator('#order-NCHW').click();
            assert.equal(await data('bufsig'), viewSig,
              `${where}: a transpose must not move a byte`);
            await tab('memory');
            await page.locator('#contig').click();
            assert.notEqual(await data('bufsig'), viewSig,
              `${where}: .contiguous() must rewrite the buffer`);
            assert.equal(await data('shape'), '3,3,16,16',
              `${where}: .contiguous() must leave the shape alone`);
            assert.equal(await data('strides'), '768,256,16,1',
              `${where}: .contiguous() must leave C-contiguous strides`);

            // Face on, the gaps close and -- in photo mode -- the channel
            // planes composite back into the photograph.
            await page.locator('#snap').click();
            await page.waitForFunction(() =>
              document.querySelector('#stage').dataset.snapped === '1',
              null, {timeout: 5000})
              .catch(() => assert.fail(`${where}: Snap to 2-D did not engage`));

            // Counting numbers are a tensor of any rank: every factorisation
            // of 24 is a reshape, and none of them touches the buffer. They
            // open arranged by position, so each reshape visibly re-lays the
            // cubes -- by meaning, (24,) kept drawing as the 2x3x4 it came from.
            await page.locator('label[for="data-numbers"]').click();
            assert.equal(await data('shape'), '2,3,4', `${where}: np.arange(24) shape`);
            assert.equal(await data('arrange'), 'position',
              `${where}: counting numbers should follow the shape`);
            const numbersSig = await data('bufsig');
            await tab('reshape');
            for (const [label, shape] of [['(24,)', '24'], ['(4, 6)', '4,6'], ['(3, 2, 4)', '3,2,4']]) {
              await preset(label).click();
              assert.equal(await data('shape'), shape, `${where}: reshape to ${label}`);
              assert.equal(await data('bufsig'), numbersSig,
                `${where}: reshape to ${label} must not move a byte`);
            }

            // The idle drift: the stage sways and breathes while nobody is
            // pointing at it, and is the reader's the moment they are. Checked
            // in one language only -- it costs real seconds, and the behaviour
            // has no copy in it. Polled rather than slept on, so a slow runner
            // makes this take longer and not fail.
            if (lang === 'en') {
              // On a fresh load, so that no reshape tween from the steps above
              // is still settling and reads as camera motion.
              await page.goto(
                `${origin}${prefix}interactive/${widget.file}.html?lang=${lang}`);
              await page.waitForFunction(() =>
                document.querySelector('#stage').dataset.photos === '3',
                null, {timeout: 10000});
              // Where the HTML overlays sit is a function of the camera, so
              // their positions changing is the camera moving.
              const where_ = where;
              const pose = () => page.evaluate(() =>
                [...document.getElementById('overlays').children]
                  .map(e => e.getAttribute('style')).join('|'));
              const moves = async (ms) => {
                const first = await pose();
                const until = Date.now() + ms;
                while (Date.now() < until) {
                  await page.waitForTimeout(80);
                  if (await pose() !== first) return true;
                }
                return false;
              };
              await page.mouse.move(2, 2);
              assert(await moves(4000), `${where_}: the stage should drift while idle`);
              const stageBox = await page.locator('#stage').boundingBox();
              await page.mouse.move(stageBox.x + stageBox.width / 2,
                                    stageBox.y + stageBox.height / 2);
              await page.waitForTimeout(200);
              assert(!await moves(900),
                `${where_}: the drift must stop under the pointer`);
              await page.mouse.move(2, 2);
              assert(await moves(6000),
                `${where_}: the drift should come back once the pointer leaves`);
            }

            // `#transpose` in the URL opens the page on that tab.
            await page.goto(
              `${origin}${prefix}interactive/${widget.file}.html?lang=${lang}#transpose`);
            await page.waitForSelector('#tab-transpose');
            assert(await page.locator('#transpose').isVisible(),
              `${where}: #transpose in the URL did not open its tab`);
            assert(await page.locator('#reshape').isHidden(),
              `${where}: the reshape tab stayed open beside #transpose`);
          } else {
            await page.waitForSelector('#draw .cell');
          }
          for (const width of [1440, 390]) {
            await page.setViewportSize({width, height: 1000});
            const fits = await page.evaluate(() =>
              document.documentElement.scrollWidth <= innerWidth + 1);
            assert(fits, `${where}: horizontal overflow at ${width}`);
          }
          await audit(page, where);

          // Embed mode is what the homepage hero shows: stage and caption
          // only, no three.js, on the band's navy.
          await page.goto(
            `${origin}${prefix}interactive/${widget.file}.html?lang=${lang}&embed=1&theme=navy`);
          await page.waitForSelector('#embedcap a');
          assert(await page.locator('aside').isHidden(), `${where} embed: panel shown`);
          assert(await page.locator('header').isHidden(), `${where} embed: header shown`);
          assert.equal(await page.locator('html').getAttribute('data-theme'), 'navy');
          if (widget.three) {
            await page.waitForFunction(() =>
              document.querySelector('#stage').dataset.photos === '3', null, {timeout: 10000});
            assert.equal(await page.evaluate(() => window.THREE), undefined,
              `${where} embed: three.js must not be fetched on the front door`);
          } else {
            await page.waitForSelector('#draw .cell');
          }
          for (const [width, height] of [[560, 448], [330, 264]]) {
            await page.setViewportSize({width, height});
            const fits = await page.evaluate(() =>
              document.documentElement.scrollWidth <= innerWidth + 1);
            assert(fits, `${where} embed: horizontal overflow at ${width}`);
          }
          await page.setViewportSize({width: 1440, height: 1000});
        }
      }

      // The hero carries both widgets live, behind two tabs, in the page's
      // own language. The static diagram is the fallback and must still be
      // in the document for reduced motion and phones.
      for (const lang of ['en', 'es']) {
        console.log(`Checking the hero demos (${lang})`);
        await page.goto(`${origin}${prefix}${lang === 'es' ? 'es/' : ''}index.html`);
        const frames = page.locator('iframe.hero-embed');
        assert.equal(await frames.count(), 2, `${lang}/index: two hero embeds`);
        for (const src of await frames.evaluateAll(els => els.map(e => e.getAttribute('src')))) {
          assert(src.includes(`lang=${lang}`) && src.includes('embed=1') && src.includes('theme=navy'),
            `${lang}/index: hero embed src ${src}`);
        }
        assert(await page.locator('.hero-visual.has-js').count() === 1, `${lang}/index: tab script did not run`);
        assert(await page.locator('#hero-panel-layout').isVisible());
        assert(await page.locator('#hero-panel-broadcast').isHidden());
        await page.locator('#hero-tab-broadcast').click();
        assert(await page.locator('#hero-panel-broadcast').isVisible(), `${lang}/index: broadcasting tab`);
        assert(await page.locator('#hero-panel-layout').isHidden());
        assert.equal(await page.locator('.hero-fallback svg.hero-diagram').count(), 1);
        await page.setViewportSize({width: 390, height: 1000});
        assert(await page.locator('.hero-fallback').isVisible(), `${lang}/index: diagram fallback on a phone`);
        assert(await page.locator('.hero-demos').isHidden(), `${lang}/index: embeds hidden on a phone`);
        await page.setViewportSize({width: 1440, height: 1000});
      }

      // Keyboard activation on desktop and through the collapsed mobile menu.
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

      // The wide handbook table is a focusable scroll region on a phone.
      // Optional diagnostics are reachable only by direct link. Keep them out
      // of site discovery and keep the instructor key off the learner sheet.
      const searchIndex = await fs.readFile(path.join(root, 'search.json'), 'utf8');
      const sitemap = await fs.readFile(path.join(root, 'sitemap.xml'), 'utf8');
      assert(!searchIndex.includes('readiness-'), 'Diagnostic leaked into site search');
      assert(!sitemap.includes('readiness-'), 'Diagnostic leaked into sitemap');
      for (const lang of ['en', 'es']) {
        for (const width of [1440, 390]) {
          await page.setViewportSize({width, height: 1000});
          const base = `${origin}${prefix}${lang === 'es' ? 'es/' : ''}`;
          for (const name of ['readiness-check', 'readiness-instructor', 'readiness-refresher']) {
            await page.goto(`${base}${name}.html`);
            assert.equal(await page.locator('nav.navbar').count(), 0);
            assert((await page.locator('meta[name="robots"]').getAttribute('content')).includes('noindex'));
            if (width === 1440) await audit(page, `${lang}/${name}`);
            assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
              `${lang}/${name}: horizontal overflow at ${width}`);
            if (name === 'readiness-check') {
              assert.equal(await page.locator('main section.level2').count(), 4);
              assert.equal(await page.locator('main details, main a[href*="readiness-instructor"]').count(), 0);
              await page.screenshot({path: path.join(screenshots, `${name}-${lang}-${width}.png`), fullPage: true});
            }
            if (name === 'readiness-instructor') {
              assert.equal(await page.locator('main a[href*="readiness-refresher.html#"]').count(), 4);
              // Explicit draft links must survive Quarto's link resolution.
              assert((await page.locator('main a[href*="readiness-check.html"]').count()) >= 2);
            }
          }
        }
      }

      await page.goto(`${origin}${prefix}tensors_workshop_plan_with_quizzes.html`);
      const table = page.locator('.table-responsive').first();
      await table.focus();
      assert(await table.evaluate(e => document.activeElement === e && e.scrollWidth > e.clientWidth));
      await page.keyboard.press('ArrowRight');
      await page.waitForFunction(() => document.querySelector('.table-responsive').scrollLeft > 0);

      // Host-root deployment, directories, query strings, missing fragments, and
      // failed counterpart fetches must still leave usable links.
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
    assert.deepEqual(errors, [], 'Uncaught browser errors');
    assert.deepEqual(a11y, [], 'Accessibility violations (axe, serious or critical)');
    console.log(process.argv.includes('--slides-only') ? 'Slide links passed.' :
      `Passed: ${pages.length * 2} pages at desktop/mobile widths, ${anchors} section switches, keyboard navigation, disclosures, slide links, fallbacks, both interactive widgets, the visualizer's idle drift, and axe on every page and widget.`);
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
