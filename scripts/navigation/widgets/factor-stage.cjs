// Tucker and CP (sections 10/11/Appendix C), eight scenes on the real
// 4 x 5 x 24 taxi tensor, four in three.js with SVG twins.
const assert = require('node:assert/strict');

const en = 'Tucker and CP';
const es = 'Tucker y CP';

async function drive(ctx, page, where, lang) {
  const {origin, prefix} = ctx;
  await page.waitForFunction(() => document.getElementById('stage').dataset.ready === '1',
    null, {timeout: 20000});
  const data = () => page.evaluate(() => ({...document.getElementById('stage').dataset}));
  const stageIs = (key, value) => page.waitForFunction(([k, v]) =>
    document.getElementById('stage').dataset[k] === v, [key, value], {timeout: 10000})
    .catch(() => assert.fail(`${where}: data-${key} never became ${value}`));
  // The picture has arrived at what the controls say: the frame
  // publishes data-easing while geometry eases, the unfold morphs or
  // the camera glides. Polled, never slept on -- a runner slower than
  // this Mac is still mid-ease at any fixed number of milliseconds.
  const settled = () => page.waitForFunction(() =>
    document.getElementById('stage').dataset.easing === '0', null, {timeout: 15000})
    .catch(() => assert.fail(`${where}: the picture never came to rest`));
  const set = async (scene, control, value) => {
    const input = page.locator(`#c-${scene}-${control}`);
    if (await input.evaluate(e => e.tagName) === 'SELECT') await input.selectOption(String(value));
    else await input.fill(String(value));
  };

  // Nothing clips an SVG child laid out past the viewBox and nothing
  // reports one -- it is simply not painted, while every data-* below
  // goes on reading correctly. Every picture here is sized by a slider
  // or fitted to an orbit, so this is measured at slider corners and
  // after a turn, not only where each scene opens. On the flat path the
  // board is the SVG's own viewBox (a three.js scene's twin takes one
  // the shape of the stage); on the three.js path the picture is pixels
  // nobody can measure, and what can fall off the stage is its labels,
  // which are HTML chips over it.
  const fits = async (what) => {
    const box = await page.evaluate(() => {
      const stage = document.getElementById('stage');
      if (stage.dataset.gl === 'composer') {
        const r = stage.getBoundingClientRect();
        const off = [];
        for (const lab of stage.querySelectorAll('.lab')) {
          if (lab.style.display === 'none' || lab.closest('[style*="display: none"]')) continue;
          const b = lab.getBoundingClientRect();
          if (!b.width) continue;
          if (b.left < r.left - 2 || b.right > r.right + 2 || b.top < r.top - 2 || b.bottom > r.bottom + 2) {
            off.push(lab.textContent);
          }
        }
        return {gl: true, off};
      }
      const svg = document.getElementById('draw');
      const vb = svg.viewBox.baseVal;
      const inv = svg.getScreenCTM() && svg.getScreenCTM().inverse();
      if (!inv) return null;
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, n = 0;
      for (const node of svg.querySelectorAll('*')) {
        if (typeof node.getBBox !== 'function' || !node.getScreenCTM()) continue;
        let b;
        try { b = node.getBBox(); } catch (e) { continue; }
        if (!b.width && !b.height) continue;
        n++;
        const m = inv.multiply(node.getScreenCTM());
        for (const [px, py] of [[b.x, b.y], [b.x + b.width, b.y],
                                [b.x, b.y + b.height], [b.x + b.width, b.y + b.height]]) {
          const x = m.a * px + m.c * py + m.e, y = m.b * px + m.d * py + m.f;
          x0 = Math.min(x0, x); y0 = Math.min(y0, y);
          x1 = Math.max(x1, x); y1 = Math.max(y1, y);
        }
      }
      return {x0, y0, x1, y1, w: vb.width, h: vb.height, n,
              nan: /NaN|Infinity/.test(svg.innerHTML)};
    });
    assert(box, `${where}: ${what} drew nothing measurable`);
    if (box.gl) {
      assert.deepEqual(box.off, [], `${where}: ${what} puts labels off the stage`);
      return;
    }
    assert(box.n > 10, `${where}: ${what} drew almost nothing`);
    assert(!box.nan, `${where}: ${what} wrote a NaN into the SVG`);
    // A couple of units of slack: a <text> box is the font's, not the
    // glyphs'.
    assert(box.x0 >= -3 && box.y0 >= -3 && box.x1 <= box.w + 3 && box.y1 <= box.h + 3,
      `${where}: ${what} draws outside its ${box.w}x${box.h} board ` +
      `(x ${box.x0.toFixed(0)}..${box.x1.toFixed(0)}, y ${box.y0.toFixed(0)}..${box.y1.toFixed(0)})`);
  };

  // This is a scroller, so a hash scrolls the section into view and the
  // step machine follows the scroll: the stage passes through pictures
  // on the way, and `data-scene` can read the destination for a frame
  // while the rest of the dataset is still the scene it is leaving. So:
  // wait for the scrolling to stop, then for the scene, then for a key
  // only that scene publishes, and measure the picture before believing
  // a number in it.
  const open = async (id, key) => {
    await page.evaluate((name) => { location.hash = '#' + name; }, id);
    await page.waitForFunction(() => new Promise(done => {
      const was = window.scrollY;
      setTimeout(() => done(window.scrollY === was), 250);
    }), null, {timeout: 15000});
    await page.waitForFunction(([name, k]) => {
      const ds = document.getElementById('stage').dataset;
      return ds.scene === name && ds[k] !== undefined;
    }, [id, key], {timeout: 15000})
      .catch(() => assert.fail(`${where}: #${id} did not open with its own readout`));
    await settled();
    await fits(id);
  };

  // The tensor scene: the page opens on it, and it draws in three.js.
  // Wait on the *modules*, as the other two stages do: an addon missing
  // from docs/ would drop the reader into the twin and nothing else
  // would notice. The render mode itself is advisory -- the composer
  // where the runner has WebGL, the twin where it has not -- and every
  // assertion below holds on both.
  let d = await data();
  assert.equal(d.standin, '0', `${where}: tensor scene should have fetched the real tensor`);
  assert.equal(d.scene, 'tensor');
  await page.waitForFunction(() => window.THREE_ADDONS !== undefined, null, {timeout: 12000})
    .catch(() => assert.fail(`${where}: the vendored three.js modules never loaded for the factor stage`));
  await page.waitForFunction(() => ['composer', 'none'].includes(
    document.getElementById('stage').dataset.gl), null, {timeout: 5000});
  await settled();
  if ((await data()).gl === 'none') console.log(`  (${where}: no WebGL here, exercising the factor stage's twins)`);
  d = await data();
  assert.equal(d.shape, '4,5,24');
  assert.equal(d.entries, '480');
  assert.equal(d.order, '3');
  assert.equal(d.trips, '6383');
  assert.equal(d.busiest, '18', `${where}: the busiest hour, summed across every route, is 18`);
  assert.equal(d.cell, '318', `${where}: T[2, 2, 18]`);
  assert.equal(d.mmshare, '0.765', `${where}: three quarters of the trips never leave Manhattan`);
  assert.equal(d.zeros, '207');
  await fits('tensor');
  // Each route keeps its own clock: Brooklyn to Manhattan peaks at 6.
  await set('tensor', 'pickup', 1);
  await stageIs('pickup', '1');
  assert.equal((await data()).routepeak, '6', `${where}: Brooklyn -> Manhattan should peak at hour 6`);
  await set('tensor', 'slice', 'hour');
  await stageIs('slice', 'hour');
  await fits('tensor with a slice lit');

  // Unfold: one entry, three addresses, and a column that is a fibre.
  await open('unfold', 'addresses');
  d = await data();
  assert.equal(d.mode, '2');
  assert.equal(d.rows, '24');
  assert.equal(d.cols, '20');
  assert.equal(d.invariant, '1');
  assert.equal(d.at, '18,12', `${where}: T[2, 2, 18] lands at row 18, column 12 of T(2)`);
  assert.equal(d.addresses, '2,66;2,66;18,12');
  assert.equal(await page.locator('#stagecap').textContent(),
    'T₍₀₎[2, 66]  ·  T₍₁₎[2, 66]  ·  T₍₂₎[18, 12]',
    `${where}: the three addresses of one entry`);
  // Play walks the flatten control to its end, through setControls, so
  // the readout is written at every value it passes.
  await page.locator('#c-unfold-play').evaluate(e => e.click());
  await stageIs('playing', '1');
  await page.waitForFunction(() => document.getElementById('stage').dataset.flatten === '100',
    null, {timeout: 15000}).catch(() => assert.fail(`${where}: Play never laid the cube flat`));
  await stageIs('playing', '0');
  await page.waitForFunction(() => document.getElementById('stage').dataset.tensorshape === '[24, 20]',
    null, {timeout: 5000});
  await settled();
  await fits('unfold, flat along hour');
  await set('unfold', 'mode', 0);
  await stageIs('mode', '0');
  d = await data();
  assert.equal(d.rows, '4');
  assert.equal(d.cols, '120');
  await settled();
  await fits('unfold, flat along pickup');

  // HOSVD: the thin U caps the hour rank at 20, and one pattern holds
  // 99.8% of the hour unfolding's energy.
  await open('hosvd', 'rmax');
  d = await data();
  assert.equal(d.mode, '2');
  assert.equal(d.rmax, '20');
  assert.equal(await page.locator('#c-hosvd-r').getAttribute('max'), '20',
    `${where}: the hour rank slider's own max should be 20, not 24`);
  assert.equal(d.u0peak, '18', `${where}: the hour factor's first column is the day, peaking at 18`);
  assert.equal(d.sv0, '1101.32');
  await set('hosvd', 'r', 1);
  await stageIs('r', '1');
  assert.equal((await data()).energy, '0.9980', `${where}: sigma_1 alone holds 99.8%`);
  await set('hosvd', 'r', 20);
  await stageIs('r', '20');
  assert.equal((await data()).energy, '1.0000');
  await fits('hosvd at r = 20');
  await set('hosvd', 'mode', 0);
  await stageIs('mode', '0');
  assert.equal((await data()).rmax, '4');
  assert.equal((await data()).r, '4', `${where}: r clamps to the pickup mode's 4`);
  await fits('hosvd on pickup');

  // Tucker: the handbook's own published numbers, byte-exact on the
  // claim card; one core entry is 99% of the fit; the biggest miss has
  // a name; lowering the hour rank to 1 barely moves the error.
  await open('tucker', 'ranks');
  d = await data();
  assert.equal(d.ranks, '2,2,3');
  assert.equal(d.params, '102');
  assert.equal(d.dense, '480');
  assert.equal(d.ratio, '4.71');
  assert.equal(d.err, '0.067');
  assert.equal(d.hourpeak, '18');
  assert.equal(d.entry, '0,0,0');
  assert.equal(d.g, '1096.8');
  assert.equal(d.share, '0.994', `${where}: G[0, 0, 0] is 99.4% of the fit`);
  assert.equal(d.miss, '1,1,18', `${where}: the biggest miss is Brooklyn -> Brooklyn at 18`);
  // textContent, not innerText: the card uses double spaces between its
  // clauses, which innerText would collapse.
  assert.equal(await page.locator('#claim').textContent(),
    `T ≈ G ×₀ A ×₁ B ×₂ C,  480 → 102,  4.71×  ${lang === 'es' ? 'al' : 'at'}  6.7%`,
    `${where}: the tucker claim card should be byte-exact`);
  await set('tucker', 'view', 'residual');
  await stageIs('view', 'residual');
  await settled();
  await fits('tucker, what it misses');
  await set('tucker', 'view', 'parts');
  await stageIs('view', 'parts');
  const errBefore = Number(d.err);
  await set('tucker', 'r2', 1);
  await stageIs('ranks', '2,2,1');
  assert(Number((await data()).err) < 0.08, `${where}: hour rank 1 costs under a point and a half of error`);
  await set('tucker', 'r2', 20);
  await stageIs('ranks', '2,2,20');
  assert(Number((await data()).err) <= errBefore, `${where}: raising the hour rank should not raise the error`);
  await set('tucker', 'r0', 4);
  await set('tucker', 'r1', 5);
  await stageIs('ranks', '4,5,20');
  await settled();
  await fits('tucker at every rank max');
  assert(Number((await data()).ratio) < 1,
    `${where}: at full multilinear rank Tucker should cost more than the dense tensor`);

  // Rank-1: the best single term is the Tucker core's corner, and
  // moving a factor from c into a changes nothing.
  await open('rank1', 'lambda');
  d = await data();
  assert.equal(d.params, '33');
  assert.equal(d.lambda, '1096.8');
  assert.equal(d.err, '0.1007');
  await set('rank1', 'scale', 200);
  await stageIs('scale', '200');
  assert.equal((await data()).proportional, '1');
  await set('rank1', 'scale', 100);
  await set('rank1', 'move', 1);
  await stageIs('move', '1');
  d = await data();
  assert.equal(d.unchanged, '1', `${where}: a x 2, c / 2 is the same tensor`);
  assert.equal(d.err, '0.1007');
  await settled();
  await fits('rank1 with a factor moved');

  // CP: rank 3 recovers all three planted terms and their weights; a
  // fourth splits one; on the taxi tensor at 6, two terms cancel.
  await open('cp', 'recovered');
  d = await data();
  assert.equal(d.recovered, '3');
  assert.equal(d.unique, '1');
  assert.equal(d.weights, '10.0,6.0,3.0');
  const errAtR3 = Number(d.err);
  await set('cp', 'r', 1);
  await stageIs('r', '1');
  d = await data();
  assert(Number(d.err) > errAtR3, `${where}: rank 1 CP should fit worse than rank 3`);
  assert(Number(d.recovered) < 3, `${where}: rank 1 CP should recover fewer terms`);
  await fits('cp at R = 1');
  assert.equal(await page.locator('#claim').textContent(),
    'T ≈ Σᵣ λᵣ aᵣ ⊗ bᵣ ⊗ cᵣ,  R(I + J + K) = 33',
    `${where}: the cp claim card should count this R's parameters`);
  await set('cp', 'r', 4);
  await stageIs('r', '4');
  assert.equal((await data()).split, '1', `${where}: a spare rank splits a planted term`);
  await set('cp', 'data', 'taxi');
  await set('cp', 'r', 6);
  await stageIs('r', '6');
  await stageIs('data', 'taxi');
  assert.equal((await data()).cancelling, '0-1', `${where}: two taxi terms cancel at R = 6`);
  await fits('cp at R = 6');

  // ALS: never uphill, and two valleys from five starts.
  await open('als', 'sweep');
  d = await data();
  assert.equal(d.monotone, '1');
  assert.equal(d.end, '0.0700', `${where}: seed 1 stops at 7.00%`);
  assert.equal(d.bestend, '0.0673', `${where}: another start reaches 6.73%`);
  await page.locator('#c-als-play').evaluate(e => e.click());
  await stageIs('playing', '1');
  await page.waitForFunction(() => document.getElementById('stage').dataset.step === '300',
    null, {timeout: 15000}).catch(() => assert.fail(`${where}: Play never finished the fit`));
  await stageIs('playing', '0');
  assert.equal((await data()).err, '0.0700');
  await set('als', 'seed', 3);
  await stageIs('seed', '3');
  assert.equal((await data()).end, '0.0673');
  await set('als', 'seed', 1);
  await set('als', 'data', 'synthetic');
  await set('als', 'r', 3);
  await stageIs('r', '3');
  await set('als', 'step', 60);
  await stageIs('step', '60');
  assert(Number((await data()).err) < 1e-4, `${where}: three planted terms are found by sweep 20`);
  await fits('als on the synthetic tensor');

  // Budget: the same 99 parameters CP spends at R = 3, spent on the
  // best Tucker triple that fits inside it; the answer depends on the
  // budget; the closest-params rule can cost error.
  await open('budget', 'cheapest');
  d = await data();
  assert.equal(d.budget, '99');
  assert(Number(d.tuckerparams) <= 99, `${where}: the picked Tucker triple must fit the budget`);
  assert.notEqual(d.tuckerranks, '3,3,3');
  assert.equal(d.degenerate, '0');
  assert.equal(d.better, '0', `${where}: CP wins at 99`);
  assert.equal(d.sameparams, '126', `${where}: Tucker (3, 3, 3) costs 126, not 99`);
  assert.equal(d.wins, 'none,tucker,cp,cp,cp,cp');
  const bestErr = Number(d.tuckererr);
  await set('budget', 'rule', 'closest-params');
  await stageIs('rule', 'closest-params');
  d = await data();
  assert(Number(d.tuckererr) >= bestErr - 1e-9,
    `${where}: the closest-params pick should not beat the best-error pick`);
  assert.equal(d.tuckerfits, '1');
  await set('budget', 'rule', 'best-error');
  // Past R = 4 there is no equal-rank Tucker to compare -- pickup has
  // four boroughs -- and the scene must not claim one.
  await set('budget', 'cpr', 6);
  await stageIs('cpr', '6');
  assert.equal((await data()).sameparams, '', `${where}: an equal-rank Tucker claimed at R = 6`);
  assert(!/rr = /.test(await page.locator('#np-budget').innerText()), `${where}: equal ranks claimed at R = 6`);
  await set('budget', 'cpr', 2);
  await stageIs('cpr', '2');
  assert.equal((await data()).better, '1', `${where}: Tucker wins at 66`);
  await set('budget', 'cpr', 1);
  await stageIs('cpr', '1');
  d = await data();
  assert.equal(d.budget, '33');
  assert.equal(d.tuckerfits, '0', `${where}: no Tucker triple fits CP's budget at R = 1`);
  assert.equal(d.cheapest, '34');
  assert.equal(d.tuckerranks, '');
  await fits('budget at R = 1');

  // Every NumPy block, as the drive left it: every scene has been
  // reached, so each block holds the lines its scene last wrote.
  for (const id of ['tensor', 'unfold', 'hosvd', 'tucker', 'rank1', 'cp', 'als', 'budget']) {
    const text = await page.locator(`#np-${id}`).innerText();
    assert(text.trim().length > 0, `${where}: #np-${id} is empty`);
    assert(!/undefined|NaN/.test(text), `${where}: #np-${id} reads "${text}"`);
    assert(!/torch|tensorflow|jax|tensorly/i.test(text), `${where}: #np-${id} is not NumPy`);
    const widest = Math.max(...text.split('\n').map(l => l.length));
    assert(widest <= 82, `${where}: #np-${id} is ${widest} characters wide`);
    assert.equal(await page.locator(`#nplab-${id}`).innerText(),
      lang === 'es' ? 'EN NUMPY' : 'IN NUMPY', `${where}: #nplab-${id}`);
  }

  // Pointing at a letter lights its piece, publishes data-hl, and never
  // touches the readout. Scoped to the section, because the same token
  // is in every section.
  await open('tucker', 'ranks');
  const readBefore = await page.locator('#read-tucker').innerHTML();
  await page.locator('#eqcap-tucker').scrollIntoViewIfNeeded();
  await page.locator('#step-tucker .eq [data-hl="hour"]').first().hover();
  await stageIs('hl', 'hour');
  await page.locator('#step-tucker .eq [data-hl="core"]').first().focus();
  await stageIs('hl', 'core');
  assert.equal(await page.locator('#read-tucker').innerHTML(), readBefore,
    `${where}: a hover rewrote the readout, which is the controls' to write`);
  await page.locator('#step-tucker .eq [data-hl="core"]').first().blur();
  await page.waitForFunction(() => !document.getElementById('stage').dataset.hl, null, {timeout: 5000});

  // A deep link opens straight on the named scene -- link by scene
  // name, never by a step number that moves on a reorder -- and a page
  // opened on a flat scene never fetches three.js.
  await page.goto(`${page.url().split('?')[0]}?lang=${lang}&fresh=1#budget`);
  await page.waitForFunction(() => document.getElementById('stage').dataset.ready === '1',
    null, {timeout: 20000});
  assert.equal((await data()).scene, 'budget', `${where}: a deep link to #budget should open there`);
  // A fixed wait on purpose: this asserts that nothing arrives, and
  // there is no attribute for a fetch that was never made.
  await page.waitForTimeout(400);
  assert.equal(await page.evaluate(() => window.THREE), undefined,
    `${where}: a page opened on a flat scene fetched three.js`);
  await page.goto(`${page.url().split('?')[0]}?lang=${lang}&fresh=2#tucker`);
  await page.waitForFunction(() => document.getElementById('stage').dataset.ready === '1',
    null, {timeout: 20000});
  assert.equal((await data()).scene, 'tucker', `${where}: a deep link to #tucker should open there`);
}

