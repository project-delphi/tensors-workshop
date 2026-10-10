// The image tensor visualizer: strides, contiguity, memory order, and
// view-or-copy. Three.js is vendored, so it is same-origin and this check --
// which aborts every off-origin request -- can finally load it. That is what
// `window.THREE` asserts.
//
// The render *mode* is deliberately not asserted: whether headless Chromium
// gives us WebGL is not something to hang CI on, and the isometric canvas is
// a designed fallback, not a failure.
const assert = require('node:assert/strict');

const en = 'The image tensor';
const es = 'El tensor de imagen';

async function drive(ctx, page, where, lang) {
  const {origin, prefix} = ctx;
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
  // The cubes follow the shape from the start, so a transpose visibly
  // moves them: by meaning, readers took the stillness for a failed click.
  assert.equal(await page.locator('#stage').getAttribute('data-arrange'), 'position',
    `${where}: the photos should open following the shape`);
  await page.locator('#order-NCHW').click();
  assert((await readout()).includes('(3, 3, 16, 16)'),
    `${where}: NCHW preset did not permute the shape`);
  assert.equal(await page.locator('#order-NCHW').getAttribute('aria-pressed'), 'true',
    `${where}: the NCHW preset should say it is the order in force`);
  // The swap row: H and W at 16 x 16 leave the shape alone and trade
  // strides, and swapping them back is the same view again.
  const strides = () => page.locator('#stage').getAttribute('data-strides');
  await page.locator('#swap-a').selectOption('2');
  await page.locator('#swap-b').selectOption('3');
  await page.locator('#swap-go').click();
  assert.equal(await strides(), '768,1,3,48', `${where}: swapping H and W did not trade strides`);
  await page.locator('#swap-go').click();
  assert.equal(await strides(), '768,1,48,3', `${where}: swapping back did not restore NCHW`);
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
  // The layouts are radio buttons, and the one x is in is checked: NCHW
  // read off an NHWC buffer is exactly PyTorch's channels_last.
  assert(await page.locator('#layout-CL').isChecked(),
    `${where}: NCHW over an NHWC buffer should read as channels_last`);
  await page.locator('#contig').click();
  assert.notEqual(await data('bufsig'), viewSig,
    `${where}: .contiguous() must rewrite the buffer`);
  assert.equal(await data('shape'), '3,3,16,16',
    `${where}: .contiguous() must leave the shape alone`);
  assert.equal(await data('strides'), '768,256,16,1',
    `${where}: .contiguous() must leave C-contiguous strides`);
  // F and channels_last copy too, and each leaves its own strides.
  for (const [id, strides] of [['layout-F', '1,3,9,144'], ['layout-CL', '768,1,48,3'],
                               ['contig', '768,256,16,1']]) {
    await page.locator(`#${id}`).click();
    assert.equal(await data('strides'), strides, `${where}: #${id} strides`);
    assert(await page.locator(`#${id}`).isChecked(), `${where}: #${id} should be checked`);
  }

  // Face on, the gaps close and -- in photo mode -- the channel
  // planes composite back into the photograph.
  await page.locator('#snap').click();
  await page.waitForFunction(() =>
    document.querySelector('#stage').dataset.snapped === '1',
    null, {timeout: 5000})
    .catch(() => assert.fail(`${where}: Snap to 2-D did not engage`));

  // "Show the original photo" undoes the transpose and the copy above,
  // back to the buffer as it was stacked, and shows the batch as
  // photographs: by meaning, flat on the front face, composited.
  // The size count: the click starts a loop that climbs 4, 8, 16 px (the
  // reader's size is 16) and publishes each rung's shape on the stage. A
  // MutationObserver collects every shape the stage publishes, so a slow
  // runner that polls late still sees the whole ladder.
  await page.evaluate(() => {
    const st = document.querySelector('#stage');
    window.__loopShapes = [];
    new MutationObserver(() => {
      const shape = st.dataset.loopShape;
      const seen = window.__loopShapes;
      if (shape && seen[seen.length - 1] !== shape) seen.push(shape);
    }).observe(st, {attributes: true, attributeFilter: ['data-loop-shape']});
  });
  await page.locator('#original').click();
  await page.waitForFunction(() =>
    document.querySelector('#stage').dataset.looping === '1',
    null, {timeout: 5000})
    .catch(() => assert.fail(`${where}: the original photo never started the size count`));
  assert(await page.locator('#loop-note').isVisible(),
    `${where}: the size count should say what it is showing`);
  await page.waitForFunction(() =>
    document.querySelector('#stage').dataset.looping === '0',
    null, {timeout: 10000})
    .catch(() => assert.fail(`${where}: the size count never finished`));
  assert.deepEqual(await page.evaluate(() => window.__loopShapes),
    ['(3, 4, 4, 3)', '(3, 8, 8, 3)', '(3, 16, 16, 3)'],
    `${where}: the size count should publish every rung's shape, up to the reader's`);
  assert.equal(await page.locator('#res').inputValue(), '16',
    `${where}: the size count must end on the size the reader chose`);
  assert((await page.locator('#loop-note').innerText()).includes('(3, 4, 4, 3)'),
    `${where}: the trail of shapes should stay once the count is over`);
  assert.equal(await data('shape'), '3,16,16,3',
    `${where}: the original photo should be NHWC again`);
  assert.equal(await data('strides'), '768,48,3,1',
    `${where}: the original photo should be C-contiguous again`);
  assert.equal(await data('bufsig'), viewSig,
    `${where}: the original photo should be the buffer as it was stacked`);
  assert.equal(await data('arrange'), 'meaning',
    `${where}: the original photo should be arranged by meaning`);
  await page.waitForFunction(() => {
    const s = document.querySelector('#stage').dataset;
    return s.snapped === '1' && s.reveal === '1';
  }, null, {timeout: 5000})
    .catch(() => assert.fail(`${where}: the original photo did not composite face on`));
  assert(!(await page.locator('#code').innerText()).includes('transpose'),
    `${where}: the code log should start over with the original photo`);
  // After its beat the photo lifts back into 3-D on its own, and the drift
  // takes over from there. Once, in one language: it costs the hold's real
  // seconds.
  if (lang === 'en') {
    await page.waitForFunction(() =>
      document.querySelector('#stage').dataset.snapped === '0',
      null, {timeout: 10000})
      .catch(() => assert.fail(`${where}: the original photo never lifted back into 3-D`));
    await page.mouse.move(2, 2);
    const overlays = () => page.evaluate(() =>
      [...document.getElementById('overlays').children]
        .map(e => e.getAttribute('style')).join('|'));
    const settled = await overlays();
    await page.waitForFunction(prev =>
      [...document.getElementById('overlays').children]
        .map(e => e.getAttribute('style')).join('|') !== prev,
      settled, {timeout: 10000})
      .catch(() => assert.fail(`${where}: the drift did not resume after the size count`));
  }

  // Taking hold of anything mid-count ends it and hands the reader's size
  // back: here a click on the snap button, with the stage on 8 px.
  await page.locator('#original').click();
  await page.waitForFunction(() =>
    document.querySelector('#stage').dataset.loopShape === '(3, 8, 8, 3)',
    null, {timeout: 5000})
    .catch(() => assert.fail(`${where}: the size count never reached 8 px`));
  await page.locator('#snap').click();
  await page.waitForFunction(() => {
    const s = document.querySelector('#stage').dataset;
    return s.looping === '0' && s.shape === '3,16,16,3';
  }, null, {timeout: 5000})
    .catch(() => assert.fail(`${where}: an interrupted size count did not give 16 px back`));
  assert.equal(await page.locator('#res').inputValue(), '16',
    `${where}: an interrupted size count left the size picker on a rung`);
  // Picking a size mid-count is the reader's choice, not something to undo.
  await page.locator('#original').click();
  await page.waitForFunction(() =>
    document.querySelector('#stage').dataset.looping === '1', null, {timeout: 5000});
  await page.locator('#res').selectOption('8');
  await page.waitForFunction(() => {
    const s = document.querySelector('#stage').dataset;
    return s.looping === '0' && s.shape === '3,8,8,3';
  }, null, {timeout: 5000})
    .catch(() => assert.fail(`${where}: choosing a size mid-count should keep that size`));
  await page.waitForTimeout(700);
  assert.equal(await data('shape'), '3,8,8,3',
    `${where}: a stopped size count must not rebuild the array again`);
  await page.locator('#res').selectOption('16');
  // The numbers below open following the shape; put the pill back.
  await page.locator('#arrange [data-arrange="position"]').click();

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
      `${origin}${prefix}interactive/image-tensor.html?lang=${lang}`);
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

  // Reduced motion: no count, and the page says so. matchMedia is read at
  // load, so the emulation needs a reload.
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.goto(
    `${origin}${prefix}interactive/image-tensor.html?lang=${lang}`);
  await page.waitForFunction(() =>
    document.querySelector('#stage').dataset.photos === '3',
    null, {timeout: 10000});
  await page.locator('#res').selectOption('32');
  await page.locator('#original').click();
  await page.waitForFunction(() =>
    document.querySelector('#stage').dataset.loopSkipped === '1',
    null, {timeout: 5000})
    .catch(() => assert.fail(`${where}: reduced motion should skip the size count and say so`));
  assert.equal(await data('looping'), '0', `${where}: no size count under reduced motion`);
  assert.equal(await data('shape'), '3,32,32,3',
    `${where}: reduced motion should go straight to the selected size`);
  assert(/reduced motion|movimiento reducido/i.test(await page.locator('#loop-note').innerText()),
    `${where}: the readout should say the count was skipped`);
  await page.emulateMedia({reducedMotion: 'no-preference'});

  // `#transpose` in the URL opens the page on that tab.
  await page.goto(
    `${origin}${prefix}interactive/image-tensor.html?lang=${lang}#transpose`);
  await page.waitForSelector('#tab-transpose');
  assert(await page.locator('#transpose').isVisible(),
    `${where}: #transpose in the URL did not open its tab`);
  assert(await page.locator('#reshape').isHidden(),
    `${where}: the reshape tab stayed open beside #transpose`);
}

async function embed(ctx, page, where, lang) {
  await page.waitForFunction(() =>
    document.querySelector('#stage').dataset.photos === '3', null, {timeout: 10000});
  assert.equal(await page.evaluate(() => window.THREE), undefined,
    `${where} embed: three.js must not be fetched on the front door`);
}

module.exports = {en, es, drive, embed};
