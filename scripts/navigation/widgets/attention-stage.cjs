// Attention, from words to weights (sections 04/06/Appendix B). Ten scenes,
// no three.js and no sound, so what only this one can check is the
// arithmetic behind each claim, read off #stage's data-* the way the
// projection stage's checks do -- computed in-page through AttentionCore
// where a reference value is needed, so the assertion is independent of the
// page's own state.
const assert = require('node:assert/strict');

const en = 'Attention, from words to weights';
const es = 'La atención, de las palabras a los pesos';

async function drive(ctx, page, where, lang) {
  await page.waitForFunction(() => document.getElementById('stage').dataset.ready === '1',
    null, {timeout: 10000});
  // The opening picture draws itself in (movesOnLoad() checks that it
  // moves); every measurement here is of the picture at rest.
  await page.waitForFunction(() => !('arriving' in document.getElementById('stage').dataset),
    null, {timeout: 10000})
    .catch(() => assert.fail(`${where}: the entrance never finished`));
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
    // Wait for the scrolling to stop before believing anything the
    // stage says. This is a scroller: the hash scrolls the section into
    // view and the step machine follows the scroll, so the stage passes
    // through pictures on the way and `data-scene` can read the
    // destination for a frame while the rest of the dataset is still
    // the scene it is leaving. On this Mac that window is too small to
    // hit; on the Linux runner it read `data-shape` as `4,8` -- the
    // tokens scene's shape -- inside the heads assertions. The audio
    // stage's voiceScene() has waited like this from the start.
    await page.waitForFunction(() => new Promise(done => {
      const was = window.scrollY;
      setTimeout(() => done(window.scrollY === was), 250);
    }), null, {timeout: 15000});
    await page.waitForFunction((name) =>
      document.getElementById('stage').dataset.scene === name, id, {timeout: 8000})
      .catch(() => assert.fail(`${where}: #${id} did not open that scene`));
    await fits(id);
  };
  // Poll the attribute the control is expected to move, never a fixed
  // wait: 80 ms was long enough on a Mac and short on the Linux runner,
  // where this read `4,8` -- the shape before the split -- and failed
  // only in CI. AGENTS.md states the rule; this is what it looks like.
  const settled = (key, want) => page.waitForFunction(
    ([k, v]) => document.getElementById('stage').dataset[k] === v,
    [key, want], {timeout: 8000}).catch(() => assert.fail(
      `${where}: data-${key} never reached ${want}`));
  // Every call below polls the control's own readback -- `data-scale`,
  // `data-order`, `data-merge` -- rather than the value under test.
  // Three of the keys a reader would reach for first (`halves`,
  // `merged`, `shape` on the middle scenes) are constants the scene
  // prints to *state* an invariant, so waiting on one would return
  // immediately and prove nothing.
  const changedTo = (key, want) => settled(key, want);

  // words: the tokenizer sets S -- four words, fifteen characters.
  await open('words');
  let d = await data();
  assert.equal(d.s, '4');
  assert.equal(d.tokens, 'I|know|you|know');
  await page.selectOption('#c-words-split', 'chars');
  await changedTo('split', 'chars');
  assert.equal((await data()).s, '15');
  await fits('words, split into characters');

  // ids: the vocabulary lookup gives exactly the stage's ids.
  await open('ids');
  d = await data();
  assert.equal(d.ids, '3,1,4,1');
  assert.equal(d.vocab, '6');

  // embed: the gather, byte-exact, and the repeated word is a repeated row.
  await open('embed');
  d = await data();
  assert.equal(d.s, '4'); assert.equal(d.d, '8');
  assert.equal(d.shape, '4,8');
  assert.equal(d.ids, '3,1,4,1');
  assert.equal(d.repeat, '1');
  assert.equal(await page.locator('#claim').textContent(), 'X = E[ids],  X.shape = (4, 8)',
    `${where}: embed claim is not byte-exact`);

  // project: one head's 3 x 8 x 4 = 96 parameters make Q, K and V, and
  // every dot product is an integer -- the legibility contract the seed
  // keeps.
  await open('project');
  d = await data();
  assert.equal(d.wparams, '96');
  assert.equal(d.integer, '1');

  // scores: the contraction is over d, the legibility contract makes
  // every unscaled score exactly double its scaled counterpart, and
  // sqrt(D_k) = 2 always halves.
  await open('scores');
  d = await data();
  assert.equal(d.contract, 'd');
  assert.equal(d.halves, '1');
  const lmaxScaled = Number(d.lmax);
  await page.selectOption('#c-scores-scale', 'none');
  await changedTo('scale', 'none');
  d = await data();
  assert(Math.abs(Number(d.lmax) - lmaxScaled * 2) < 1e-9,
    `${where}: unscaled lmax should be exactly double scaled (${d.lmax} vs ${lmaxScaled * 2})`);

  // scale: the raw spread grows like sqrt(d_k) and the scaled one holds
  // at 1. Polled on the readback of the slider, then read.
  await open('scale');
  d = await data();
  assert.equal(d.dk, '4');
  assert(Math.abs(Number(d.rawstd) - 2) < 0.2, `${where}: raw spread at d_k = 4 is ${d.rawstd}`);
  await page.locator('#c-scale-p').fill('8');
  await changedTo('dk', '256');
  d = await data();
  assert(Math.abs(Number(d.rawstd) - 16) < 1.6, `${where}: raw spread at d_k = 256 is ${d.rawstd}`);
  assert(Math.abs(Number(d.scaledstd) - 1) < 0.1, `${where}: scaled spread is ${d.scaledstd}`);
  assert(Number(d.peakraw) > 0.9 && Number(d.peakscaled) < 0.5,
    `${where}: unscaled softmax should saturate and scaled should not (${d.peakraw}, ${d.peakscaled})`);
  await fits('scale at d_k = 256');
  await page.locator('#c-scale-p').fill('0');
  await changedTo('dk', '1');
  await fits('scale at d_k = 1');

  // softmax: over the keys every row sums to 1.000; over the queries
  // it need not; a causal mask gives exact zeros and masks six cells.
  await open('softmax');
  d = await data();
  assert.equal(d.over, 't');
  assert.equal(d.rowsum, '1.000');
  await page.selectOption('#c-softmax-axis', 'queries');
  await changedTo('over', 's');
  d = await data();
  assert.notEqual(d.rowsum, '1.000',
    `${where}: softmax over queries should not make every row over t sum to 1.000`);
  await page.selectOption('#c-softmax-axis', 'keys');
  await page.selectOption('#c-softmax-mask', 'causal');
  await changedTo('masked', '6');
  d = await data();
  assert.equal(d.exactzero, '1');
  assert.equal(d.masked, '6');
  assert.equal(d.rowsum, '1.000');

  // output: the contraction is over t, the output is a convex
  // combination of V, and the two "know" rows -- identical going in --
  // come out identical, because nothing has told attention where a
  // token is.
  await open('output');
  d = await data();
  assert.equal(d.contract, 't');
  assert.equal(d.convex, '1');
  assert.equal(d.sameinput, '1');
  assert.equal(d.same, '1');

  // heads: the honest reshape agrees with the token it should; the
  // flat one does not, and says so with its own srcof.
  await open('heads');
  d = await data();
  assert.equal(d.agree, '1'); assert.equal(d.mixed, '0');
  await page.selectOption('#c-heads-order', 'flat');
  await changedTo('order', 'flat');
  d = await data();
  assert.equal(d.shape, '2,4,4'); assert.equal(d.sameshape, '1');
  assert.equal(d.agree, '0'); assert.equal(d.mixed, '1');
  const expectedSrc = await page.evaluate(() => {
    const AC = window.AttentionCore;
    const X = AC.gather(AC.embedding(), AC.IDS);
    return AC.traceCell(X, 2, true, 0, 1, 0).from.s;
  });
  assert.equal(d.srcof, String(expectedSrc));


  // batch: the two einsum strings are literal text, and moving B
  // moves only B in the shape.
  await open('batch');
  d = await data();
  assert.equal(d.shape, '2,2,4,4');
  assert.equal(d.einsum1, 'bhsd,bhtd->bhst');
  assert.equal(d.einsum2, 'bhst,bhtd->bhsd');
  await page.locator('#c-batch-b').fill('4');
  await changedTo('shape', '4,2,4,4');
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

  // Every section carries the NumPy for its picture, numpy only, no
  // line wider than 82 characters, under a label in the page's own
  // language -- read after every scene has been reached and moved.
  for (const id of ['words', 'ids', 'embed', 'project', 'scores', 'scale', 'softmax',
                    'output', 'heads', 'batch']) {
    const text = await page.locator(`#np-${id}`).innerText();
    assert(text.trim().length > 0, `${where}: #np-${id} is empty`);
    assert(!/undefined|NaN|torch|tensorflow|jax/i.test(text), `${where}: #np-${id} reads "${text}"`);
    const widest = Math.max(...text.split('\n').map(l => l.length));
    assert(widest <= 82, `${where}: #np-${id} is ${widest} characters wide`);
    assert.equal(await page.locator(`#nplab-${id}`).innerText(),
      lang === 'es' ? 'EN NUMPY' : 'IN NUMPY', `${where}: #nplab-${id}`);
  }

  // A scene's own name, with a hard reload, opens on it.
  await page.goto(
    `${ctx.origin}${ctx.prefix}interactive/attention-stage.html?lang=${lang}&fresh=1#softmax`);
  await page.waitForFunction(() =>
    document.getElementById('stage').dataset.scene === 'softmax', null, {timeout: 8000})
    .catch(() => assert.fail(`${where}: #softmax did not open on that scene`));
}

