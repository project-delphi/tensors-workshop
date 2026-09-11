// Render first. Requires Playwright and its Chromium browser (see CONTRIBUTING).
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const root = path.resolve(__dirname, '../docs');
const screenshots = process.env.SCREENSHOT_DIR || require('node:os').tmpdir();
const prefix = '/tensors-workshop/';
const types = {'.html':'text/html', '.js':'text/javascript', '.css':'text/css',
  '.json':'application/json', '.svg':'image/svg+xml', '.png':'image/png', '.woff2':'font/woff2'};
const pages = ['index', 'notebooks', 'kahoot', 'references', 'companion', 'teach',
  'faq', 'facilitator-guide', 'assessments', 'worked-mistakes', 'group-tasks',
  'workshop-feedback', 'tensors_workshop_plan_with_quizzes'];

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
        assert.equal(await page.locator('main details').getAttribute('open'), null);
        await page.locator('main summary').click();
        assert.notEqual(await page.locator('main details').getAttribute('open'), null);
        await page.screenshot({path: path.join(screenshots, `workshop-assessment-es-${width}.png`), fullPage: true});
        if (width === 390) await page.locator('.navbar-toggler').click();
        await page.locator('nav a[rel="lang-switch-en"]').focus();
        await page.keyboard.press('Enter');
        await page.waitForURL('**/assessments.html#exit-5-minutes');
      }

      // The wide handbook table is a focusable scroll region on a phone.
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
    console.log(process.argv.includes('--slides-only') ? 'Slide links passed.' :
      `Passed: 26 pages at desktop/mobile widths, ${anchors} section switches, keyboard navigation, disclosures, slide links and fallbacks.`);
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
