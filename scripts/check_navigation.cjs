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
const pages = ['index', 'notebooks', 'interactive', 'kahoot', 'references', 'companion', 'teach',
  'faq', 'facilitator-guide', 'assessments', 'worked-mistakes', 'group-tasks',
  'workshop-feedback', 'tensors_workshop_plan_with_quizzes'];

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
  let widgetCount = 0;
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

      // The three widgets are resources, not Quarto pages, so none has a
      // navbar and none is reachable by clicking. Three.js is vendored, so it
      // is same-origin and this check -- which aborts every off-origin request
      // -- can finally load it. That is what `window.THREE` asserts.
      //
      // For the visualizer the render *mode* is deliberately not asserted:
      // whether headless Chromium gives us WebGL is not something to hang CI
      // on, and the isometric canvas is a designed fallback, not a failure.
      // The projection & SVD stage does assert which path it took, because
      // there the addons are the thing at risk: one of them missing from
      // docs/ drops the reader into the flat renderer silently, and nothing
      // else would notice.
      // Each widget drives differently, so each one carries its own driver
      // rather than the loop branching on a flag. `three` said which widget
      // this was as much as it said what it loaded, and a third widget with
      // three.js in it had nowhere to go.
      async function driveVisualizer(page, where, lang) {
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
      // At a stated width, not whatever the loop above left behind,
      // and on a fresh load, so that no reshape tween from the steps
      // above is still settling and reads as camera motion.
      await page.setViewportSize({width: 1440, height: 1000});
      await page.goto(
        `${origin}${prefix}interactive/tensor-visualizer.html?lang=${lang}`);
      await page.waitForFunction(() =>
        document.querySelector('#stage').dataset.photos === '3',
        null, {timeout: 10000});
      // The flat canvas is what boots; three.js arrives after it, and
      // the swap rewrites every overlay -- which would read as camera
      // motion and pass this check with the drift switched off.
      // setMode() gives #view an inline display whichever way it
      // settles, so that is the swap being over.
      await page.waitForFunction(() =>
        document.getElementById('view').style.display !== '',
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
      // The same leave, with a control click in between. #snap and the
      // gizmo are siblings of #stage laid over it, so reaching them is a
      // pointerleave; the click's own dropDrift() used to clear the resume
      // that leave had armed, and the sway was gone for the rest of the
      // visit. Snapped in and straight back out, so the drift is wanted
      // again by the end of it.
      const snapBox = await page.locator('#snap').boundingBox();
      const clickSnap = () => page.mouse.click(snapBox.x + snapBox.width / 2,
                                               snapBox.y + snapBox.height / 2);
      await clickSnap();
      await page.waitForTimeout(400);
      await clickSnap();
      // Both clicks glide the camera. Wait that out under the pointer
      // rather than sleeping a guessed length: once the glide is over,
      // a pointer resting on the snap button must hold the stage still.
      let quiet = false;
      for (let i = 0; i < 12 && !quiet; i++) quiet = !await moves(900);
      assert(quiet,
        `${where_}: the drift must stop under a pointer on the snap button`);
      await page.mouse.move(2, 2);
      assert(await moves(6000),
        `${where_}: the drift should come back after a snap click`);
    }

    // `#transpose` in the URL opens the page on that tab.
    await page.goto(
      `${origin}${prefix}interactive/tensor-visualizer.html?lang=${lang}#transpose`);
    await page.waitForSelector('#tab-transpose');
    assert(await page.locator('#transpose').isVisible(),
      `${where}: #transpose in the URL did not open its tab`);
    assert(await page.locator('#reshape').isHidden(),
      `${where}: the reshape tab stayed open beside #transpose`);
      }

      async function driveBroadcasting(page) {
        await page.waitForSelector('#draw .cell');
      }

      // The attention stage. Seven scenes, no three.js and no sound, so what
      // only this one can check is the arithmetic behind each claim, read
      // off #stage's data-* the way the projection stage's checks do --
      // computed in-page through AttentionCore where a reference value is
      // needed, so the assertion is independent of the page's own state.
      async function driveAttention(page, where, lang) {
        await page.waitForFunction(() => document.getElementById('stage').dataset.ready === '1',
          null, {timeout: 10000});
        const data = () => page.evaluate(() => ({...document.getElementById('stage').dataset}));

        // Nothing clips an SVG child and nothing complains about one. A grid
        // laid out past the bottom of the 640 x 400 viewBox is simply not
        // drawn, while its numbers stay in the readout and every data-*
        // assertion below still passes -- which is exactly how the softmax
        // scene shipped with the last row of A and its bar chart off the
        // stage. So each scene is measured once, as the union of what it
        // actually drew, mapped back into viewBox units through the CTM
        // because a scene's own coordinates sit inside a translated group.
        const fits = async (id) => {
          const box = await page.evaluate(() => {
            const svg = document.getElementById('picture');
            const inv = svg.getScreenCTM() && svg.getScreenCTM().inverse();
            if (!inv) return null;
            let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
            for (const node of svg.querySelectorAll('*')) {
              if (typeof node.getBBox !== 'function' || !node.getScreenCTM()) continue;
              let b;
              try { b = node.getBBox(); } catch (e) { continue; }
              if (!b.width && !b.height) continue;
              const m = inv.multiply(node.getScreenCTM());
              for (const [px, py] of [[b.x, b.y], [b.x + b.width, b.y],
                                      [b.x, b.y + b.height], [b.x + b.width, b.y + b.height]]) {
                const x = m.a * px + m.c * py + m.e, y = m.b * px + m.d * py + m.f;
                x0 = Math.min(x0, x); y0 = Math.min(y0, y);
                x1 = Math.max(x1, x); y1 = Math.max(y1, y);
              }
            }
            return {x0, y0, x1, y1};
          });
          assert(box, `${where}: #${id} drew nothing measurable`);
          // A couple of units of slack: a <text> box is the font's, not the
          // glyphs', and a chip's rounded corner rounds outward.
          assert(box.x0 >= -3 && box.y0 >= -3 && box.x1 <= 643 && box.y1 <= 403,
            `${where}: #${id} draws outside the 640x400 viewBox ` +
            `(x ${box.x0.toFixed(0)}..${box.x1.toFixed(0)}, y ${box.y0.toFixed(0)}..${box.y1.toFixed(0)})`);
        };

        const open = async (id) => {
          await page.evaluate((name) => { location.hash = '#' + name; }, id);
          await page.waitForFunction((name) =>
            document.getElementById('stage').dataset.scene === name, id, {timeout: 8000})
            .catch(() => assert.fail(`${where}: #${id} did not open that scene`));
          await fits(id);
        };
        const settle = () => page.waitForTimeout(80);

        // tokens: the gather, byte-exact.
        await open('tokens');
        let d = await data();
        assert.equal(d.s, '4'); assert.equal(d.d, '8');
        assert.equal(d.shape, '4,8');
        assert.equal(d.ids, '3,1,4,1');
        assert.equal(await page.locator('#claim').textContent(), 'X = E[ids],  X.shape = (4, 8)',
          `${where}: tokens claim is not byte-exact`);

        // project: 192 parameters make Q, K and V, and every dot product is
        // an integer -- the legibility contract the seed keeps.
        await open('project');
        d = await data();
        assert.equal(d.wparams, '192');
        assert.equal(d.integer, '1');

        // heads: the honest reshape agrees with the token it should; the
        // flat one does not, and says so with its own srcof.
        await open('heads');
        d = await data();
        assert.equal(d.agree, '1'); assert.equal(d.mixed, '0');
        await page.selectOption('#c-heads-order', 'flat');
        await settle();
        d = await data();
        assert.equal(d.shape, '2,4,4'); assert.equal(d.sameshape, '1');
        assert.equal(d.agree, '0'); assert.equal(d.mixed, '1');
        const expectedSrc = await page.evaluate(() => {
          const AC = window.AttentionCore;
          const X = AC.gather(AC.embedding(), AC.IDS);
          return AC.traceCell(X, 2, true, 0, 1, 0).from.s;
        });
        assert.equal(d.srcof, String(expectedSrc));

        // scores: the contraction is over d, the legibility contract makes
        // every unscaled score exactly double its scaled counterpart, and
        // sqrt(D_k) = 2 always halves.
        await open('scores');
        d = await data();
        assert.equal(d.contract, 'd');
        assert.equal(d.halves, '1');
        const lmaxScaled = Number(d.lmax);
        await page.selectOption('#c-scores-scale', 'none');
        await settle();
        d = await data();
        assert(Math.abs(Number(d.lmax) - lmaxScaled * 2) < 1e-9,
          `${where}: unscaled lmax should be exactly double scaled (${d.lmax} vs ${lmaxScaled * 2})`);

        // softmax: over the keys every row sums to 1.000; over the queries
        // it need not; a causal mask gives exact zeros and masks six cells.
        await open('softmax');
        d = await data();
        assert.equal(d.over, 't');
        assert.equal(d.rowsum, '1.000');
        await page.selectOption('#c-softmax-axis', 'queries');
        await settle();
        d = await data();
        assert.notEqual(d.rowsum, '1.000',
          `${where}: softmax over queries should not make every row over t sum to 1.000`);
        await page.selectOption('#c-softmax-axis', 'keys');
        await page.selectOption('#c-softmax-mask', 'causal');
        await settle();
        d = await data();
        assert.equal(d.exactzero, '1');
        assert.equal(d.masked, '6');
        assert.equal(d.rowsum, '1.000');

        // output: the contraction is over t, and O is a convex combination
        // of V; merging heads gives back a (4, 8) row per token.
        await open('output');
        d = await data();
        assert.equal(d.contract, 't');
        assert.equal(d.convex, '1');
        await page.selectOption('#c-output-merge', 'merged');
        await settle();
        d = await data();
        assert.equal(d.merged, '4,8');

        // batch: the two einsum strings are literal text, and moving B
        // moves only B in the shape.
        await open('batch');
        d = await data();
        assert.equal(d.shape, '2,2,4,4');
        assert.equal(d.einsum1, 'bhsd,bhtd->bhst');
        assert.equal(d.einsum2, 'bhst,bhtd->bhsd');
        await page.locator('#c-batch-b').fill('4');
        await settle();
        d = await data();
        assert.equal(d.shape, '4,2,4,4');
        assert.equal(await page.locator('#stage').getAttribute('data-tensorshape'), '[4, 2, 4, 4]');
        // The only scene whose picture is sized from its controls, so it is
        // the only one where fitting at the opening values proves nothing.
        // Both corners: every slider at its maximum, then at its minimum.
        for (const [b, h, sq, dk] of [['4', '4', '16', '16'], ['1', '1', '2', '2']]) {
          await page.locator('#c-batch-b').fill(b);
          await page.locator('#c-batch-h').fill(h);
          await page.locator('#c-batch-s').fill(sq);
          await page.locator('#c-batch-dk').fill(dk);
          await page.waitForFunction((want) =>
            document.getElementById('stage').dataset.shape === want,
          [b, h, sq, dk].join(','), {timeout: 8000});
          await fits(`batch at (${b}, ${h}, ${sq}, ${dk})`);
        }

        // A scene's own name, with a hard reload, opens on it.
        await page.goto(
          `${origin}${prefix}interactive/attention-stage.html?lang=${lang}&fresh=1#softmax`);
        await page.waitForFunction(() =>
          document.getElementById('stage').dataset.scene === 'softmax', null, {timeout: 8000})
          .catch(() => assert.fail(`${where}: #softmax did not open on that scene`));
      }

      // The voice tensor stage. What only this one can check: that the
      // recording actually arrived and decoded -- `data-standin` is the
      // stage's own admission that it fell back to a synthesised signal, and
      // a voice.wav that stopped reaching docs/ would otherwise draw a
      // perfectly convincing picture of the wrong thing -- and that the three
      // layouts really are the same matrix reordered, read off the stage as
      // numbers rather than looked for in pixels.
      // A picture is reached by its own name. Setting location.hash from
      // inside the page fires hashchange, which is the same request as
      // opening on it; a page.goto that differs only in the hash would not
      // reload and would not fire anything.
      async function voiceScene(page, id) {
        await page.evaluate(name => { location.hash = '#' + name; }, id);
        // The hash scrolls that section into view, and in a scroller the step
        // machine follows the scroll -- so the stage passes through every
        // picture on the way and is only telling the truth once the scrolling
        // has stopped. Wait for that, then ask again.
        await page.waitForFunction(() => new Promise(done => {
          const was = window.scrollY;
          setTimeout(() => done(window.scrollY === was), 250);
        }), null, {timeout: 15000});
        await page.waitForFunction(name =>
          document.getElementById('stage').dataset.scene === name, id, {timeout: 8000});
      }

      // The projection & SVD stage. Two things here that the other two cannot
      // check: that the vendored *addons* arrived -- a bloom pass that never
      // reached docs/ would drop the reader into the flat renderer and let
      // this check pass, which is the eleven-day 404 all over again -- and
      // that A v = sigma u holds through the real render path, read off the
      // stage as numbers rather than looked for in pixels.
      async function driveStage(page, where, lang) {
        // Wait on the *modules*, not on a context. Whether a headless runner
        // gives us WebGL is not something to hang CI on -- that is the same
        // call the visualizer makes -- and the modules landing is the thing
        // actually at risk here: an addon missing from docs/ drops the reader
        // into the flat renderer, and nothing else would notice.
        await page.waitForFunction(() => window.THREE_ADDONS !== undefined,
          null, {timeout: 12000})
          .catch(() => assert.fail(`${where}: the vendored three.js addons never loaded`));
        assert.equal(await page.evaluate(() => window.THREE.REVISION), '169',
          `${where}: vendored three.js did not load`);
        for (const name of ['EffectComposer', 'RenderPass', 'UnrealBloomPass',
                            'OutputPass', 'CSS2DRenderer']) {
          assert.equal(await page.evaluate(
            n => typeof window.THREE_ADDONS[n], name), 'function',
            `${where}: vendored addon ${name} did not load`);
        }
        // The render mode is advisory: on a runner with a context this says
        // step 1 went through the bloom composer, and on one without it says
        // the designed fallback took over. Either is a pass; only a
        // *contradiction* is not.
        const mode1 = await page.evaluate(() =>
          document.querySelector('#stage').dataset.gl);
        assert(mode1 === 'composer' || mode1 === 'none',
          `${where}: step 1 rendered as '${mode1}', expected the composer or the flat fallback`);
        if (mode1 === 'none') console.log(`  (${where}: no WebGL here, exercising the flat renderer)`);

        // Step 1: sliding y off the plane moves the residual and leaves beta
        // alone, which is the step's whole claim. Read off data-*, which the
        // readout writes from the slider's target rather than from the eased
        // picture, so the assertion does not wait on a tween.
        const data1 = () => page.evaluate(() => ({...document.querySelector('#stage').dataset}));
        const before = (await data1()).beta;
        assert(before && before.split(',').length === 2, `${where}: step 1 should stamp beta`);
        await page.locator('#tilt').fill('0');
        assert.equal((await data1()).rnorm, '0.0000',
          `${where}: y on the plane should leave no residual`);
        await page.locator('#tilt').fill('400');
        assert.notEqual((await data1()).rnorm, '0.0000',
          `${where}: sliding y off the plane should give it a residual`);
        assert.equal((await data1()).beta, before,
          `${where}: beta must not move when y slides along the residual`);

        // The step machine, by button and by scroll. Eight steps, so Next is
        // pressed until the stage says 8: each press scrolls a section into
        // view and the machine follows the scroll, so a press mid-glide can
        // land on the section the viewport is crossing rather than the next.
        for (let i = 0; i < 14; i++) {
          if (await page.evaluate(() => document.querySelector('#stage').dataset.step) === '8') break;
          await page.locator('#next').click();
          await page.waitForTimeout(350);
        }
        await page.waitForFunction(() =>
          document.querySelector('#stage').dataset.step === '8',
          null, {timeout: 5000})
          .catch(() => assert.fail(`${where}: Next did not reach the last step`));
        // Next scrolls the step into view, and the step machine follows the
        // scroll: for as long as that animation runs the stage is whatever
        // section the viewport's middle is crossing, which is a projection
        // step on the way past. Let it land before reading the mode off it.
        await page.waitForTimeout(600);
        assert.equal(await page.evaluate(() =>
          document.querySelector('#stage').dataset.step), '8',
          `${where}: the stage did not settle on step 8`);
        // #step-8 in the URL opens on that step.
        await page.goto(
          `${origin}${prefix}interactive/linalg-stage.html?lang=${lang}#step-8`);
        await page.waitForFunction(() =>
          document.querySelector('#stage').dataset.step === '8',
          null, {timeout: 8000})
          .catch(() => assert.fail(`${where}: #step-8 did not open on that step`));

        // The scene's own name opens it too: that is what the notebooks link
        // to, because it survives a reorder and a number does not.
        await page.goto(
          `${origin}${prefix}interactive/linalg-stage.html?lang=${lang}#portal`);
        await page.waitForFunction(() =>
          document.querySelector('#stage').dataset.step === '4',
          null, {timeout: 8000})
          .catch(() => assert.fail(`${where}: #portal did not open the SVD portal`));
        // The name is followed by a smooth scroll to the section, and the
        // step machine follows the scroll: on the way it may cross a step
        // that renders through the composer. Let it land before reading.
        await page.waitForTimeout(900);
        await page.waitForFunction(() =>
          document.querySelector('#stage').dataset.step === '4',
          null, {timeout: 5000})
          .catch(() => assert.fail(`${where}: the stage did not settle on the portal`));
        const mode4 = await page.evaluate(() =>
          document.querySelector('#stage').dataset.gl);
        assert(mode4 === 'direct' || mode4 === 'none',
          `${where}: the SVD portal renders two viewports, so it must not go through the composer; got '${mode4}'`);

        // A v = sigma u. Scrub x onto the first right singular vector and the
        // length of A x must be sigma_1 exactly.
        const deg = await page.evaluate(() => {
          const V = window.LinalgCore.svd([[3, 1.2], [0.4, 1]]).V;
          return Math.round(Math.atan2(V[1][0], V[0][0]) * 180 / Math.PI + 360) % 360;
        });
        await page.locator('#scrub').fill(String(deg));
        await page.waitForTimeout(150);
        const d = await page.evaluate(() => ({...document.querySelector('#stage').dataset}));
        assert.equal(d.aligned, '0', `${where}: x on v1 should register as aligned`);
        assert.equal(d.step, '4', `${where}: the portal is step 4`);
        // Compared with a tolerance rather than as strings: the scrub angle is
        // rounded to whole degrees, so |A x| lands near sigma_1 but not on it,
        // and string equality would flake for any matrix whose sigma_1 sat
        // close to a rounding boundary.
        const gap = Math.abs(Number(d.av) - Number(d.sigma.split(',')[0]));
        assert(gap < 5e-3,
          `${where}: |A v1| is ${d.av}, sigma_1 is ${d.sigma.split(',')[0]} (gap ${gap})`);

        // The remaining steps, each driven through its own controls and read off the
        // stage as numbers -- computed in-page through LinalgCore where a
        // reference value is needed, so the assertion is independent of the
        // page's own state. Every one of these is a claim the step makes in
        // prose; a wrong number here is a wrong claim on screen.
        const open = async (n) => {
          await page.goto(
            `${origin}${prefix}interactive/linalg-stage.html?lang=${lang}#step-${n}`);
          await page.waitForFunction((n) =>
            document.querySelector('#stage').dataset.step === String(n), n, {timeout: 8000})
            .catch(() => assert.fail(`${where}: #step-${n} did not open on that step`));
          await page.waitForTimeout(150);
        };
        const data = () => page.evaluate(() => ({...document.querySelector('#stage').dataset}));
        const settle = () => page.waitForTimeout(150);
        assert.equal(await page.locator('section.step').count(), 8, `${where}: eight steps`);
        assert.equal(await page.locator('#step-road').count(), 0,
          `${where}: the roadmap card should be gone now the steps exist`);
        // The bar shows one mark per step, and a mark is a way to jump.
        assert.equal(await page.locator('#dots .dot').count(), 8, `${where}: eight step marks`);
        await page.locator('#dots .dot').nth(3).click();
        await page.waitForFunction(() =>
          document.querySelector('#stage').dataset.step === '4', null, {timeout: 5000})
          .catch(() => assert.fail(`${where}: the fourth mark should open step 4`));
        assert.equal(await page.locator('#dots .dot[aria-current="step"]').count(), 1,
          `${where}: exactly one mark is current`);

        // Step 2: the sphere grazes the line at exactly the pseudoinverse's
        // norm, and ridge's answer is shorter than that.
        await open(2);
        const minnorm = await page.evaluate(() => {
          const LC = window.LinalgCore;
          return LC.norm(LC.mulVec(LC.pinv([[1, 2, 1], [2, -1, 1]]), [3, 1]));
        });
        await page.locator('#sphere').fill(String(Math.round(minnorm * 100)));
        await settle();
        let sd = await data();
        assert.equal(sd.grazing, '1', `${where}: the sphere at |x+| = ${minnorm} should graze the line`);
        assert(Math.abs(Number(sd.minnorm) - minnorm) < 2e-3, `${where}: |x+| is ${sd.minnorm}, expected ${minnorm}`);
        await page.locator('#lam').fill('70');
        await settle();
        sd = await data();
        assert(Number(sd.ridgenorm) < Number(sd.minnorm),
          `${where}: ridge (${sd.ridgenorm}) should be shorter than the min-norm solution (${sd.minnorm})`);
        assert(Number(sd.resid) > 0, `${where}: and no longer exact`);

        // Step 5: kappa is read off the assembled matrix and equals the
        // slider ratio; the third slider at its floor pushes it past 100.
        await open(5);
        await page.locator('#s3').fill('1');
        await settle();
        sd = await data();
        const sig = sd.sigma.split(',').map(Number);
        assert(Math.abs(Number(sd.kappa) - sig[0] / sig[2]) < 1e-2 * Number(sd.kappa),
          `${where}: kappa ${sd.kappa} should be sigma_1 / sigma_3 = ${sig[0] / sig[2]}`);
        assert(Number(sd.kappa) > 100, `${where}: kappa ${sd.kappa} should pass 100 at the floor`);

        // Step 3: the determinant reaches exactly zero and the rank drops.
        await open(3);
        sd = await data();
        assert.equal(sd.rank, '3', `${where}: the house starts full rank`);
        await page.locator('#flatten').fill('100');
        await settle();
        sd = await data();
        assert.equal(sd.det, '0.000', `${where}: det should reach zero, got ${sd.det}`);
        assert.equal(sd.rank, '2', `${where}: rank should drop to 2, got ${sd.rank}`);

        // Step 6: aim the test vector along the first eigenvector, computed
        // in-page, and the stage must report it aligned with x and M x
        // nearly parallel. Whole-degree sliders, so a few degrees of slack.
        await open(6);
        const aim = await page.evaluate(() => {
          const v = window.LinalgCore.eig3([[2.0, 1.0, 0.3], [0.2, 0.6, 0.2], [0.4, 0.3, 1.3]])[0].v;
          return [Math.round((Math.atan2(v[2], v[0]) * 180 / Math.PI + 360) % 360),
                  Math.round(Math.asin(v[1]) * 180 / Math.PI)];
        });
        await page.locator('#taz').fill(String(aim[0]));
        await page.locator('#tel').fill(String(aim[1]));
        await settle();
        sd = await data();
        assert.equal(sd.aligned, '0', `${where}: x on the first eigenvector should register as aligned`);
        assert(Number(sd.angle) < 4, `${where}: x and M x should be nearly parallel there, got ${sd.angle} degrees`);
        assert.equal(sd.eigen.split(',').length, 3, `${where}: three eigenvalues`);

        // Step 7: orthogonal columns are perfectly conditioned; half a degree
        // apart, kappa passes 100 and beta swings out and back.
        await open(7);
        sd = await data();
        assert(Math.abs(Number(sd.kappa) - 1) < 1e-2, `${where}: at 90 degrees kappa should be 1, got ${sd.kappa}`);
        await page.locator('#angle').fill('100');
        await settle();
        sd = await data();
        assert(Number(sd.kappa) > 100, `${where}: at half a degree kappa should pass 100, got ${sd.kappa}`);
        await page.locator('#noise').click();
        await settle();
        sd = await data();
        assert.equal(sd.perturbation, '0.02', `${where}: the nudge must be exactly 2%`);
        assert(Number(sd.betaChange) > 100, `${where}: nearly parallel columns amplify a 2% target change`);
        const b6 = sd.beta.split(',').map(Number);
        assert(Math.abs(b6[0]) > 1 && b6[0] * b6[1] < 0,
          `${where}: beta should be large with opposite signs, got ${sd.beta}`);

        // Step 8: at 10⁻⁵ degrees apart the float32 columns are distinct and
        // kappa is finite; at a millionth they round to one vector, kappa is
        // Infinity, and the fault overlay is up. Back at 10⁻⁵ degrees it is down.
        await open(8);
        sd = await data();
        assert.equal(sd.f32, 'distinct', `${where}: 10⁻⁵ degrees apart is two float32 columns`);
        assert(isFinite(Number(sd.kappa)), `${where}: and a finite kappa, got ${sd.kappa}`);
        assert(await page.locator('#fault').isHidden(), `${where}: no fault yet`);
        await page.locator('#angle7').fill('100');
        await settle();
        sd = await data();
        assert.equal(sd.f32, 'collapsed', `${where}: a millionth of a degree should round both columns together`);
        assert.equal(sd.kappa, 'Infinity', `${where}: kappa should be Infinity, got ${sd.kappa}`);
        assert(await page.locator('#fault').isVisible(), `${where}: the fault overlay should show`);
        await page.locator('#angle7').fill('0');
        await settle();
        assert(await page.locator('#fault').isHidden(), `${where}: and go when the columns part`);

        // The camera. Read off the stage as numbers rather than looked for in
        // pixels -- the same trade dataset.sigma makes for the singular values
        // -- and asserted whichever renderer is live, because the flat path
        // takes its screen basis from the same two angles the GL camera does.
        const stage = page.locator('#stage');
        const cam = () => stage.evaluate(e => e.dataset.cam);
        await page.goto(
          `${origin}${prefix}interactive/linalg-stage.html?lang=${lang}`);
        await page.waitForFunction(() =>
          document.querySelector('#stage').dataset.cam !== undefined,
          null, {timeout: 8000});
        const stageBox = await page.locator('#stage').boundingBox();
        const midX = stageBox.x + stageBox.width / 2;
        const midY = stageBox.y + stageBox.height / 2;
        // The pose Home has to restore, worked out the way the widget works it
        // out -- from step 1's camera through linalg-core -- rather than
        // sampled off the stage, which by now may be anywhere the idle drift
        // has taken it. Same trade as the matrix below: the numbers are typed
        // here so the assertion is independent of the page's own state.
        const homeCam = await page.evaluate(() => {
          const h = window.LinalgScenes.list()[0].pose.home;
          return `${h.az.toFixed(2)},${h.el.toFixed(2)},1.00`;
        });
        // Under the pointer the drift stands down, so what moves from here on
        // is the reader moving it.
        await page.mouse.move(midX, midY);
        await page.waitForTimeout(250);
        const restingCam = await cam();
        await page.mouse.down();
        await page.mouse.move(midX + 120, midY + 40, {steps: 8});
        await page.mouse.up();
        const draggedCam = await cam();
        assert(draggedCam !== restingCam,
          `${where}: a drag should turn the stage (${restingCam} -> ${draggedCam})`);
        await page.locator('#stage').click({position: {x: 24, y: 24}});
        await page.keyboard.press('ArrowLeft');
        assert(await cam() !== draggedCam,
          `${where}: the arrow keys should turn the stage`);
        await page.keyboard.press('Home');
        assert.equal(await cam(), homeCam,
          `${where}: Home should put the camera back where it started`);
        // The zoom buttons drive the same dolly the + and - keys do, and
        // the dolly is the third number in the stamp. Clicked from the page
        // rather than by the pointer: a pointer click would scroll the bar
        // into view, and the step a reader is on *is* the scroll position,
        // so the buttons would act on whichever step the scroll landed on.
        const dollyOf = c => Number(c.split(',')[2]);
        const press = id => page.evaluate(id => document.getElementById(id).click(), id);
        await press('zoom-in');
        assert(dollyOf(await cam()) < 1,
          `${where}: Zoom in should bring the camera closer (${await cam()})`);
        await press('zoom-out');
        await press('zoom-out');
        assert(dollyOf(await cam()) > 1,
          `${where}: Zoom out should move the camera away (${await cam()})`);
        await press('home');
        assert.equal(await cam(), homeCam,
          `${where}: the Home button should also reset the zoom`);

        // Under reduced motion there is no entrance to play, no glide into a
        // step and no drift: the camera holds still from the first frame.
        await page.emulateMedia({reducedMotion: 'reduce'});
        await page.goto(
          `${origin}${prefix}interactive/linalg-stage.html?lang=${lang}#step-4`);
        await page.waitForFunction(() =>
          document.querySelector('#stage').dataset.cam !== undefined,
          null, {timeout: 8000});
        const stillCam = await cam();
        await page.waitForTimeout(400);
        assert.equal(await cam(), stillCam,
          `${where}: under reduced motion the camera must not move on its own`);
        await page.emulateMedia({reducedMotion: 'no-preference'});
        await page.goto(
          `${origin}${prefix}interactive/linalg-stage.html?lang=${lang}`);
        await page.waitForFunction(() =>
          document.querySelector('#stage').dataset.cam !== undefined,
          null, {timeout: 8000});

        // Plain wheel zoom belongs to the frame; the page still scrolls
        // beside it, and modified wheel remains the browser's own zoom.
        await page.mouse.move(midX, midY);
        const scrolledFrom = await page.evaluate(() => scrollY);
        const beforeWheel = dollyOf(await cam());
        await page.mouse.wheel(0, 240);
        // Chrome on Linux animates a wheel scroll and eases the dolly over
        // frames the runner draws slowly, so poll for each outcome rather
        // than sleeping a fixed time and reading once.
        await page.waitForFunction(before =>
          Number(document.querySelector('#stage').dataset.cam.split(',')[2]) > before,
          beforeWheel, {timeout: 5000})
          .catch(() => assert.fail(`${where}: wheel out must zoom out`));
        assert.equal(await page.evaluate(() => scrollY), scrolledFrom,
          `${where}: wheel zoom must hold the current step`);
        await page.mouse.move(15, 100);
        await page.mouse.wheel(0, 400);
        await page.waitForFunction(from => scrollY > from, scrolledFrom, {timeout: 5000})
          .catch(() => assert.fail(`${where}: scrolling beside the stage must navigate the page`));

        // Every frame keeps a user dolly, and reset restores both example
        // controls and framing. Presets must leave their sliders in sync.
        for (let n = 1; n <= 8; n++) {
          await open(n);
          await press('home');
          await press('zoom-in');
          assert(dollyOf(await cam()) < 1, `${where}: step ${n} zooms in`);
          await press('zoom-out'); await press('zoom-out');
          assert(dollyOf(await cam()) > 1, `${where}: step ${n} zooms out`);
          const input = page.locator(`#step-${n} input[type=range]`).first();
          await input.fill(await input.getAttribute('max'));
          await press('reset');
          assert.equal(dollyOf(await cam()), 1, `${where}: step ${n} reset restores framing`);
          assert(await input.evaluate(e => e.value === e.defaultValue),
            `${where}: step ${n} reset restores the experiment`);
          if (n <= 6) {
            const presets = page.locator(`#step-${n} .presets button`);
            for (let j = 0; j < await presets.count(); j++) {
              await presets.nth(j).evaluate(e => e.click());
              assert(await page.locator(`#read-${n}`).innerText(), `${where}: preset has a readout`);
            }
          }
        }

        // The idle drift: the stage turns while nobody is pointing at it, and
        // is the reader's the moment they are. One language only -- it costs
        // real seconds and there is no copy in it -- and only where there is a
        // context to drift in, since the flat fallback draws when it is told
        // to rather than every frame. Polled rather than slept on, so a slow
        // runner makes this take longer and not fail.
        if (lang === 'en') {
          await page.goto(
            `${origin}${prefix}interactive/linalg-stage.html?lang=${lang}`);
          await page.waitForFunction(() =>
            document.querySelector('#stage').dataset.gl !== undefined,
            null, {timeout: 8000});
          await page.waitForTimeout(500);
          if (await stage.evaluate(e => e.dataset.gl) === 'none') {
            console.log(`  (${where}: no WebGL here, so there is nothing to drift)`);
          } else {
            const moves = async (ms) => {
              const first = await cam();
              const until = Date.now() + ms;
              while (Date.now() < until) {
                await page.waitForTimeout(80);
                if (await cam() !== first) return true;
              }
              return false;
            };
            await page.mouse.move(2, 2);
            assert(await moves(5000), `${where}: the stage should drift while idle`);
            await page.mouse.move(midX, midY);
            await page.waitForTimeout(200);
            assert(!await moves(900), `${where}: the drift must stop under the pointer`);
            await page.mouse.move(2, 2);
            assert(await moves(6000),
              `${where}: the drift should come back once the pointer leaves`);
            // Freeze a geometry tween too, not only the camera. The CSS2D
            // vector labels follow the rendered arrow tips in this scene.
            await page.locator('#tilt').fill('0');
            await page.waitForTimeout(500);
            await page.locator('#tilt').fill('600');
            await page.waitForTimeout(50);
            // Filling the slider scrolled it into view, and the stage is
            // sticky, so it is no longer where it was measured at load: hover
            // its centre as it is now, not `midY`, which the site nav above
            // the header pushed to just under the stuck frame.
            const stuck = await stage.boundingBox();
            await page.mouse.move(stuck.x + stuck.width / 2, stuck.y + stuck.height / 2);
            await page.waitForTimeout(50);
            const geometry = () => stage.locator('.mat-lab').evaluateAll(nodes =>
              nodes.map(e => [e.textContent, e.style.transform]));
            const held = await geometry();
            assert.equal(held.length, 2, `${where}: both vector labels must be present`);
            await page.waitForTimeout(350);
            assert.deepEqual(await geometry(), held, `${where}: hover must freeze geometry as well as drift`);
            await page.mouse.move(2, 2);
            await page.waitForTimeout(550);
            assert.notDeepEqual(await geometry(), held, `${where}: geometry resumes on pointer leave`);
            await press('motion');
            await page.waitForTimeout(50);
            const paused = await geometry();
            await page.waitForTimeout(250);
            assert.deepEqual(await geometry(), paused, `${where}: manual pause holds the view`);
            await press('motion');

          }
        }
      }

      async function driveVoice(page, where, lang) {
        await page.waitForFunction(() => document.getElementById('stage').dataset.ready === '1',
          null, {timeout: 20000});
        const stage = page.locator('#stage');
        const data = () => page.evaluate(() => ({...document.getElementById('stage').dataset}));
        assert.equal(await stage.getAttribute('data-standin'), '0',
          `${where}: fell back to the synthesised signal, so voice.wav did not load`);

        // The page opens on the sampling scene, which draws in three.js. As
        // for the projection stage, wait on the *modules* rather than on a
        // context: an addon missing from docs/ would drop the reader into the
        // twin and nothing else would notice. The render mode is advisory --
        // the composer where the runner has WebGL, the twin where it has not.
        assert.equal(await stage.getAttribute('data-scene'), 'sample');
        await page.waitForFunction(() => window.THREE_ADDONS !== undefined, null, {timeout: 12000})
          .catch(() => assert.fail(`${where}: the vendored three.js modules never loaded for the voice stage`));
        await page.waitForFunction(() => ['composer', 'none'].includes(
          document.getElementById('stage').dataset.gl), null, {timeout: 5000});
        const mode = (await data()).gl;
        if (mode === 'none') console.log(`  (${where}: no WebGL here, exercising the voice stage's twin)`);

        // Sampling: 48 numbers in a millisecond, and a lower rate keeps every
        // k-th. Read off data-*, which the readout writes from the controls'
        // targets rather than from the eased picture.
        assert.equal((await data()).rate, '48000');
        assert.equal((await data()).n, '237568', `${where}: the recording's length`);
        await page.locator('#c-sample-rate').fill('3');
        await page.waitForFunction(() => document.getElementById('stage').dataset.rate === '6000', null, {timeout: 5000});
        assert.equal((await data()).factor, '8');
        assert.equal((await data()).n, String(Math.ceil(237568 / 8)), `${where}: every 8th sample kept`);
        await page.locator('#c-sample-zoom').fill('100');
        await page.waitForFunction(() => document.getElementById('stage').dataset.span === '48', null, {timeout: 5000});
        assert.equal((await data()).inview, '6', `${where}: 1 ms at 6 kHz is six beads`);
        await page.locator('#c-sample-rate').fill('0');
        await page.waitForFunction(() => document.getElementById('stage').dataset.inview === '48', null, {timeout: 5000});

        // Quantization: 4 bits is 16 levels; fewer bits, a lower ratio; 16
        // bits moves nothing, because the WAV stores 16-bit integers.
        await voiceScene(page, 'quantize');
        assert.equal((await data()).levels, '16', `${where}: 4 bits is 16 levels`);
        const snr4 = Number((await data()).snr);
        await page.locator('#c-quantize-bits').fill('2');
        await page.waitForFunction(() => document.getElementById('stage').dataset.bits === '2', null, {timeout: 5000});
        assert.equal((await data()).levels, '4');
        assert(Number((await data()).snr) < snr4, `${where}: 2 bits should be noisier than 4`);
        await page.locator('#c-quantize-bits').fill('16');
        await page.waitForFunction(() => document.getElementById('stage').dataset.bits === '16', null, {timeout: 5000});
        assert.equal((await data()).snr, 'inf', `${where}: 16 bits must leave the recording exactly`);
        assert.equal((await data()).maxerr, '0.000e+0');

        // The array: its shape, and the bytes each dtype costs.
        await voiceScene(page, 'array');
        assert.equal((await data()).shape, '237568');
        assert.equal(await page.locator('#claim').textContent(), 'x.shape = (237568,)',
          `${where}: the array's claim card is not the length on the stage`);
        assert.equal((await data()).bytes, String(237568 * 4), `${where}: float32 bytes`);
        await page.selectOption('#c-array-dtype', 'int16');
        await page.waitForFunction(() => document.getElementById('stage').dataset.dtype === 'int16', null, {timeout: 5000});
        assert.equal((await data()).bytes, String(237568 * 2), `${where}: int16 bytes`);

        // The second built-in clip: same length, so the same shapes on every
        // scene. A beat.wav that never reached docs/ leaves the recording as
        // it was, which data-signal says.
        await page.selectOption('#builtin', 'beat');
        await page.waitForFunction(() => document.getElementById('stage').dataset.signal === 'beat', null, {timeout: 20000});
        assert.equal((await data()).standin, '0');
        assert.equal((await data()).shape, '237568', `${where}: the beat is cut to the voice's length`);

        // The third clip is arithmetic rather than a file: same length, same
        // shapes, and nothing fetched for it.
        await page.selectOption('#builtin', 'tone');
        await page.waitForFunction(() => document.getElementById('stage').dataset.signal === 'tone',
          null, {timeout: 10000});
        assert.equal((await data()).shape, '237568', `${where}: the tone is the voice's length`);
        assert.equal(await page.evaluate(() =>
          performance.getEntriesByType('resource').some(r => /tone\.wav/.test(r.name))), false,
          `${where}: the tone was fetched rather than synthesised`);
        await page.selectOption('#builtin', 'voice');
        await page.waitForFunction(() => document.getElementById('stage').dataset.signal === 'voice',
          null, {timeout: 20000});

        // The spectrogram scenes, on the beat and then back on the voice.
        await voiceScene(page, 'window');
        assert.equal(await stage.getAttribute('data-shape'), '513,465',
          `${where}: the recording's default shape`);
        await page.selectOption('#builtin', 'voice');
        await page.waitForFunction(() => document.getElementById('stage').dataset.signal === 'voice', null, {timeout: 20000});
        assert.equal(await stage.getAttribute('data-shape'), '513,465');
        assert.equal(await stage.getAttribute('data-padded'), '238592',
          `${where}: half a window of padding at each end`);
        assert.equal(await stage.getAttribute('data-overlap'), '512',
          `${where}: neighbouring windows share half of themselves`);

        // Halving the hop doubles the columns. This is the scene's predict
        // question, so it is the one number worth pinning.
        await page.selectOption('#c-window-overlap', 'quarter');
        await page.waitForFunction(() =>
          document.getElementById('stage').dataset.hop === '256', null, {timeout: 5000});
        const wide = await stage.getAttribute('data-shape');
        assert.equal(wide.split(',')[0], '513', `${where}: F should not move with the hop`);
        assert(Number(wide.split(',')[1]) > 900, `${where}: a quarter hop should roughly double T, got ${wide}`);
        // The claim card says the same arrow in numbers, and it is the scene's
        // to write: a card still reading (513, 465) here would contradict the
        // readout directly under it.
        assert.equal(await page.locator('#claim').textContent(),
          `x[n] \u2192 X[f, t],  (237568,) \u2192 (${wide.replace(',', ', ')})`,
          `${where}: the claim card did not follow the hop`);
        await page.selectOption('#c-window-overlap', 'half');

        // A tapered window that never overlaps leaves gaps the inverse cannot
        // fill, and the readout says so in red. The fault text is a teaching
        // claim, so its absence is a regression.
        await page.selectOption('#c-window-overlap', 'none');
        await page.waitForFunction(() =>
          document.getElementById('stage').dataset.hop === '1024', null, {timeout: 5000});
        assert.equal(await page.locator('#read-window .fault').count(), 1,
          `${where}: no warning about a tapered window with no overlap`);
        await page.selectOption('#c-window-win', 'rect');
        await page.waitForFunction(() =>
          document.querySelectorAll('#read-window .fault').length === 0, null, {timeout: 5000});
        await page.selectOption('#c-window-overlap', 'half');
        await page.selectOption('#c-window-win', 'hann');

        // The reshape scene. Square on purpose -- a transposed spectrogram is
        // only invertible back to sound when its axes are the same length --
        // and every layout holds the identical count.
        await voiceScene(page, 'scramble');
        assert.equal(await stage.getAttribute('data-shape'), '513,513', `${where}: not square`);
        assert.equal(await stage.getAttribute('data-square'), '1');
        const cells = await stage.getAttribute('data-cells');
        assert.equal(cells, '263169');
        for (const layout of ['transpose', 'patches', 'none']) {
          await page.selectOption('#c-scramble-layout', layout);
          await page.waitForFunction(want =>
            document.getElementById('stage').dataset.layout === want, layout, {timeout: 5000});
          assert.equal(await stage.getAttribute('data-cells'), cells,
            `${where}: ${layout} changed how many numbers there are`);
        }

        // data-ready and data-paused belong to the frame, not to a scene, so a
        // readout must not carry them off with it. Clearing the whole dataset
        // did exactly that, and it went unseen because the only check was the
        // one immediately after the goto above.
        assert.equal(await stage.getAttribute('data-ready'), '1',
          `${where}: a control change cleared data-ready`);
        // Fired from the page, never as a pointer click: the bar is below a
        // sticky stage in a scroller, and a click that scrolls it into view
        // moves the step machine onto another picture first.
        const bar = (id) => page.evaluate(b => document.getElementById(b).click(), id);
        await bar('motion');
        await page.waitForFunction(() =>
          document.getElementById('stage').dataset.paused === '1', null, {timeout: 5000});
        await page.selectOption('#c-scramble-layout', 'transpose');
        await page.waitForFunction(() =>
          document.getElementById('stage').dataset.layout === 'transpose', null, {timeout: 5000});
        assert.equal(await stage.getAttribute('data-paused'), '1',
          `${where}: a control change cleared data-paused`);
        await bar('motion');

        // One window, and the transform of it: the two pictures that stand
        // between a waveform and a matrix. What matters here is the
        // arithmetic a reader is asked to check -- how long a frame is, how
        // far apart the bins are, and that the mirror half is dropped.
        await voiceScene(page, 'frame');
        assert.equal((await data()).n, '1024');
        assert.equal(await page.locator('#claim').textContent(),
          'x\u209c[n] = x[t\u00b7H + n] \u00b7 w[n],  x\u209c.shape = (1024,)',
          `${where}: the frame's claim card is not in numbers`);
        assert.equal((await data()).ms, '21.3', `${where}: 1024 samples at 48 kHz`);
        assert.equal((await data()).reps, '47', `${where}: a 1024-sample frame repeats 47 times a second`);
        const tapered = Number((await data()).ends);
        await page.selectOption('#c-frame-win', 'rect');
        await page.waitForFunction(() => document.getElementById('stage').dataset.win === 'rect',
          null, {timeout: 5000});
        assert(Number((await data()).ends) > tapered * 1000,
          `${where}: a rectangular frame should not end near zero`);
        await page.selectOption('#c-frame-win', 'hann');

        await voiceScene(page, 'spectrum');
        assert.equal((await data()).bins, '513', `${where}: N/2 + 1 bins are kept at N = 1024`);
        assert.equal((await data()).binhz, '46.875', `${where}: 48000 / 1024 Hz a bin`);
        await page.locator('#c-spectrum-size').fill('3');
        await page.waitForFunction(() => document.getElementById('stage').dataset.n === '2048',
          null, {timeout: 5000});
        assert.equal((await data()).bins, '1025', `${where}: twice the window, twice the bins`);
        assert.equal((await data()).binhz, '23.438', `${where}: and half the spacing`);
        await page.locator('#c-spectrum-size').fill('2');
        // More components carry more of the frame's energy, by construction.
        await page.locator('#c-spectrum-k').fill('1');
        await page.waitForFunction(() => document.getElementById('stage').dataset.k === '1',
          null, {timeout: 5000});
        const one = Number((await data()).share);
        await page.locator('#c-spectrum-k').fill('64');
        await page.waitForFunction(() => document.getElementById('stage').dataset.k === '64',
          null, {timeout: 5000});
        assert(Number((await data()).share) > one,
          `${where}: 64 components should carry more energy than 1`);

        // Low rank: Appendix E, factored in the browser. The factorisation
        // and then the measuring ladder both run behind `busy`, so wait for
        // the phase the scene itself reports rather than a fixed pause.
        await voiceScene(page, 'lowrank');
        await page.waitForFunction(() => document.getElementById('stage').dataset.phase === 'ready',
          null, {timeout: 30000});
        assert.equal((await data()).shape, '513,465', `${where}: the recording's STFT shape`);
        assert(Math.abs(Number((await data()).noisy) - 5) < 0.1,
          `${where}: the noise was added at a measured 5 dB, got ${(await data()).noisy}`);
        await page.locator('#c-lowrank-rung').fill('0');
        await page.waitForFunction(() => document.getElementById('stage').dataset.k === '2',
          null, {timeout: 5000});
        const lowK = Number((await data()).retained);
        await page.locator('#c-lowrank-rung').fill('7');
        await page.waitForFunction(() => document.getElementById('stage').dataset.k === '465',
          null, {timeout: 5000});
        assert(Number((await data()).retained) > lowK,
          `${where}: full rank should retain more energy than rank 2`);
        // Both sides are the same reconstruction (full rank discards nothing),
        // measured through two independent snrDb() calls and printed through
        // two independent toFixed(2)s -- exact string equality asks floating
        // point for more than it owes. A hundredth of a decibel is well
        // inside that noise and well outside anything a real discrepancy
        // would produce.
        assert(Math.abs(Number((await data()).snr) - Number((await data()).noisy)) < 0.01,
          `${where}: full rank should measure the noisy input's SNR, got ${(await data()).snr} vs ${(await data()).noisy}`);
        await page.locator('#c-lowrank-rung').fill('4');
        await page.waitForFunction(() => document.getElementById('stage').dataset.k === '40',
          null, {timeout: 5000});
        await page.selectOption('#c-lowrank-hear', 'clean');
        await page.waitForFunction(() => document.getElementById('stage').dataset.phase === 'ready',
          null, {timeout: 5000});

        // Parts you can name: NMF fits behind `busy` too, then a constrained
        // minimum cannot beat the unconstrained SVD at the same rank -- the
        // whole claim, read off the two measured errors rather than assumed.
        await voiceScene(page, 'nmf');
        await page.waitForFunction(() => document.getElementById('stage').dataset.phase === 'ready',
          null, {timeout: 30000});
        assert.equal((await data()).shape, '513,465', `${where}: the same STFT shape as low rank`);
        assert(Number((await data()).nmferr) >= Number((await data()).svderr),
          `${where}: NMF (${(await data()).nmferr}%) must not beat the truncated SVD (${(await data()).svderr}%)`);
        await page.locator('#c-nmf-k').fill('4');
        await page.waitForFunction(() => document.getElementById('stage').dataset.k === '4',
          null, {timeout: 5000});
        await page.waitForFunction(() => document.getElementById('stage').dataset.phase === 'ready',
          null, {timeout: 30000});
        await page.selectOption('#c-nmf-solo', '4');
        await page.waitForFunction(() => document.getElementById('stage').dataset.solo === '4',
          null, {timeout: 5000});
        // Lowering k below the soloed component (4) is the trap the scene's
        // own restart() guards: the solo must fall back rather than name a
        // component this rank no longer has.
        await page.locator('#c-nmf-k').fill('2');
        await page.waitForFunction(() => document.getElementById('stage').dataset.k === '2',
          null, {timeout: 5000});
        await page.waitForFunction(() => document.getElementById('stage').dataset.phase === 'ready',
          null, {timeout: 30000});
        assert(Number((await data()).solo) <= 2,
          `${where}: soloing component 4 at k = 2 should have fallen back, got solo=${(await data()).solo}`);

        // What a model is handed: the three built-in recordings, transformed
        // and stacked. They are the same length by construction, so the
        // opening state stacks with nothing thrown away -- and the crop is
        // the only reason a loader has one at all.
        await voiceScene(page, 'batch');
        await page.waitForFunction(() => document.getElementById('stage').dataset.phase === 'ready',
          null, {timeout: 30000});
        const b0 = await data();
        assert.equal(b0.b, '3', `${where}: three built-in recordings in the batch, got ${b0.b}`);
        assert.equal(b0.c, '1', `${where}: the recordings are mono, so C is 1`);
        assert.equal(b0.f, '513', `${where}: the same F as every other transform scene`);
        assert.equal(b0.shape, '3,1,513,465', `${where}: the rank-4 shape, got ${b0.shape}`);
        assert.equal(b0.ragged, '0', `${where}: three equal-length recordings are not ragged`);
        // The crop is the axis the badge has to follow: T moves, nothing else does.
        await page.locator('#c-batch-crop').fill('200');
        await page.waitForFunction(() => document.getElementById('stage').dataset.t === '200',
          null, {timeout: 5000});
        const b1 = await data();
        assert.equal(b1.shape, '3,1,513,200', `${where}: only T moves with the crop, got ${b1.shape}`);
        assert.equal(await stage.getAttribute('data-tensorshape'), '[3, 1, 513, 200]',
          `${where}: the shape badge did not follow the crop`);

        // The badge is the frame's, and it says a different shape on every
        // picture -- a rank-1 array here, a matrix there.
        await voiceScene(page, 'array');
        assert.equal(await stage.getAttribute('data-tensorshape'), '[237568]',
          `${where}: the array's badge is the recording's length`);
        await voiceScene(page, 'window');
        assert.equal(await stage.getAttribute('data-tensorshape'), '[513, 465]',
          `${where}: the hop scene's badge is the matrix it builds`);

        // The spectrogram is one matrix product, and the page says so in
        // MathML on three sections. The counts come from AC.stftCost, so a
        // change to the transform cannot leave the arithmetic on the page
        // saying what it used to.
        await voiceScene(page, 'frame');
        const fr = await data();
        assert.equal(fr.frames, '465', `${where}: the frames matrix has 465 columns`);
        assert.equal(fr.stride, '512', `${where}: column t starts 512 samples along`);
        assert.equal(fr.reshape, '0', `${where}: at hop = N/2 the columns overlap, so it is a copy`);
        assert.equal(fr.fshape, '1024,465', `${where}: the frames matrix's shape`);
        await voiceScene(page, 'spectrum');
        const sp = await data();
        assert.equal(sp.dftrows, '513', `${where}: the rows of F the transform keeps`);
        assert.equal(sp.dftcols, '1024', `${where}: one row of F is N samples long`);
        assert.equal(sp.matmul, '244270080', `${where}: F N T multiply-adds by matrix product`);
        assert.equal(sp.fftops, '4761600', `${where}: T N log2(N) by transform`);
        await voiceScene(page, 'window');
        const wi = await data();
        assert.equal(wi.matmul, '244270080', `${where}: the two scenes must cost the same product`);
        assert.equal(wi.fftops, '4761600');
        assert.equal(wi.speedup, '51.3', `${where}: the ratio the hop scene prints`);
        assert.equal(wi.contract, 'n', `${where}: n is the axis that disappears`);

        // Pointing at a letter in the equation bands the axis it names. The
        // hover is published as data-hl and must never disturb the readout,
        // which is written from the controls alone.
        //
        // Every selector here is scoped to its own section. `freq` and
        // `samp` now appear in four sections between them, and a document-
        // global `.first()` picked the topmost one, scrolled the step
        // machine away from the scene under test, and left the readout
        // assertion comparing a section nobody was looking at.
        const readBefore = await page.locator('#read-window').innerHTML();
        await page.locator('#eqcap-window').scrollIntoViewIfNeeded();
        await page.locator('#step-window .eq [data-hl="freq"]').first().hover();
        await page.waitForFunction(() => document.getElementById('stage').dataset.hl === 'freq',
          null, {timeout: 5000});
        // Keyboard reaches it too: these are focusable for exactly that reason.
        await page.locator('#step-window .eq [data-hl="time"]').first().focus();
        await page.waitForFunction(() => document.getElementById('stage').dataset.hl === 'time',
          null, {timeout: 5000});
        assert.equal(await page.locator('#read-window').innerHTML(), readBefore,
          `${where}: a hover rewrote the readout, which is the controls' to write`);
        await page.locator('#step-window .eq [data-hl="time"]').first().blur();
        await page.waitForFunction(() => !document.getElementById('stage').dataset.hl,
          null, {timeout: 5000});
        // And the new letters light on their own section, not on the one
        // that happens to be first in the document.
        await voiceScene(page, 'spectrum');
        await page.locator('#step-spectrum .eq [data-hl="samp"]').first().hover();
        await page.waitForFunction(() => document.getElementById('stage').dataset.hl === 'samp',
          null, {timeout: 5000});
        await page.locator('#step-spectrum .eq [data-hl="samp"]').first().blur();

        // Linking by scene name, never by an index that moves on a reorder.
        // A page opened on a spectrogram scene must not fetch three.js: the
        // import map is inert until a module resolves, and the boot only
        // runs for a three.js scene. The query differs from the page already
        // open, because a goto that changes only the hash does not reload.
        await page.goto(`${origin}${prefix}interactive/voice-stage.html?lang=${lang}&fresh=1#scramble`);
        await page.waitForFunction(() =>
          document.getElementById('stage').dataset.scene === 'scramble', null, {timeout: 20000});
        assert.equal(await page.evaluate(() => window.THREE), undefined,
          `${where}: a spectrogram scene fetched three.js`);
      }

      // The widgets, and the order the drive* functions above are written
      // in. Keep the two in step: with six of them a reader looking for one
      // callback has nothing else to go on.
      const widgets = [
        {file: 'tensor-visualizer', en: 'The image tensor',
         es: 'El tensor de imagen', embed: true, drive: driveVisualizer},
        {file: 'broadcasting-simulator', en: 'Broadcasting, step by step',
         es: 'Broadcasting, paso a paso', embed: true, drive: driveBroadcasting},
        // Its embed mode is the softmax scene, flat and still: no scroller,
        // and -- unlike every other widget here -- nothing to fetch at all.
        {file: 'attention-stage', en: 'Attention as two contractions',
         es: 'La atención como dos contracciones', embed: true, drive: driveAttention},
        // Its embed mode is the portal's still frame -- no scroller, no
        // three.js -- which is the third hero tab below.
        {file: 'linalg-stage', en: 'Projection and the SVD',
         es: 'Proyecci\u00f3n y la SVD', embed: true, drive: driveStage},
        // Its embed mode draws the same scene from a synthesised stand-in
        // rather than fetching half a megabyte of audio onto the homepage,
        // which is the fourth hero tab below.
        {file: 'voice-stage', en: 'The audio tensor',
         es: 'El tensor de audio', embed: true, drive: driveVoice}
      ];
      widgetCount = widgets.length;
      for (const widget of widgets) {
        console.log(`Checking ${widget.file}`);
        for (const lang of ['en', 'es']) {
          const where = `${widget.file} ${lang}`;
          await page.goto(
            `${origin}${prefix}interactive/${widget.file}.html?lang=${lang}`);
          assert.equal(await page.locator('html').getAttribute('lang'), lang);
          assert.equal(await page.locator('#title').innerText(), widget[lang]);
          // The way back to the site, in the page's language, from the frame
          // every widget shares (interactive/widget-chrome.css).
          const home = page.locator('header .site-nav a.site-home');
          assert.equal(await home.count(), 1, `${where}: one home link`);
          assert.equal(await home.getAttribute('href'), lang === 'es' ? '../es/index.html' : '../index.html',
            `${where}: home link points at the ${lang} homepage`);
          assert.equal(await page.locator('header .site-nav a#site-notebooks').getAttribute('href'),
            lang === 'es' ? '../es/notebooks.html' : '../notebooks.html', `${where}: notebooks link`);
          await widget.drive(page, where, lang);

          for (const width of [1440, 390]) {
            await page.setViewportSize({width, height: 1000});
            const fits = await page.evaluate(() =>
              document.documentElement.scrollWidth <= innerWidth + 1);
            assert(fits, `${where}: horizontal overflow at ${width}`);
          }
          await audit(page, where);

          if (widget.file === 'linalg-stage') {
            // Deliberately lose the GL module: all eight flat scenes must
            // retain their controls, finite geometry, zoom and teaching data.
            await page.route('**/vendor/linalg-boot.js', route => route.abort());
            await page.emulateMedia({reducedMotion: 'reduce'});
            for (let n = 1; n <= 8; n++) {
              await page.goto(`${origin}${prefix}interactive/linalg-stage.html?lang=${lang}&fallback-check=1#step-${n}`);
              await page.waitForFunction(n => document.querySelector('#stage').dataset.step === String(n), n);
              await page.waitForFunction(() => !document.querySelector('#glnote').hidden);
              assert.equal(await page.locator('#stage').getAttribute('data-gl'), 'none');
              const svg = page.locator('#flat');
              const beforeZoom = await svg.innerHTML();
              assert(!/NaN|Infinity/.test(beforeZoom), `${where}: flat step ${n} has finite geometry`);
              await page.locator('#zoom-in').evaluate(e => e.click());
              assert.notEqual(await svg.innerHTML(), beforeZoom, `${where}: flat step ${n} actually zooms`);
              await page.locator('#reset').evaluate(e => e.click());
              if (n === 1) assert((await page.locator('#labels').innerText()).includes('O (0, 0, 0)'));
              if (n === 2 || n === 3) assert(await svg.locator('line').count() > 30, `${where}: step ${n} has grid rulings`);
              if (n === 7) {
                await page.locator('#noise').evaluate(e => e.click());
                await page.locator('#parallel').evaluate(e => e.click());
                assert(Number(await page.locator('#stage').getAttribute('data-beta-change')) > 100);
              }
              if (n === 8) {
                await page.locator('#merged').evaluate(e => e.click());
                assert.equal(await page.locator('#stage').getAttribute('data-f32'), 'collapsed');
              }
              if ([1, 7, 8].includes(n)) await audit(page, `${where} flat step ${n}`);
            }
            await page.unroute('**/vendor/linalg-boot.js');
            await page.emulateMedia({reducedMotion: 'no-preference'});
          }
          if (widget.file === 'voice-stage') {
            // Lose the GL module: the three opening scenes must draw their
            // twin, keep their controls and their teaching numbers.
            await page.route('**/vendor/linalg-boot.js', route => route.abort());
            await page.emulateMedia({reducedMotion: 'reduce'});
            for (const scene of ['sample', 'quantize', 'array']) {
              await page.goto(`${origin}${prefix}interactive/voice-stage.html?lang=${lang}&fallback-check=1#${scene}`);
              await page.waitForFunction(id => document.getElementById('stage').dataset.scene === id, scene);
              await page.waitForFunction(() => document.getElementById('stage').dataset.ready === '1', null, {timeout: 20000});
              await page.waitForFunction(() => !document.getElementById('glnote').hidden, null, {timeout: 10000});
              assert.equal(await page.locator('#stage').getAttribute('data-gl'), 'none');
              assert(await page.locator('#draw').isVisible(), `${where}: twin ${scene} is not on the stage`);
              // One readout per section: the scroller has nine of them.
              const readout = await page.locator(`#read-${scene}`).innerText();
              assert(!/NaN|Infinity|undefined/.test(readout), `${where}: twin ${scene} readout: ${readout}`);
              if (scene === 'sample') {
                await page.locator('#c-sample-zoom').fill('100');
                await page.waitForFunction(() => document.getElementById('stage').dataset.span === '48');
              }
              if (scene === 'quantize') {
                await page.locator('#c-quantize-bits').fill('3');
                await page.waitForFunction(() => document.getElementById('stage').dataset.levels === '8');
              }
              await audit(page, `${where} twin ${scene}`);
            }
            await page.unroute('**/vendor/linalg-boot.js');
            await page.emulateMedia({reducedMotion: 'no-preference'});
          }

          // Embed mode is what the homepage hero shows: stage and caption
          // only, no three.js, on the band's navy. Only for the widgets the
          // hero actually carries.
          if (!widget.embed) continue;
          await page.goto(
            `${origin}${prefix}interactive/${widget.file}.html?lang=${lang}&embed=1&theme=navy`);
          await page.waitForSelector('#embedcap b');
          // The way out is the hero's own button, not a link in the caption.
          assert.equal(await page.locator('#embedcap a').count(), 0, `${where} embed: link in the caption`);
          assert(await page.locator('aside').isHidden(), `${where} embed: panel shown`);
          assert(await page.locator('header').isHidden(), `${where} embed: header shown`);
          assert.equal(await page.locator('html').getAttribute('data-theme'), 'navy');
          if (widget.file === 'tensor-visualizer') {
            await page.waitForFunction(() =>
              document.querySelector('#stage').dataset.photos === '3', null, {timeout: 10000});
            assert.equal(await page.evaluate(() => window.THREE), undefined,
              `${where} embed: three.js must not be fetched on the front door`);
          } else if (widget.file === 'attention-stage') {
            // No three.js and no sound anywhere on this stage, so its embed
            // fetches nothing at all beyond the page's own scripts and CSS --
            // stricter than every other widget here, which is what this
            // asserts: zero resource entries that are not this page's own
            // code or styling.
            await page.waitForFunction(() =>
              document.getElementById('stage').dataset.ready === '1', null, {timeout: 10000});
            assert.equal(await page.locator('#stage').getAttribute('data-scene'), 'softmax',
              `${where} embed: the hero gets the softmax scene`);
            assert(await page.locator('.steps').isHidden(), `${where} embed: scroller shown`);
            const fetched = await page.evaluate(() =>
              performance.getEntriesByType('resource')
                .map(e => e.name)
                .filter(n => !/\.(js|css)(\?|$)/.test(n)));
            assert.equal(fetched.length, 0,
              `${where} embed: fetched something that is not code or CSS: ${fetched.join(', ')}`);
            assert.equal(await page.evaluate(() => window.THREE), undefined,
              `${where} embed: three.js must not be fetched on the front door`);
          } else if (widget.file === 'linalg-stage') {
            // The portal, drawn flat: the scroller and its steps are gone,
            // and three.js is never fetched for a hero tab either.
            await page.waitForFunction(() => document.querySelector('#flat').childElementCount > 0);
            assert.equal(await page.locator('#stage').getAttribute('data-gl'), 'none');
            assert.equal(await page.locator('#stage').getAttribute('data-scene'), 'portal',
              `${where} embed: the hero gets the SVD portal`);
            assert(await page.locator('.steps').isHidden(), `${where} embed: scroller shown`);
            assert.equal(await page.evaluate(() => window.THREE), undefined,
              `${where} embed: three.js must not be fetched on the front door`);
          } else if (widget.file === 'voice-stage') {
            // The hero draws this scene from a synthesised stand-in. Half a
            // megabyte of audio is not what a landing page is worth, and an
            // AudioContext built here would be a suspended one nobody asked
            // for -- so both must be absent, and `data-standin` is the stage
            // saying which signal it used.
            await page.waitForFunction(() =>
              document.querySelector('#stage').dataset.ready === '1', null, {timeout: 20000});
            assert.equal(await page.locator('#stage').getAttribute('data-standin'), '1',
              `${where} embed: the hero fetched the recording`);
            const fetched = await page.evaluate(() =>
              performance.getEntriesByType('resource').some(e => e.name.includes('voice.wav')));
            assert.equal(fetched, false, `${where} embed: voice.wav requested on the front door`);
            assert(await page.locator('.steps').isHidden(), `${where} embed: the scroller is shown`);
            assert(await page.locator('#timeline').isHidden(), `${where} embed: the timeline is shown`);
            assert.equal(await page.locator('#stage').getAttribute('data-playing'), '0');
            assert.equal(await page.locator('#stage').getAttribute('data-scene'), 'window',
              `${where} embed: the hero gets the spectrogram scene`);
            assert.equal(await page.evaluate(() => window.THREE), undefined,
              `${where} embed: three.js must not be fetched on the front door`);
            assert(await page.locator('.source').isHidden(), `${where} embed: the drop zone is shown`);
            // The badge goes with the readout: the hero is a teaser, and at
            // 330px a chip on the stage is what pushes the page sideways.
            assert(await page.locator('#shapebadge').isHidden(),
              `${where} embed: the shape badge is shown on the front door`);
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

      // The hero carries every widget live, behind one tab each, in the page's
      // own language. The static diagram is the fallback and must still be
      // in the document for reduced motion and phones. The count is pinned
      // because a widget added to `repo.widgets` and not to the hero is the
      // failure this catches -- the attention stage shipped invisible from
      // the front door for exactly that reason.
      for (const lang of ['en', 'es']) {
        console.log(`Checking the hero demos (${lang})`);
        await page.goto(`${origin}${prefix}${lang === 'es' ? 'es/' : ''}index.html`);
        const frames = page.locator('iframe.hero-embed');
        assert.equal(await frames.count(), 5, `${lang}/index: five hero embeds`);
        // Only the open tab's widget is fetched. A hidden iframe is not
        // lazy-loaded whatever `loading` says, so the others hold their URL
        // in data-src until the tab script hands it over.
        const urls = await frames.evaluateAll(els =>
          els.map(e => [e.getAttribute('src'), e.getAttribute('data-src')]));
        for (const [src, deferred] of urls) {
          const url = src || deferred;
          assert(url && url.includes(`lang=${lang}`) && url.includes('embed=1') && url.includes('theme=navy'),
            `${lang}/index: hero embed src ${url}`);
        }
        assert.equal(urls.filter(([src]) => src).length, 1,
          `${lang}/index: only the open tab's widget is loaded`);
        assert(await page.locator('.hero-visual.has-js').count() === 1, `${lang}/index: tab script did not run`);
        // One way out to the full widget, outside the frames, in one place:
        // it follows the open tab rather than moving with each widget's own
        // caption.
        const open = page.locator('.hero-open');
        assert.equal(await open.count(), 1, `${lang}/index: one open-the-widget button`);
        assert(await open.isVisible(), `${lang}/index: open-the-widget button hidden`);
        assert((await open.getAttribute('href')).includes(`tensor-visualizer.html?lang=${lang}`),
          `${lang}/index: open button starts on the first tab`);
        assert(await page.locator('#hero-panel-layout').isVisible());
        assert(await page.locator('#hero-panel-broadcast').isHidden());
        assert(await page.locator('#hero-panel-linalg').isHidden());
        assert(await page.locator('#hero-panel-voice').isHidden());
        assert(await page.locator('#hero-panel-attention').isHidden());
        await page.locator('#hero-tab-broadcast').click();
        assert(await page.locator('#hero-panel-broadcast').isVisible(), `${lang}/index: broadcasting tab`);
        assert(await page.locator('#hero-panel-layout').isHidden());
        assert(await page.locator('#hero-panel-broadcast iframe').getAttribute('src'),
          `${lang}/index: broadcasting embed not loaded on opening its tab`);
        assert((await open.getAttribute('href')).includes(`broadcasting-simulator.html?lang=${lang}`),
          `${lang}/index: open button did not follow the tab`);
        await page.locator('#hero-tab-linalg').click();
        assert(await page.locator('#hero-panel-linalg').isVisible(), `${lang}/index: linear algebra tab`);
        assert(await page.locator('#hero-panel-broadcast').isHidden());
        const stageFrame = page.locator('#hero-panel-linalg iframe');
        assert(await stageFrame.getAttribute('src'),
          `${lang}/index: stage embed not loaded on opening its tab`);
        // data-src is spent, which is what stops a second visit to the tab
        // reassigning src and reloading the widget from scratch.
        assert.equal(await stageFrame.getAttribute('data-src'), null,
          `${lang}/index: reopening a tab would reload its widget`);
        await page.locator('#hero-tab-voice').click();
        assert(await page.locator('#hero-panel-voice').isVisible(), `${lang}/index: voice tab`);
        assert(await page.locator('#hero-panel-linalg').isHidden());
        assert(await page.locator('#hero-panel-voice iframe').getAttribute('src'),
          `${lang}/index: voice embed not loaded on opening its tab`);
        assert((await open.getAttribute('href')).includes(`voice-stage.html?lang=${lang}`),
          `${lang}/index: open button did not follow the voice tab`);
        await page.locator('#hero-tab-attention').click();
        assert(await page.locator('#hero-panel-attention').isVisible(), `${lang}/index: attention tab`);
        assert(await page.locator('#hero-panel-voice').isHidden());
        assert(await page.locator('#hero-panel-attention iframe').getAttribute('src'),
          `${lang}/index: attention embed not loaded on opening its tab`);
        assert((await open.getAttribute('href')).includes(`attention-stage.html?lang=${lang}`),
          `${lang}/index: open button did not follow the attention tab`);
        assert.equal(await page.locator('.hero-fallback svg.hero-diagram').count(), 1);
        await page.setViewportSize({width: 390, height: 1000});
        assert(await page.locator('.hero-fallback').isVisible(), `${lang}/index: diagram fallback on a phone`);
        assert(await page.locator('.hero-demos').isHidden(), `${lang}/index: embeds hidden on a phone`);
        // Loaded on a phone, where the diagram replaces the demos outright:
        // no widget is fetched at all, since a display:none iframe would be.
        await page.reload();
        assert.equal(await frames.evaluateAll(els => els.filter(e => e.getAttribute('src')).length), 0,
          `${lang}/index: a widget was fetched behind the diagram fallback`);
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
      `Passed: ${pages.length * 2} pages at desktop/mobile widths, ${anchors} section switches, keyboard navigation, disclosures, slide links, fallbacks, ${widgetCount} interactive widgets, both stages' idle drift, the SVD stage's camera under a drag, the arrow keys and Home, the SVD portal's A v = sigma u, and axe on every page and widget.`);
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