// Lose the GL module: the four three.js scenes must draw their twin, fitted
// inside its board at every turn, with their numbers, and a click on a
// voxel must still move the controls.
async function fallback(ctx, page, where, lang) {
  const {origin, prefix, audit} = ctx;
  await page.route('**/vendor/linalg-boot.js', route => route.abort());
  await page.emulateMedia({reducedMotion: 'reduce'});
  const measure = () => page.evaluate(() => {
    const svg = document.getElementById('draw');
    const vb = svg.viewBox.baseVal, inv = svg.getScreenCTM().inverse();
    let bad = 0, n = 0;
    for (const node of svg.querySelectorAll('polygon, text, path, rect')) {
      const b = node.getBBox();
      if (!b.width && !b.height) continue;
      n++;
      const m = inv.multiply(node.getScreenCTM());
      for (const [px, py] of [[b.x, b.y], [b.x + b.width, b.y + b.height]]) {
        const x = m.a * px + m.c * py + m.e, y = m.b * px + m.d * py + m.f;
        if (x < -3 || y < -3 || x > vb.width + 3 || y > vb.height + 3) bad++;
      }
    }
    return {bad, n, nan: /NaN|Infinity/.test(svg.innerHTML)};
  });
  for (const scene of ['tensor', 'unfold', 'tucker', 'rank1']) {
    await page.goto(`${origin}${prefix}interactive/factor-stage.html?lang=${lang}&fallback-check=1#${scene}`);
    await page.waitForFunction(() => document.getElementById('stage').dataset.ready === '1', null, {timeout: 20000});
    await page.waitForFunction(id => document.getElementById('stage').dataset.scene === id, scene);
    await page.waitForFunction(() => !document.getElementById('glnote').hidden, null, {timeout: 10000});
    assert.equal(await page.locator('#stage').getAttribute('data-gl'), 'none');
    assert(await page.locator('#draw').isVisible(), `${where}: twin ${scene} is not on the stage`);
    let m = await measure();
    assert(m.n > 20 && !m.nan && m.bad === 0, `${where}: twin ${scene} at home: ${JSON.stringify(m)}`);
    // The twin turns with the keys, as the three.js picture does,
    // and stays on its board at the far end of the turn.
    const cam = await page.locator('#stage').getAttribute('data-cam');
    await page.locator('#stage').focus();
    for (let n = 0; n < 10; n++) await page.keyboard.press('ArrowLeft');
    for (let n = 0; n < 6; n++) await page.keyboard.press('ArrowUp');
    await page.waitForFunction(was => document.getElementById('stage').dataset.cam !== was, cam, {timeout: 5000})
      .catch(() => assert.fail(`${where}: twin ${scene} did not turn`));
    await page.waitForFunction(() => document.getElementById('stage').dataset.easing === '0', null, {timeout: 15000});
    m = await measure();
    assert(m.bad === 0 && !m.nan, `${where}: twin ${scene} turned off its board: ${JSON.stringify(m)}`);
    const readout = await page.locator(`#read-${scene}`).innerText();
    assert(!/NaN|Infinity|undefined/.test(readout), `${where}: twin ${scene} readout: ${readout}`);
    if (scene === 'tensor') {
      // Clicking a voxel is a control: it moves all three sliders.
      // Dispatched on the voxel's own face rather than clicked at a
      // point: a small voxel can sit behind a nearer one, and the
      // pick is the element the press began on.
      const target = page.locator('#draw [data-pick="cell:1,2,6"] polygon').first();
      const box = await target.boundingBox();
      const at = {clientX: box.x + box.width / 2, clientY: box.y + box.height / 2, bubbles: true, pointerId: 1};
      await target.dispatchEvent('pointerdown', at);
      await target.dispatchEvent('pointerup', at);
      await page.waitForFunction(() => document.getElementById('stage').dataset.hour === '6', null, {timeout: 5000})
        .catch(() => assert.fail(`${where}: clicking a voxel did not pick it`));
      assert.equal(await page.locator('#c-tensor-pickup').inputValue(), '1');
      assert.equal(await page.locator('#c-tensor-dropoff').inputValue(), '2');
    }
    if (scene === 'unfold') {
      // Under reduced motion, Play goes straight to the end.
      await page.locator('#c-unfold-play').evaluate(e => e.click());
      await page.waitForFunction(() => document.getElementById('stage').dataset.flatten === '100', null, {timeout: 5000});
      m = await measure();
      assert(m.bad === 0 && !m.nan, `${where}: twin unfold, flat: ${JSON.stringify(m)}`);
    }
    if (scene === 'tucker') {
      await page.locator('#c-tucker-r2').fill('20');
      await page.locator('#c-tucker-r0').fill('4');
      await page.locator('#c-tucker-r1').fill('5');
      await page.waitForFunction(() => document.getElementById('stage').dataset.ranks === '4,5,20');
      await page.waitForFunction(() => document.getElementById('stage').dataset.easing === '0', null, {timeout: 15000});
      m = await measure();
      assert(m.bad === 0 && !m.nan, `${where}: twin tucker at full rank: ${JSON.stringify(m)}`);
    }
    await audit(`${where} twin ${scene}`);
  }
  await page.unroute('**/vendor/linalg-boot.js');
  await page.emulateMedia({reducedMotion: 'no-preference'});
}

