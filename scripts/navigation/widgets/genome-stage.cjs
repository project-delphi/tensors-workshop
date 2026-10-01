// DNA to an edit (sections 04/06, Appendix G): nine scenes on 180 bases of
// a real cas12a gene, five in three.js (bases, codons, protein, fold, search)
// with SVG twins. It fetches nothing -- the gene and its protein are two
// literals in the core, and the predicted structure the fold scene draws is
// a generated literal the page loads as a script.
const assert = require('node:assert/strict');

const en = 'DNA to an edit';
const es = 'Del ADN a una edición';

const SCENES = ['bases', 'window', 'transcribe', 'codons', 'translate', 'protein', 'fold', 'search', 'batch'];
const GL_SCENES = ['bases', 'codons', 'protein', 'fold', 'search'];
// A key only that scene publishes, to wait on once `data-scene` has flipped.
const OWN_KEY = {bases: 'ones', window: 'copied', transcribe: 'rna', codons: 'nonzeros',
  translate: 'cells', protein: 'distinct', fold: 'pairs', search: 'runnerup', batch: 'exact'};
// One key that shows the twin drew with the model's numbers.
const TWIN_KEY = {bases: 'row', codons: 'codon', protein: 'hydropathy', fold: 'near', search: 'score'};

async function drive(ctx, page, where, lang) {
  await page.waitForFunction(() => document.getElementById('stage').dataset.ready === '1',
    null, {timeout: 20000});
  const data = () => page.evaluate(() => ({...document.getElementById('stage').dataset}));
  const stageIs = (key, value) => page.waitForFunction(([k, v]) =>
    document.getElementById('stage').dataset[k] === v, [key, String(value)], {timeout: 10000})
    .catch(() => assert.fail(`${where}: data-${key} never became ${value}`));
  // Polled, never slept on: data-easing is published while geometry eases.
  const settled = () => page.waitForFunction(() =>
    document.getElementById('stage').dataset.easing === '0', null, {timeout: 15000})
    .catch(() => assert.fail(`${where}: the picture never came to rest`));
  const set = async (scene, control, value) => {
    const input = page.locator(`#c-${scene}-${control}`);
    if (await input.evaluate(e => e.tagName) === 'SELECT') await input.selectOption(String(value));
    else await input.fill(String(value));
    return input.inputValue();
  };

  // Nothing clips an SVG child laid out past the viewBox and nothing
  // reports one. On the flat path the board is the SVG's viewBox; on the
  // three.js path the picture is pixels nobody can measure, and what can
  // fall off the stage is its labels, which are HTML chips over it. Both
  // are measured wherever they are showing.
  const fits = async (what) => {
    const box = await page.evaluate(() => {
      const stage = document.getElementById('stage');
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
      // The inset over a three.js picture is an SVG on its own board, on
      // either surface: how many of its pieces are laid out off that board.
      const inset = document.getElementById('hud');
      let hud = 0;
      if (inset && !inset.hasAttribute('hidden') && inset.getScreenCTM()) {
        const ib = inset.viewBox.baseVal, iinv = inset.getScreenCTM().inverse();
        for (const node of inset.querySelectorAll('*')) {
          if (typeof node.getBBox !== 'function' || !node.getScreenCTM()) continue;
          let b;
          try { b = node.getBBox(); } catch (e) { continue; }
          if (!b.width && !b.height) continue;
          const m = iinv.multiply(node.getScreenCTM());
          for (const [px, py] of [[b.x, b.y], [b.x + b.width, b.y + b.height]]) {
            const x = m.a * px + m.c * py + m.e, y = m.b * px + m.d * py + m.f;
            if (x < -3 || y < -3 || x > ib.width + 3 || y > ib.height + 3) hud++;
          }
        }
      }
      const svg = document.getElementById('draw');
      const shown = svg.getClientRects().length > 0 && getComputedStyle(svg).visibility !== 'hidden'
        && getComputedStyle(svg).display !== 'none';
      if (!shown) return {svg: false, off, hud, gl: stage.dataset.gl};
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
      return {svg: true, off, hud, x0, y0, x1, y1, w: vb.width, h: vb.height, n,
              nan: /NaN|Infinity/.test(svg.innerHTML)};
    });
    assert(box, `${where}: ${what} drew nothing measurable`);
    assert.deepEqual(box.off, [], `${where}: ${what} puts labels off the stage`);
    assert.equal(box.hud, 0, `${where}: ${what} lays ${box.hud} corner(s) of its inset off the board`);
    if (!box.svg) {
      assert.equal(box.gl, 'composer', `${where}: ${what} shows neither the twin nor three.js`);
      return;
    }
    assert(box.n > 5, `${where}: ${what} drew almost nothing`);
    assert(!box.nan, `${where}: ${what} wrote a NaN into the SVG`);
    assert(box.x0 >= -3 && box.y0 >= -3 && box.x1 <= box.w + 3 && box.y1 <= box.h + 3,
      `${where}: ${what} draws outside its ${box.w}x${box.h} board ` +
      `(x ${box.x0.toFixed(0)}..${box.x1.toFixed(0)}, y ${box.y0.toFixed(0)}..${box.y1.toFixed(0)})`);
  };

  // A hash scrolls the section into view and the step machine follows the
  // scroll, so `data-scene` can read the destination a frame before the
  // rest of the dataset (the other keys are cleared, not stale). So: wait
  // for the scrolling to stop, then for the scene and a key only it
  // publishes, then for the picture to rest, and only then assert.
  const open = async (id) => {
    await page.evaluate((name) => { location.hash = '#' + name; }, id);
    await page.waitForFunction(() => new Promise(done => {
      const was = window.scrollY;
      setTimeout(() => done(window.scrollY === was), 250);
    }), null, {timeout: 15000});
    await page.waitForFunction(([name, k]) => {
      const ds = document.getElementById('stage').dataset;
      return ds.scene === name && ds[k] !== undefined;
    }, [id, OWN_KEY[id]], {timeout: 15000})
      .catch(() => assert.fail(`${where}: #${id} did not open with its own readout`));
    await settled();
    await fits(id);
    // The claim card and the readout are written with the data-*.
    const claim = await page.locator('#claim').textContent();
    assert(claim.trim().length > 0, `${where}: #${id} has an empty claim card`);
    assert(!/undefined|NaN|Infinity/.test(claim), `${where}: #${id} claim reads "${claim}"`);
    const readout = await page.locator(`#read-${id}`).innerText();
    assert(readout.trim().length > 0, `${where}: #read-${id} is empty`);
    assert(!/undefined|NaN|Infinity/.test(readout), `${where}: #read-${id} reads "${readout}"`);
    return {claim, readout};
  };

  // Every control that resizes the picture, at both ends of its travel (and
  // every option of a select), measured once the picture has come to rest.
  const corners = async (id) => {
    const specs = await page.evaluate((name) => {
      const out = [];
      for (const e of document.querySelectorAll(`[id^="c-${name}-"]`)) {
        if (e.tagName === 'SELECT') out.push({id: e.id, options: [...e.options].map(o => o.value)});
        else if (e.type === 'range') out.push({id: e.id, min: e.min, max: e.max});
      }
      return out;
    }, id);
    assert(specs.length > 0, `${where}: #${id} has no controls`);
    for (const s of specs) {
      const control = s.id.slice(`c-${id}-`.length);
      for (const end of (s.options || ['min', 'max'])) {
        // A range's own max can move with another control (the window's
        // `at` with its width), so the ends are read when they are used.
        const v = s.options ? end : await page.locator(`#${s.id}`).getAttribute(end);
        const got = await set(id, control, v);
        // The readout and data-* are written from the target, so the key
        // the control names reads its value while the picture still moves.
        if ((await data())[control] !== undefined || control !== 'mode') {
          await stageIs(control, got).catch(e => { if (control !== 'pos') throw e; });
        }
        await settled();
        await fits(`${id} with ${control} = ${got}`);
        const claim = await page.locator('#claim').textContent();
        assert(!/undefined|NaN|Infinity/.test(claim), `${where}: #${id} ${control}=${got} claim reads "${claim}"`);
      }
    }
  };

  // ---- bases: a base is a one-hot vector; a sequence is (L, 4).
  let d = await data();
  assert.equal(d.scene, 'bases', `${where}: the page opens on bases`);
  await page.waitForFunction(() => window.THREE_ADDONS !== undefined || window.THREE !== undefined,
    null, {timeout: 12000})
    .catch(() => assert.fail(`${where}: the vendored three.js modules never loaded for the genome stage`));
  await page.waitForFunction(() => ['composer', 'none'].includes(
    document.getElementById('stage').dataset.gl), null, {timeout: 10000});
  if ((await data()).gl === 'none') console.log(`  (${where}: no WebGL here, exercising the genome stage's twins)`);
  await open('bases');
  d = await data();
  assert.equal(d.pos, '0');
  assert.equal(d.base, 'A');
  assert.equal(d.row, '1,0,0,0');
  assert.equal(d.length, '180');
  assert.equal(d.ones, '180', `${where}: one 1 per base`);
  assert.equal(d.distance, '1.414', `${where}: every pair of one-hot bases is the square root of 2 apart`);
  await corners('bases');
  d = await data();
  assert.equal(d.ones, d.length, `${where}: a one-hot row has exactly one 1 per base`);

  // ---- window: a view, not a copy.
  await open('window');
  d = await data();
  assert.equal(d.width, '20');
  assert.equal(d.at, '40');
  assert.equal(d.count, '161');
  assert.equal(d.copied, '3220', `${where}: 161 windows of 20 bases, were they copies`);
  assert.equal(d.stored, '180', `${where}: the view stores the 180 bases once`);
  assert.equal(d.shape, '161,20,4');
  assert.equal(d.seen, '20', `${where}: one stored base is seen in 20 windows`);
  await set('window', 'width', 40);
  await stageIs('width', '40');
  d = await data();
  assert.equal(d.count, '141');
  assert.equal(d.copied, String(141 * 40));
  assert.equal(d.stored, '180');
  await set('window', 'width', 20);
  await stageIs('width', '20');
  await corners('window');

  // ---- transcribe: the enzyme reads the template, which is the anti-diagonal;
  // against the coding strand the same RNA is the identity.
  await open('transcribe');
  d = await data();
  assert.equal(d.mode, 'complement');
  assert.equal(d.upto, '18');
  assert.equal(d.template, 'TACAGTTAAATAGTTCTT');
  assert.equal(d.rna, 'AUGUCAAUUUAUCAAGAA', `${where}: the transcript reads like the coding strand, U for T`);
  assert.equal(d.moved, '18', `${where}: against the template every 1 changes column`);
  await set('transcribe', 'mode', 'relabel');
  await stageIs('mode', 'relabel');
  await stageIs('moved', '0');
  assert.equal((await data()).rna, 'AUGUCAAUUUAUCAAGAA', `${where}: the RNA is the same whichever strand it is read against`);
  await set('transcribe', 'mode', 'complement');
  await stageIs('moved', '18');
  // The player walks the enzyme: it publishes data-playing while it runs,
  // and every value it passes is one the readout was written from.
  await set('transcribe', 'upto', 0);
  await stageIs('upto', '0');
  assert.equal((await data()).rna, '', `${where}: nothing transcribed yet`);
  await page.evaluate(() => document.getElementById('c-transcribe-play').click());
  await page.waitForFunction(() => {
    const ds = document.getElementById('stage').dataset;
    return ds.playing === '0' && ds.upto === '18';
  }, null, {timeout: 20000}).catch(() => assert.fail(`${where}: the transcription never played through`));
  assert.equal((await data()).moved, '18');
  // The ribbon: a press on the gene moves the picture there, and says where.
  const ribbon = await page.locator('#ribbon-svg').boundingBox();
  await page.mouse.click(ribbon.x + ribbon.width * 0.5 + 1, ribbon.y + ribbon.height / 2);
  await stageIs('at', '90');
  assert.match(await page.locator('#ribbon-cap').innerText(), /91.108/, `${where}: the ribbon names the stretch`);
  await set('transcribe', 'at', 0);
  await stageIs('at', '0');
  await corners('transcribe');

  // ---- codons: a codon is rank one.
  await open('codons');
  d = await data();
  assert.equal(d.codon, 'ATG');
  assert.equal(d.aa, 'M');
  assert.equal(d.cell, '0,3,2');
  assert.equal(d.nonzeros, '1');
  assert.equal(d.synonyms, '1');
  assert.equal(d.shape, '4,4,4');
  assert.equal(d.boxes, '8', `${where}: 8 of the 16 first-two-base pairs fix the residue`);
  for (const n of [1, 17, 59, 0]) {
    await set('codons', 'n', n);
    await stageIs('n', n);
    d = await data();
    assert.equal(d.nonzeros, '1', `${where}: codon ${n} is one 1 in a 4 x 4 x 4 (rank one)`);
    assert.match(d.codon, /^[ACGT]{3}$/);
  }
  await corners('codons');
  assert.equal((await data()).nonzeros, '1');

  // ---- translate: the genetic code is a 4 x 4 x 4.
  await open('translate');
  d = await data();
  assert.equal(d.cells, '64');
  assert.equal(d.codon, 'AUG', `${where}: the ribosome reads mRNA, so the codon is spelled with U`);
  assert.equal(d.aa, 'M');
  assert.equal(d.third, 'same');
  assert.equal(d.silent, '1');
  assert.equal(d.wobble, '12', `${where}: 12 of the gene's 60 codons survive any swap of their third base`);
  // An edit: swap only the third base. AUG -> AUA is methionine to isoleucine.
  await set('translate', 'third', 'A');
  await stageIs('third', 'A');
  d = await data();
  assert.equal(d.editedcodon, 'AUA');
  assert.equal(d.edited, 'I');
  assert.equal(d.silent, '0', `${where}: methionine has one codon, so no swap of it is silent`);
  assert.equal(d.aa, 'M', `${where}: the gene's own residue does not follow the edit`);
  await set('translate', 'third', 'same');
  await stageIs('silent', '1');
  await corners('translate');

  // ---- protein: (P, 20) @ (20, 3).
  await open('protein');
  d = await data();
  assert.equal(d.upto, '60');
  assert.equal(d.pick, '0');
  assert.equal(d.hydropathy, '1.9');
  assert.equal(d.volume, '162.9');
  assert.equal(d.distinct, '18');
  assert.equal(d.shape, '60,3');
  assert.match(d.nearest, /^[A-Z]$/, `${where}: the nearest kind in property space`);
  await corners('protein');

  // ---- fold: (1300, 3), and the (60, 1300) grid of distances is one broadcast.
  await open('fold');
  d = await data();
  assert.equal(d.residues, '1300');
  assert.equal(d.shape, '60,1300');
  assert.equal(d.pick, '9');
  assert.equal(d.aa, 'K');
  assert.equal(d.cutoff, '8');
  assert.equal(d.near, '10', `${where}: ten residues within 8 angstroms of residue 10`);
  assert.equal(d.far, '1056');
  assert.equal(d.apart, '1046', `${where}: its farthest partner is 1,046 positions down the chain`);
  assert.equal(d.pairs, '556');
  assert.equal(d.rows, '40');
  assert.equal(d.bond, '3.85', `${where}: neighbouring alpha-carbons are 3.8 angstroms apart`);
  assert(await page.locator('#hud').isVisible(), `${where}: the grid of distances is not on the stage`);
  assert(await page.locator('#hud rect').count() > 500, `${where}: the grid of distances drew almost nothing`);
  // A tighter cutoff can only lose pairs, and the grid is redrawn with it.
  await set('fold', 'cutoff', 5);
  await stageIs('cutoff', '5');
  d = await data();
  assert(Number(d.pairs) < 556, `${where}: fewer pairs under 5 angstroms than under 8`);
  await set('fold', 'cutoff', 8);
  await stageIs('pairs', '556');
  await corners('fold');

  // ---- search: one einsum; each extra mismatch costs exactly one.
  await open('search');
  d = await data();
  assert.equal(d.at, '40');
  assert.equal(d.mismatch, '0');
  assert.equal(d.score, '20');
  assert.equal(d.perfect, '1', `${where}: the guide matches perfectly in exactly one place`);
  assert.equal(d.runnerup, '12');
  assert.equal(d.bestat, '40');
  assert.equal(d.windows, '161');
  assert.equal(d.mean, '6.2', `${where}: an average window agrees at about six places`);
  await set('search', 'mismatch', 3);
  await stageIs('mismatch', '3');
  await stageIs('score', '17');
  assert.equal((await data()).score, '17', `${where}: three mismatches cost three`);
  for (const m of [1, 2, 5, 0]) {
    await set('search', 'mismatch', m);
    await stageIs('mismatch', m);
    await stageIs('score', 20 - m);
  }
  await corners('search');

  // ---- batch: one more index in the same einsum.
  await open('batch');
  d = await data();
  assert.equal(d.guides, '3');
  assert.equal(d.mismatch, '2');
  assert.equal(d.windows, '161');
  assert.equal(d.scores, '483', `${where}: 3 guides x 161 windows`);
  assert.equal(d.exact, '20,18,16');
  assert.equal(d.shape, '3,161');
  await set('batch', 'guides', 6);
  await stageIs('guides', '6');
  assert.equal((await data()).scores, String(6 * 161));
  await set('batch', 'guides', 3);
  await stageIs('guides', '3');
  await corners('batch');

  // Every NumPy block, as the drive left it: every scene has been reached.
  for (const id of SCENES) {
    const text = await page.locator(`#np-${id}`).innerText();
    assert(text.trim().length > 0, `${where}: #np-${id} is empty`);
    assert(!/undefined|NaN/.test(text), `${where}: #np-${id} reads "${text}"`);
    assert(!/torch|tensorflow|jax|tensorly/i.test(text), `${where}: #np-${id} is not NumPy`);
    const widest = Math.max(...text.split('\n').map(l => l.length));
    assert(widest <= 82, `${where}: #np-${id} is ${widest} characters wide`);
  }

  // The rail names the eight pictures and goes to them. Fired from the page:
  // a pointer click scrolls the bar into view and the step machine follows
  // the scroll.
  assert.equal(await page.locator('#rail .stop').count(), SCENES.length, `${where}: one stop per picture on the rail`);
  await page.evaluate(() => document.querySelectorAll('#rail .stop')[2].click());
  await page.waitForFunction(() => new Promise(done => {
    const was = window.scrollY;
    setTimeout(() => done(window.scrollY === was), 250);
  }), null, {timeout: 15000});
  await page.waitForFunction(() => {
    const ds = document.getElementById('stage').dataset;
    return ds.scene === 'transcribe' && ds.rna !== undefined;
  }, null, {timeout: 15000}).catch(() => assert.fail(`${where}: the rail's third stop should open #transcribe`));
  assert.equal(await page.locator('#rail .stop[aria-current="step"]').count(), 1, `${where}: one stop is current`);
  // The question comes before the answer: in every step the predict-first
  // line is straight after the heading.
  const order = await page.evaluate(() => [...document.querySelectorAll('section.step')]
    .filter(sec => !(sec.querySelector('h2').nextElementSibling || {}).classList?.contains('predict'))
    .map(sec => sec.id));
  assert.deepEqual(order, [], `${where}: the predict-first line is not straight after the heading`);

  // A deep link opens straight on the named scene, by name.
  await page.goto(`${page.url().split('?')[0]}?lang=${lang}&fresh=1#search`);
  await page.waitForFunction(() => document.getElementById('stage').dataset.ready === '1',
    null, {timeout: 20000});
  await page.waitForFunction(() => {
    const ds = document.getElementById('stage').dataset;
    return ds.scene === 'search' && ds.runnerup !== undefined;
  }, null, {timeout: 15000}).catch(() => assert.fail(`${where}: a deep link to #search should open there`));
}

