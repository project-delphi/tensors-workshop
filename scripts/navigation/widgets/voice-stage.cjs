// The audio tensor stage (sections 00/02/04/09). What only this one can
// check: that the recording actually arrived and decoded -- `data-standin`
// is the stage's own admission that it fell back to a synthesised signal,
// and a voice.wav that stopped reaching docs/ would otherwise draw a
// perfectly convincing picture of the wrong thing -- and that the three
// layouts really are the same matrix reordered, read off the stage as
// numbers rather than looked for in pixels.
const assert = require('node:assert/strict');

const en = 'The audio tensor';
const es = 'El tensor de audio';

// A picture is reached by its own name. Setting location.hash from inside
// the page fires hashchange, which is the same request as opening on it; a
// page.goto that differs only in the hash would not reload and would not
// fire anything.
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

async function drive(ctx, page, where, lang) {
  const {origin, prefix} = ctx;
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
    `x[n] → X[f, t],  (237568,) → (${wide.replace(',', ', ')})`,
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
    'xₜ[n] = x[t·H + n] · w[n],  xₜ.shape = (1024,)',
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

  // The NumPy under the picture is built from the same state the readout
  // is, so the one thing worth asserting is that it followed a control:
  // a block still saying (513,) under a window slider moved to 2048 is
  // the one thing on this page a reader could copy and be wrong about.
  // Polled on the data-* the widget publishes, never after a fixed wait.
  const npText = (id) => page.locator(`#np-${id}`).innerText();
  assert.equal((await data()).n, '1024');
  assert((await npText('spectrum')).includes('(513,)'),
    `${where}: the spectrum block does not name the 513 bins beside it`);
  await page.locator('#c-spectrum-size').fill('3');
  await page.waitForFunction(() => document.getElementById('stage').dataset.bins === '1025',
    null, {timeout: 5000});
  const npWide = await npText('spectrum');
  assert(npWide.includes('(1025,)') && !npWide.includes('(513,)'),
    `${where}: the spectrum block did not follow the window size`);
  assert(npWide.includes('np.fft.rfft(xt)'),
    `${where}: the spectrum block lost its rfft line`);
  await page.locator('#c-spectrum-size').fill('2');
  await page.waitForFunction(() => document.getElementById('stage').dataset.bins === '513',
    null, {timeout: 5000});

  // And the widest block on the page, at both hops: the padded length
  // and the frame count are the two numbers the equations turn on.
  await voiceScene(page, 'window');
  assert.equal((await data()).shape, '513,465');
  const npHalf = await npText('window');
  assert(npHalf.includes('(238592,)') && npHalf.includes('(465, 1024)') && npHalf.includes('(513, 465)'),
    `${where}: the hop block does not name the shapes beside it`);
  assert(npHalf.includes('sliding_window_view'), `${where}: the hop block lost its view line`);
  await page.selectOption('#c-window-overlap', 'quarter');
  await page.waitForFunction(() => document.getElementById('stage').dataset.hop === '256',
    null, {timeout: 8000});
  const npQuarter = await npText('window');
  assert(npQuarter.includes('N, H = 1024, 256') && !npQuarter.includes('(465, 1024)'),
    `${where}: the hop block did not follow the overlap`);
  await page.selectOption('#c-window-overlap', 'half');
  await page.waitForFunction(() => document.getElementById('stage').dataset.hop === '512',
    null, {timeout: 8000});

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

  // Every NumPy block, in the state the reader actually finds it. This
  // is not the same check `npm test` runs: there the three heavy scenes
  // never finish their factorisation, so their block is the short form
  // and its width is not the one that ships. Three blocks went out at
  // 85, 86 and 94 characters under exactly that gap. By this point in
  // the drive every scene has been reached and settled, so the widest
  // line here is the widest line there is.
  for (const id of ['sample', 'quantize', 'array', 'frame', 'spectrum', 'window',
                    'scramble', 'lowrank', 'nmf', 'batch']) {
    await voiceScene(page, id);
    const text = await page.locator(`#np-${id}`).innerText();
    assert(text.trim().length > 0, `${where}: #np-${id} is empty`);
    assert(!/undefined|NaN/.test(text), `${where}: #np-${id} reads "${text}"`);
    const widest = Math.max(...text.split('\n').map(l => l.length));
    assert(widest <= 82, `${where}: #np-${id} is ${widest} characters wide`);
    // The label the frame writes over it, in the page's own language.
    assert.equal(await page.locator(`#nplab-${id}`).innerText(),
      lang === 'es' ? 'EN NUMPY' : 'IN NUMPY', `${where}: #nplab-${id}`);
  }

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

// Lose the GL module: the three opening scenes must draw their twin, keep
// their controls and their teaching numbers.
async function fallback(ctx, page, where, lang) {
  const {origin, prefix, audit} = ctx;
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
    await audit(`${where} twin ${scene}`);
  }
  await page.unroute('**/vendor/linalg-boot.js');
  await page.emulateMedia({reducedMotion: 'no-preference'});
}

// The hero draws this scene from a synthesised stand-in. Half a megabyte of
// audio is not what a landing page is worth, and an AudioContext built here
// would be a suspended one nobody asked for -- so both must be absent, and
// `data-standin` is the stage saying which signal it used.
async function embed(ctx, page, where) {
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
}

module.exports = {en, es, drive, fallback, embed, voiceScene};