// Its embed mode is the softmax scene, flat and still: no scroller, and --
// unlike every other widget here -- nothing to fetch at all. Stricter than
// every other embed check: zero resource entries that are not this page's
// own code, its CSS, or the one vendored face that CSS names. The font is on
// the list because a widget is a page of this site with no navbar, so
// `widget-chrome.css` loads Inter itself; leaving it off would mean the
// embed rendering in whatever the reader's machine has while the page
// around it renders in the site's own type.
async function embed(ctx, page, where) {
  await page.waitForFunction(() =>
    document.getElementById('stage').dataset.ready === '1', null, {timeout: 10000});
  assert.equal(await page.locator('#stage').getAttribute('data-scene'), 'softmax',
    `${where} embed: the hero gets the softmax scene`);
  assert(await page.locator('.steps').isHidden(), `${where} embed: scroller shown`);
  const fetched = await page.evaluate(() =>
    performance.getEntriesByType('resource')
      .map(e => e.name)
      .filter(n => !/\.(js|css|woff2)(\?|$)/.test(n)));
  assert.equal(fetched.length, 0,
    `${where} embed: fetched something that is not code or CSS: ${fetched.join(', ')}`);
  assert.equal(await page.evaluate(() => window.THREE), undefined,
    `${where} embed: three.js must not be fetched on the front door`);
}

module.exports = {en, es, drive, embed};