// Lose the GL module: the four three.js scenes must draw their twin, fitted
// inside its board, and still publish their numbers.
async function fallback(ctx, page, where, lang) {
  const {origin, prefix, audit} = ctx;
  await page.route('**/vendor/linalg-boot.js', route => route.abort());
  await page.emulateMedia({reducedMotion: 'reduce'});
  const measure = () => page.evaluate(() => {
    const svg = document.getElementById('draw');
    const vb = svg.viewBox.baseVal, inv = svg.getScreenCTM().inverse();
    let bad = 0, n = 0;
    for (const node of svg.querySelectorAll('*')) {
      if (typeof node.getBBox !== 'function' || !node.getScreenCTM()) continue;
      let b;
      try { b = node.getBBox(); } catch (e) { continue; }
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
  const TWIN_OWN = {bases: 'ones', codons: 'nonzeros', protein: 'distinct', fold: 'pairs', search: 'runnerup'};
  for (const scene of GL_SCENES) {
    await page.goto(`${origin}${prefix}interactive/genome-stage.html?lang=${lang}&fallback-check=1#${scene}`);
    await page.waitForFunction(() => document.getElementById('stage').dataset.ready === '1', null, {timeout: 20000});
    await page.waitForFunction(([id, k]) => {
      const ds = document.getElementById('stage').dataset;
      return ds.scene === id && ds[k] !== undefined && ds[k] !== '';
    }, [scene, TWIN_OWN[scene]], {timeout: 15000})
      .catch(() => assert.fail(`${where}: twin ${scene} never published its keys`));
    await page.waitForFunction(() => !document.getElementById('glnote').hidden, null, {timeout: 10000});
    assert.equal(await page.locator('#stage').getAttribute('data-gl'), 'none');
    assert(await page.locator('#draw').isVisible(), `${where}: twin ${scene} is not on the stage`);
    const d = await page.evaluate(() => ({...document.getElementById('stage').dataset}));
    assert(d[TWIN_KEY[scene]] !== undefined && d[TWIN_KEY[scene]] !== '',
      `${where}: twin ${scene} does not publish data-${TWIN_KEY[scene]}`);
    let m = await measure();
    assert(m.n > 10 && !m.nan && m.bad === 0, `${where}: twin ${scene} at home: ${JSON.stringify(m)}`);
    // The twin turns with the keys, as the three.js picture does, and
    // stays on its board at the far end of the turn.
    const cam = await page.locator('#stage').getAttribute('data-cam');
    await page.locator('#stage').focus();
    for (let n = 0; n < 10; n++) await page.keyboard.press('ArrowLeft');
    for (let n = 0; n < 6; n++) await page.keyboard.press('ArrowUp');
    await page.waitForFunction(was => document.getElementById('stage').dataset.cam !== was, cam, {timeout: 5000})
      .catch(() => assert.fail(`${where}: twin ${scene} did not turn`));
    await page.waitForFunction(() => document.getElementById('stage').dataset.easing === '0', null, {timeout: 15000});
    m = await measure();
    assert(m.bad === 0 && !m.nan, `${where}: twin ${scene} turned off its board: ${JSON.stringify(m)}`);
    // The controls that resize the picture, at both ends.
    const ranges = await page.evaluate((name) => [...document.querySelectorAll(`input[id^="c-${name}-"][type=range]`)]
      .map(e => ({id: e.id, min: e.min, max: e.max})), scene);
    for (const r of ranges) {
      for (const end of ['min', 'max']) {
        const v = await page.locator(`#${r.id}`).getAttribute(end);
        await page.locator(`#${r.id}`).fill(v);
        await page.waitForFunction(() => document.getElementById('stage').dataset.easing === '0', null, {timeout: 15000});
        m = await measure();
        assert(m.bad === 0 && !m.nan, `${where}: twin ${scene} with ${r.id} = ${v}: ${JSON.stringify(m)}`);
      }
    }
    const readout = await page.locator(`#read-${scene}`).innerText();
    assert(!/NaN|Infinity|undefined/.test(readout), `${where}: twin ${scene} readout: ${readout}`);
    await audit(`${where} twin ${scene}`);
  }
  await page.unroute('**/vendor/linalg-boot.js');
  await page.emulateMedia({reducedMotion: 'no-preference'});
}

// The hero gets the codon cube, flat and still. Nothing is fetched at all:
// the gene is a literal in genome-core.js.
async function embed(ctx, page, where) {
  await page.waitForFunction(() =>
    document.getElementById('stage').dataset.ready === '1', null, {timeout: 20000});
  assert.equal(await page.locator('#stage').getAttribute('data-scene'), 'codons',
    `${where} embed: the hero gets the codon cube`);
  assert(await page.locator('.steps').isHidden(), `${where} embed: the scroller is shown`);
  assert.equal(await page.evaluate(() => window.THREE), undefined,
    `${where} embed: three.js must not be fetched on the front door`);
  assert.equal(await page.locator('#stage').getAttribute('data-gl'), 'none');
  const cap = await page.locator('#embedcap').innerText();
  assert(cap.trim().length > 0, `${where} embed: the caption is empty`);
  assert.equal(await page.locator('#embedcap a').count(), 0, `${where} embed: link in the caption`);
  const fetched = await page.evaluate(() =>
    performance.getEntriesByType('resource')
      .map(e => e.name)
      .filter(n => !/\.(js|css|woff2)(\?|$)/.test(n)));
  assert.equal(fetched.length, 0,
    `${where} embed: fetched something that is not code or CSS: ${fetched.join(', ')}`);
  assert(await page.locator('#draw').isVisible(), `${where} embed: the codon cube did not draw`);
  assert(await page.locator('#draw *').count() > 20, `${where} embed: the codon cube drew almost nothing`);
}

module.exports = {en, es, drive, fallback, embed};