// The hero gets the tucker scene's twin, still: no three.js on the front
// door, and the real (tiny) tensor is fetched even here.
async function embed(ctx, page, where) {
  await page.waitForFunction(() =>
    document.getElementById('stage').dataset.ready === '1', null, {timeout: 20000});
  assert.equal(await page.locator('#stage').getAttribute('data-standin'), '0',
    `${where} embed: the hero should have fetched the real taxi tensor`);
  const fetchedTaxi = await page.evaluate(() =>
    performance.getEntriesByType('resource').some(e => e.name.includes('taxi.json')));
  assert(fetchedTaxi, `${where} embed: taxi.json was not requested`);
  assert.equal(await page.locator('#stage').getAttribute('data-scene'), 'tucker',
    `${where} embed: the hero gets the tucker scene`);
  assert.equal(await page.locator('#stage').getAttribute('data-ratio'), '4.71');
  assert(await page.locator('.steps').isHidden(), `${where} embed: the scroller is shown`);
  assert(await page.locator('#shapebadge').isHidden(),
    `${where} embed: the shape badge is shown on the front door`);
  assert.equal(await page.evaluate(() => window.THREE), undefined,
    `${where} embed: three.js must not be fetched on the front door`);
  assert.equal(await page.locator('#stage').getAttribute('data-gl'), 'none');
  assert(await page.locator('#draw polygon').count() > 100,
    `${where} embed: the tucker twin drew nothing`);
}

module.exports = {en, es, drive, fallback, embed};
