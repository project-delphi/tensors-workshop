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

// The accessibility pass. axe runs over every page and all three widgets, and a
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
            await page.mouse.move(midX, midY);
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

      const widgets = [
        {file: 'tensor-visualizer', en: 'Reshape, transpose and strides',
         es: 'Reshape, transpose y strides', embed: true, drive: driveVisualizer},
        {file: 'broadcasting-simulator', en: 'Broadcasting, step by step',
         es: 'Broadcasting, paso a paso', embed: true, drive: driveBroadcasting},
        // Its embed mode is the portal's still frame -- no scroller, no
        // three.js -- which is the third hero tab below.
        {file: 'linalg-stage', en: 'Projection and the SVD',
         es: 'Proyecci\u00f3n y la SVD', embed: true, drive: driveStage}
      ];
      for (const widget of widgets) {
        console.log(`Checking ${widget.file}`);
        for (const lang of ['en', 'es']) {
          const where = `${widget.file} ${lang}`;
          await page.goto(
            `${origin}${prefix}interactive/${widget.file}.html?lang=${lang}`);
          assert.equal(await page.locator('html').getAttribute('lang'), lang);
          assert.equal(await page.locator('#title').innerText(), widget[lang]);
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

          // Embed mode is what the homepage hero shows: stage and caption
          // only, no three.js, on the band's navy. Only for the widgets the
          // hero actually carries.
          if (!widget.embed) continue;
          await page.goto(
            `${origin}${prefix}interactive/${widget.file}.html?lang=${lang}&embed=1&theme=navy`);
          await page.waitForSelector('#embedcap a');
          assert(await page.locator('aside').isHidden(), `${where} embed: panel shown`);
          assert(await page.locator('header').isHidden(), `${where} embed: header shown`);
          assert.equal(await page.locator('html').getAttribute('data-theme'), 'navy');
          if (widget.file === 'tensor-visualizer') {
            await page.waitForFunction(() =>
              document.querySelector('#stage').dataset.photos === '3', null, {timeout: 10000});
            assert.equal(await page.evaluate(() => window.THREE), undefined,
              `${where} embed: three.js must not be fetched on the front door`);
          } else if (widget.file === 'linalg-stage') {
            // The portal, drawn flat: the scroller and its steps are gone,
            // and three.js is never fetched for a hero tab either.
            await page.waitForFunction(() => document.querySelector('#flat').childElementCount > 0);
            assert.equal(await page.locator('#stage').getAttribute('data-gl'), 'none');
            assert.equal(await page.locator('#stage').getAttribute('data-step'), '4');
            assert(await page.locator('.steps').isHidden(), `${where} embed: scroller shown`);
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

      // The hero carries all three widgets live, behind three tabs, in the page's
      // own language. The static diagram is the fallback and must still be
      // in the document for reduced motion and phones.
      for (const lang of ['en', 'es']) {
        console.log(`Checking the hero demos (${lang})`);
        await page.goto(`${origin}${prefix}${lang === 'es' ? 'es/' : ''}index.html`);
        const frames = page.locator('iframe.hero-embed');
        assert.equal(await frames.count(), 3, `${lang}/index: three hero embeds`);
        // Only the open tab's widget is fetched. A hidden iframe is not
        // lazy-loaded whatever `loading` says, so the other two hold their URL
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
        assert(await page.locator('#hero-panel-layout').isVisible());
        assert(await page.locator('#hero-panel-broadcast').isHidden());
        assert(await page.locator('#hero-panel-linalg').isHidden());
        await page.locator('#hero-tab-broadcast').click();
        assert(await page.locator('#hero-panel-broadcast').isVisible(), `${lang}/index: broadcasting tab`);
        assert(await page.locator('#hero-panel-layout').isHidden());
        assert(await page.locator('#hero-panel-broadcast iframe').getAttribute('src'),
          `${lang}/index: broadcasting embed not loaded on opening its tab`);
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
      `Passed: ${pages.length * 2} pages at desktop/mobile widths, ${anchors} section switches, keyboard navigation, disclosures, slide links, fallbacks, all three interactive widgets, both stages' idle drift, the SVD stage's camera under a drag, the arrow keys and Home, the SVD portal's A v = sigma u, and axe on every page and widget.`);
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
